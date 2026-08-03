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
    fulfillmentLocationId?: string;
    paymentMethod: PaymentMethod;
    notes?: string;
  }
): Promise<{
  orders: {
    id: string;
    orderNumber: string;
    sellerId: string;
  }[];
  paystackRedirectUrl?: string;
}> {
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

  const storeGroups = new Map<string, (typeof cart.items)[number][]>();
  for (const item of cart.items) {
    const storeId = item.product.storeId;
    const group = storeGroups.get(storeId) ?? [];
    group.push(item);
    storeGroups.set(storeId, group);
  }

  // Small marketplace/toll fee on subtotal (reasonable default 2.5%)
  const feePercent = Number(process.env.ORDER_FEE_PERCENT ?? 0.025);

  // optional fulfillment location used for delivery/pickup
  const fulfillmentLocation = input.fulfillmentLocationId
    ? await prisma.location.findUnique({
        where: { id: input.fulfillmentLocationId },
        select: { id: true, name: true, type: true, slug: true },
      })
    : null;

  if (input.fulfillmentLocationId && !fulfillmentLocation) {
    throw Errors.badRequest("Invalid fulfillment location");
  }

  const shippingAddressWithFulfillment = {
    ...input.shippingAddress,
    fulfillmentLocationId: fulfillmentLocation?.id ?? null,
    fulfillmentLocationName: fulfillmentLocation?.name ?? null,
    fulfillmentLocationType: fulfillmentLocation?.type ?? null,
    fulfillmentLocationSlug: fulfillmentLocation?.slug ?? null,
  };

  const orders: {
    id: string;
    orderNumber: string;
    sellerId: string;
  }[] = [];

  let paystackRedirectUrl: string | undefined;

  for (const items of storeGroups.values()) {
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

    // toll fee applied on subtotal
    const fee = subtotal.mul(new Prisma.Decimal(feePercent));
    const total = subtotal.add(fee);

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          buyerId,
          sellerId: items[0].product.sellerId,
          storeId: items[0].product.storeId,
          subtotal,
          tax: fee,
          total,
          shippingAddress: shippingAddressWithFulfillment,
          notes: input.notes,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              title: item.product.title,
              price: item.product.price,
              quantity: item.quantity,
              selectedSize: item.selectedSize || null,
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

      const isPaystackPayment = ["MOBILE_MONEY", "CARD"].includes(
        input.paymentMethod
      );

      const paymentProvider = getPaymentProvider();
      const paymentResult = isPaystackPayment
        ? await paymentProvider.initiate({
            orderId: order.id,
            amount: Number(total),
            currency: "GHS",
            method: input.paymentMethod,
            customerEmail: buyer?.email ?? "",
            customerPhone: buyer?.phone ?? undefined,
            metadata: {
              feePercent: String(feePercent),
              fee: String(fee),
            },
          })
        : null;

      await tx.payment.create({
        data: {
          orderId: order.id,
          userId: buyerId,
          amount: total,
          method: input.paymentMethod,
          status: paymentResult?.status ?? "PENDING",
          providerRef: paymentResult?.providerRef ?? undefined,
          providerData: paymentResult?.providerData as
            | Prisma.InputJsonValue
            | undefined,
          ...(paymentResult?.status === "COMPLETED" && {
            paidAt: new Date(),
            escrowHeldAt: new Date(),
          }),
        },
      });

      if (paymentResult?.status === "COMPLETED") {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "CONFIRMED" },
        });
      }

      return { order, paymentResult };
    });

    orders.push({
      id: created.order.id,
      orderNumber: created.order.orderNumber,
      sellerId: created.order.sellerId,
    });

    if (!paystackRedirectUrl && created.paymentResult?.redirectUrl) {
      paystackRedirectUrl = created.paymentResult.redirectUrl;
    }

    await createNotification({
      userId: created.order.sellerId,
      type: "ORDER",
      title: "New Order Received",
      body: `Order ${created.order.orderNumber} has been placed.`,
      data: { orderId: created.order.id },
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

  return { orders, paystackRedirectUrl };
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
