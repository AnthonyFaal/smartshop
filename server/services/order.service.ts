import { prisma } from "@/lib/db/prisma";
import { generateOrderNumber } from "@/lib/utils/format";
import { Errors } from "@/server/errors";
import { getPaymentProvider } from "@/lib/payments/provider";
import { createNotification } from "@/lib/notifications/service";
import { Prisma, type OrderStatus, type PaymentMethod } from "@prisma/client";

type InventoryItem = {
  productId: string;
  quantity: number;
  selectedSize: string;
  product?: {
    title: string;
    stock: number;
    status: string;
    variants: Array<{ size: string; quantity: number }>;
  };
};

export async function previewPromotionFromCart(buyerId: string, promoCode: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId: buyerId },
    include: { items: { include: { product: { select: { id: true, storeId: true, price: true } } } } },
  });
  if (!cart?.items.length) return { valid: false, reason: "Add an item before applying a discount code." };
  const storeId = cart.items[0].product.storeId;
  if (cart.items.some((item) => item.product.storeId !== storeId)) {
    return { valid: false, reason: "Discount codes can be applied to one store at a time." };
  }

  const subtotal = cart.items.reduce((sum, item) => sum.add(new Prisma.Decimal(item.product.price).mul(item.quantity)), new Prisma.Decimal(0));
  const promotion = await prisma.promotion.findFirst({
    where: { storeId, code: promoCode.trim().toUpperCase(), isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
    include: { products: { select: { productId: true } } },
  });
  const targetedIds = new Set(promotion?.products.map((target) => target.productId) ?? []);
  if (!promotion || !cart.items.every((item) => targetedIds.has(item.productId)) || subtotal.lessThan(promotion.minSubtotal) || (promotion.usageLimit !== null && promotion.usageCount >= promotion.usageLimit)) {
    return { valid: false, reason: "This code is invalid, expired, or does not apply to every item in this order." };
  }
  const rawDiscount = promotion.type === "PERCENTAGE"
    ? subtotal.mul(new Prisma.Decimal(promotion.value).div(100))
    : new Prisma.Decimal(promotion.value);
  const discount = promotion.maxDiscount && rawDiscount.greaterThan(promotion.maxDiscount) ? new Prisma.Decimal(promotion.maxDiscount) : rawDiscount;
  const discountedSubtotal = subtotal.sub(discount).lessThan(0) ? new Prisma.Decimal(0) : subtotal.sub(discount);
  const fee = discountedSubtotal.mul(new Prisma.Decimal(Number(process.env.ORDER_FEE_PERCENT ?? 0.025)));
  return { valid: true, code: promotion.code, subtotal: Number(subtotal), discount: Number(discount), fee: Number(fee), total: Number(discountedSubtotal.add(fee)) };
}

async function refreshProductInventoryStatus(
  tx: Prisma.TransactionClient,
  productId: string
) {
  const [product, variantStock] = await Promise.all([
    tx.product.findUnique({ where: { id: productId }, select: { stock: true } }),
    tx.productVariant.aggregate({ where: { productId }, _sum: { quantity: true } }),
  ]);
  const effectiveStock = variantStock._sum.quantity ?? product?.stock ?? 0;
  await tx.product.update({
    where: { id: productId },
    data: { status: effectiveStock > 0 ? "ACTIVE" : "OUT_OF_STOCK" },
  });
}

async function reserveInventory(tx: Prisma.TransactionClient, item: InventoryItem) {
  if (item.selectedSize) {
    const updated = await tx.productVariant.updateMany({
      where: { productId: item.productId, size: item.selectedSize, quantity: { gte: item.quantity } },
      data: { quantity: { decrement: item.quantity } },
    });
    if (updated.count !== 1) throw Errors.badRequest(`Insufficient stock for "${item.product?.title ?? "product"}" (${item.selectedSize})`);
    await refreshProductInventoryStatus(tx, item.productId);
    return;
  }

  const updated = await tx.product.updateMany({
    where: { id: item.productId, stock: { gte: item.quantity } },
    data: { stock: { decrement: item.quantity } },
  });
  if (updated.count !== 1) throw Errors.badRequest(`Insufficient stock for "${item.product?.title ?? "product"}"`);
  await refreshProductInventoryStatus(tx, item.productId);
}

async function releaseInventory(tx: Prisma.TransactionClient, item: InventoryItem) {
  if (item.selectedSize) {
    await tx.productVariant.update({
      where: { productId_size: { productId: item.productId, size: item.selectedSize } },
      data: { quantity: { increment: item.quantity } },
    });
  } else {
    await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
  }
  await refreshProductInventoryStatus(tx, item.productId);
}

async function finalizeOrderInTransaction(
  tx: Prisma.TransactionClient,
  orderId: string,
  items: InventoryItem[],
  promotionId?: string | null
) {
  for (const item of items) {
    await tx.product.update({ where: { id: item.productId }, data: { soldCount: { increment: item.quantity } } });
  }
  void promotionId;
  await tx.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "CONFIRMED" } });
}

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
    paymentPhone: string;
    cardholderName?: string;
    promoCode?: string;
    notes?: string;
  }
): Promise<{
  orders: {
    id: string;
    orderNumber: string;
    sellerId: string;
  }[];
  paystackRedirectUrl?: string;
  paystackAccessCode?: string;
  paystackReference?: string;
}> {
  await releaseExpiredPendingPayments();
  const cart = await prisma.cart.findUnique({
    where: { userId: buyerId },
    include: {
      items: {
        include: {
          product: {
            include: { store: true, variants: true },
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
  let paystackAccessCode: string | undefined;
  let paystackReference: string | undefined;
  let hasPendingPayment = false;

  if (["MOBILE_MONEY", "CARD"].includes(input.paymentMethod) && storeGroups.size > 1) {
    throw Errors.badRequest("Inline Paystack checkout currently supports one store per payment. Please checkout each store separately.");
  }

  for (const items of storeGroups.values()) {
    for (const item of items) {
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

    const promotion = input.promoCode
      ? await prisma.promotion.findFirst({
          where: {
            storeId: items[0].product.storeId,
            code: input.promoCode.toUpperCase(),
            isActive: true,
            startsAt: { lte: new Date() },
            endsAt: { gte: new Date() },
            products: { some: { productId: { in: items.map((item) => item.productId) } } },
          },
          include: { products: { select: { productId: true } } },
        })
      : null;
    const targetedProductIds = new Set(promotion?.products.map((target) => target.productId) ?? []);
    const allItemsTargeted = promotion ? items.every((item) => targetedProductIds.has(item.productId)) : false;
    if (input.promoCode && (!promotion || !allItemsTargeted || subtotal.lessThan(promotion.minSubtotal) || (promotion.usageLimit !== null && promotion.usageCount >= promotion.usageLimit))) {
      throw Errors.badRequest("This discount code is invalid, expired, or not applicable.");
    }
    const rawDiscount = promotion
      ? promotion.type === "PERCENTAGE" ? subtotal.mul(new Prisma.Decimal(Number(promotion.value)).div(100)) : new Prisma.Decimal(promotion.value)
      : new Prisma.Decimal(0);
    const discount = promotion?.maxDiscount && rawDiscount.greaterThan(new Prisma.Decimal(promotion.maxDiscount)) ? new Prisma.Decimal(promotion.maxDiscount) : rawDiscount;
    const discountedSubtotal = subtotal.sub(discount).lessThan(0) ? new Prisma.Decimal(0) : subtotal.sub(discount);

    // toll fee applied on subtotal
    const fee = discountedSubtotal.mul(new Prisma.Decimal(feePercent));
    const total = discountedSubtotal.add(fee);

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          buyerId,
          sellerId: items[0].product.sellerId,
          storeId: items[0].product.storeId,
          subtotal,
          promotionId: promotion?.id,
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
        await reserveInventory(tx, item);
      }

      if (promotion) {
        const usage = await tx.promotion.updateMany({
          where: {
            id: promotion.id,
            ...(promotion.usageLimit === null ? {} : { usageCount: { lt: promotion.usageLimit } }),
          },
          data: { usageCount: { increment: 1 } },
        });
        if (usage.count !== 1) throw Errors.badRequest("This discount code has reached its usage limit.");
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
            customerPhone: input.paymentPhone || buyer?.phone || undefined,
            metadata: {
              feePercent: String(feePercent),
              fee: String(fee),
              paymentPhone: input.paymentPhone,
              ...(input.cardholderName ? { cardholderName: input.cardholderName } : {}),
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
        await finalizeOrderInTransaction(tx, order.id, items, promotion?.id);
      }

      return { order, paymentResult };
    });

    orders.push({
      id: created.order.id,
      orderNumber: created.order.orderNumber,
      sellerId: created.order.sellerId,
    });

    hasPendingPayment ||= created.paymentResult?.status === "PENDING";

    if (!paystackRedirectUrl && created.paymentResult?.redirectUrl) {
      paystackRedirectUrl = created.paymentResult.redirectUrl;
    }
    if (!paystackAccessCode && created.paymentResult?.accessCode) {
      paystackAccessCode = created.paymentResult.accessCode;
      paystackReference = created.paymentResult.providerRef;
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

  if (!hasPendingPayment) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  await createNotification({
    userId: buyerId,
    type: "ORDER",
    title: "Order Placed",
    body: `Your order has been placed successfully.`,
    data: { orderIds: orders.map((o) => o.id) },
  });

  return { orders, paystackRedirectUrl, paystackAccessCode, paystackReference };
}

async function releaseExpiredPendingPayments() {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const expired = await prisma.payment.findMany({
    where: { status: "PENDING", createdAt: { lt: cutoff }, order: { status: "PENDING" } },
    select: { providerRef: true },
    take: 50,
  });
  for (const payment of expired) {
    if (payment.providerRef) await settlePayment(payment.providerRef, false, undefined, "Payment session expired");
  }
}

export async function updateOrderStatus(
  actorId: string,
  orderId: string,
  status: OrderStatus,
  isAdmin = false
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      payments: { select: { id: true, status: true } },
    },
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

    if (status === "CANCELLED" && order.status === "PENDING") {
      for (const item of order.items) {
        await releaseInventory(tx, {
          productId: item.productId,
          quantity: item.quantity,
          selectedSize: item.selectedSize ?? "",
        });
      }

      const pendingPayment = order.payments.find((payment) => payment.status === "PENDING");
      if (pendingPayment) {
        await tx.payment.update({
          where: { id: pendingPayment.id },
          data: { status: "FAILED", failureReason: "Order cancelled" },
        });
      }

      const cancelledOrder = await tx.order.findUnique({
        where: { id: orderId },
        select: { promotionId: true },
      });
      if (cancelledOrder?.promotionId) {
        await tx.promotion.updateMany({
          where: { id: cancelledOrder.promotionId, usageCount: { gt: 0 } },
          data: { usageCount: { decrement: 1 } },
        });
      }
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

export async function verifyPaystackPayment(userId: string, reference: string) {
  const payment = await prisma.payment.findFirst({
    where: { providerRef: reference, userId },
    include: { order: { include: { items: true } } },
  });
  if (!payment) throw Errors.notFound("Payment");
  if (payment.status === "COMPLETED") return { success: true, orderId: payment.orderId };

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw Errors.badRequest("Paystack is not configured");
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const body = (await response.json()) as { status?: boolean; data?: { status?: string; amount?: number; currency?: string } };
  const data = body.data;
  if (!data) throw Errors.badRequest("Paystack payment could not be verified");
  const amountMatches = Math.round((data?.amount ?? 0)) === Math.round(Number(payment.amount) * 100);
  if (!response.ok || !body.status || !amountMatches || data.currency !== payment.currency) {
    throw Errors.badRequest("Paystack payment could not be verified");
  }
  if (data.status !== "success") {
    const pending = ["pending", "ongoing", "processing"].includes(data.status ?? "");
    return { success: false, status: pending ? "PENDING" as const : "FAILED" as const, orderId: payment.orderId };
  }

  await settlePayment(reference, true, body);
  return { success: true, status: "COMPLETED" as const, orderId: payment.orderId };
}

export async function settlePayment(
  reference: string,
  successful: boolean,
  providerData?: Prisma.InputJsonValue,
  failureReason?: string
) {
  const payment = await prisma.payment.findFirst({
    where: { providerRef: reference },
    include: { order: { include: { items: true } } },
  });
  if (!payment || payment.status !== "PENDING") return;

  await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: successful
        ? { status: "COMPLETED", paidAt: new Date(), providerData }
        : { status: "FAILED", providerData, failureReason: failureReason ?? "Payment failed" },
    });
    if (updated.count !== 1) return;

    const items = payment.order.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      selectedSize: item.selectedSize ?? "",
      product: { title: item.title, stock: 0, status: "ACTIVE", variants: [] },
    }));
    if (successful) {
      await finalizeOrderInTransaction(tx, payment.orderId, items, payment.order.promotionId);
    } else {
      for (const item of items) await releaseInventory(tx, item);
      if (payment.order.promotionId) {
        await tx.promotion.updateMany({ where: { id: payment.order.promotionId, usageCount: { gt: 0 } }, data: { usageCount: { decrement: 1 } } });
      }
      await tx.order.updateMany({ where: { id: payment.orderId, status: "PENDING" }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: failureReason ?? "Payment failed" } });
    }
  });
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
