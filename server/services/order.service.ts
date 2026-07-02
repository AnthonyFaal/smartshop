import { prisma } from "@/lib/db/prisma";
import { generateOrderNumber } from "@/lib/utils/format";
import { Errors } from "@/server/errors";
import { getPaymentProvider } from "@/lib/payments/provider";
import { createNotification } from "@/lib/notifications/service";
import { Prisma, type OrderStatus, type PaymentMethod } from "@prisma/client";

export async function createOrderFromCart(
  buyerId: string,
  input: {
    shippingAddress: {
      line1: string;
      line2?: string;
      city: string;
      region: string;
      postalCode?: string;
      country: string;
    };
    paymentMethod: PaymentMethod;
    notes?: string;
  }
) {
  const cart = await prisma.cart.findUnique({
    where: { userId: buyerId },
    include: {
      items: {
        include: {
          product: {
            include: { store: true },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw Errors.badRequest("Cart is empty");
  }

  const storeGroups = new Map<
    string,
    (typeof cart.items)[number][]
  >();

  for (const item of cart.items) {
    const storeId = item.product.storeId;
    const group = storeGroups.get(storeId) ?? [];
    group.push(item);
    storeGroups.set(storeId, group);
  }

  const orders = [];

  for (const [storeId, items] of storeGroups) {
    for (const item of items) {
      if (item.product.stock < item.quantity) {
        throw Errors.badRequest(
          `Insufficient stock for "${item.product.title}"`
        );
      }
      if (item.product.status !== "ACTIVE") {
        throw Errors.badRequest(
          `Product "${item.product.title}" is no longer available`
        );
      }
    }

    const subtotal = items.reduce(
      (sum, item) =>
        sum.add(
          new Prisma.Decimal(item.product.price.toString()).mul(item.quantity)
        ),
      new Prisma.Decimal(0)
    );

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          buyerId,
          sellerId: items[0].product.sellerId,
          storeId,
          subtotal,
          total: subtotal,
          shippingAddress: input.shippingAddress,
          notes: input.notes,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              title: item.product.title,
              price: item.product.price,
              quantity: item.quantity,
              total: new Prisma.Decimal(item.product.price.toString()).mul(
                item.quantity
              ),
            })),
          },
        },
        include: { items: true },
      });

      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            soldCount: { increment: item.quantity },
            ...(item.product.stock - item.quantity <= 0 && {
              status: "OUT_OF_STOCK",
            }),
          },
        });
      }

      const buyer = await tx.user.findUnique({
        where: { id: buyerId },
        select: { email: true, phone: true },
      });

      const paymentProvider = getPaymentProvider();
      const paymentResult = await paymentProvider.initiate({
        orderId: created.id,
        amount: Number(subtotal),
        currency: "GHS",
        method: input.paymentMethod,
        customerEmail: buyer?.email ?? "",
        customerPhone: buyer?.phone ?? undefined,
      });

      await tx.payment.create({
        data: {
          orderId: created.id,
          userId: buyerId,
          amount: subtotal,
          method: input.paymentMethod,
          status: paymentResult.status,
          providerRef: paymentResult.providerRef,
          providerData:
            paymentResult.providerData as Prisma.InputJsonValue | undefined,

          ...(paymentResult.status === "COMPLETED" && {
            paidAt: new Date(),
            // Escrow: mark funds as held once payment is captured.
            escrowHeldAt: new Date(),
          }),
        },
      });

      if (paymentResult.status === "COMPLETED") {
        await tx.order.update({
          where: { id: created.id },
          data: { status: "CONFIRMED" },
        });
      }

      return created;
    });

    orders.push(order);

    await createNotification({
      userId: order.sellerId,
      type: "ORDER",
      title: "New Order Received",
      body: `Order ${order.orderNumber} has been placed.`,
      data: { orderId: order.id },
      channels: ["IN_APP", "EMAIL"],
    });
  }

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  await createNotification({
    userId: buyerId,
    type: "ORDER",
    title: "Order Placed",
    body: `Your order has been placed successfully.`,
    data: { orderIds: orders.map((o) => o.id) },
  });

  return orders;
}

export async function updateOrderStatus(
  actorId: string,
  orderId: string,
  status: OrderStatus,
  isAdmin = false
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });
  if (!order) throw Errors.notFound("Order");

  if (!isAdmin && order.sellerId !== actorId) {
    throw Errors.forbidden();
  }

  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PROCESSING", "CANCELLED"],
    PROCESSING: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: ["COMPLETED"],
    COMPLETED: [],
    CANCELLED: [],
    REFUNDED: [],
  };

  if (!validTransitions[order.status]?.includes(status)) {
    throw Errors.badRequest(
      `Cannot transition from ${order.status} to ${status}`
    );
  }

  // If we're completing the order, release escrow for all payments of this order.
  const updated = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === "COMPLETED" && { completedAt: new Date() }),
        ...(status === "CANCELLED" && {
          cancelledAt: new Date(),
        }),
      },
    });

    if (status === "COMPLETED") {
      await tx.payment.updateMany({
        where: {
          orderId,
        },
        data: {
          refundedAt: new Date(),
        },
      });
    }

    return o;
  });

  await createNotification({
    userId: order.buyerId,
    type: "ORDER",
    title: "Order Updated",
    body: `Your order ${order.orderNumber} is now ${status.toLowerCase()}.`,
    data: { orderId },
  });

  return updated;
}

export async function listOrders(
  userId: string,
  role: "buyer" | "seller",
  input: { cursor?: string; limit?: number; status?: OrderStatus }
) {
  const limit = Math.min(input.limit ?? 20, 50);
  const where =
    role === "buyer"
      ? { buyerId: userId, ...(input.status && { status: input.status }) }
      : { sellerId: userId, ...(input.status && { status: input.status }) };

  const orders = await prisma.order.findMany({
    where,
    take: limit + 1,
    ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      store: { select: { name: true, slug: true } },
      payments: { select: { status: true, method: true } },
    },
  });

  let nextCursor: string | undefined;
  if (orders.length > limit) {
    const next = orders.pop();
    nextCursor = next?.id;
  }

  return { orders, nextCursor };
}

export async function listSellerCustomers(sellerId: string) {
  const orders = await prisma.order.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      buyerId: true,
      total: true,
      status: true,
      createdAt: true,
      buyer: {
        select: {
          id: true,
          email: true,
          phone: true,
          profile: {
            select: {
              displayName: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  const customers = new Map<
    string,
    {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      orderCount: number;
      totalSpent: number;
      lastOrderAt: Date;
      activeOrders: number;
    }
  >();

  for (const order of orders) {
    const profile = order.buyer.profile;
    const name =
      profile?.displayName ||
      [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
      order.buyer.email;
    const existing = customers.get(order.buyerId);
    const total = Number(order.total);
    const isActive = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED"].includes(
      order.status
    );

    if (existing) {
      existing.orderCount += 1;
      existing.totalSpent += total;
      existing.activeOrders += isActive ? 1 : 0;
      if (order.createdAt > existing.lastOrderAt) {
        existing.lastOrderAt = order.createdAt;
      }
    } else {
      customers.set(order.buyerId, {
        id: order.buyer.id,
        name,
        email: order.buyer.email,
        phone: order.buyer.phone,
        orderCount: 1,
        totalSpent: total,
        lastOrderAt: order.createdAt,
        activeOrders: isActive ? 1 : 0,
      });
    }
  }

  return Array.from(customers.values()).sort(
    (a, b) => b.lastOrderAt.getTime() - a.lastOrderAt.getTime()
  );
}
