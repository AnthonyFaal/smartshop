import { prisma } from "@/lib/db/prisma";
import { Errors } from "@/server/errors";
import { getPlanLimits } from "@/lib/config/subscriptions";
import { SubscriptionPlan } from "@prisma/client";

function assertDates(startsAt: Date, endsAt: Date) {
  if (endsAt <= startsAt) throw Errors.badRequest("Promotion end date must be after its start date");
}

export async function createPromotion(sellerId: string, input: {
  storeId: string; name: string; code: string; type: "PERCENTAGE" | "FIXED";
  value: number; minSubtotal?: number; maxDiscount?: number; startsAt: Date; endsAt: Date;
  usageLimit?: number; productIds: string[];
}) {
  const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { subscription: { select: { plan: true, status: true } } } });
  const plan = seller?.subscription?.plan ?? SubscriptionPlan.FREE;
  if (!getPlanLimits(plan).promotions || seller?.subscription?.status !== "ACTIVE") throw Errors.forbidden("Upgrade to a plan with promotions to create campaigns");
  assertDates(input.startsAt, input.endsAt);
  const store = await prisma.store.findFirst({ where: { id: input.storeId, ownerId: sellerId, deletedAt: null } });
  if (!store) throw Errors.notFound("Store");
  if (input.type === "PERCENTAGE" && input.value > 100) throw Errors.badRequest("Percentage discount cannot exceed 100%");
  const products = await prisma.product.findMany({ where: { id: { in: input.productIds }, storeId: input.storeId, deletedAt: null }, select: { id: true } });
  if (products.length !== input.productIds.length) throw Errors.badRequest("All targeted products must belong to this store");
  return prisma.promotion.create({ data: {
    sellerId, storeId: input.storeId, name: input.name, code: input.code.trim().toUpperCase(), type: input.type,
    value: input.value, minSubtotal: input.minSubtotal ?? 0, maxDiscount: input.maxDiscount,
    startsAt: input.startsAt, endsAt: input.endsAt, usageLimit: input.usageLimit,
    products: { create: input.productIds.map((productId) => ({ productId })) },
  }, include: {
    products: { include: { product: { select: { id: true, title: true } } } },
  } });
}

export async function listPromotions(sellerId: string, storeId?: string) {
  return prisma.promotion.findMany({ where: { sellerId, ...(storeId ? { storeId } : {}) }, orderBy: { startsAt: "desc" }, include: { products: { include: { product: { select: { id: true, title: true } } } }, _count: { select: { orders: true } } } });
}

export async function updatePromotion(sellerId: string, input: {
  id: string; name?: string; code?: string; type?: "PERCENTAGE" | "FIXED"; value?: number;
  minSubtotal?: number; maxDiscount?: number | null; startsAt?: Date; endsAt?: Date;
  usageLimit?: number | null; productIds?: string[];
}) {
  const current = await prisma.promotion.findFirst({ where: { id: input.id, sellerId } });
  if (!current) throw Errors.notFound("Promotion");
  const startsAt = input.startsAt ?? current.startsAt;
  const endsAt = input.endsAt ?? current.endsAt;
  assertDates(startsAt, endsAt);
  const type = input.type ?? current.type;
  const value = input.value ?? Number(current.value);
  if (type === "PERCENTAGE" && value > 100) throw Errors.badRequest("Percentage discount cannot exceed 100%");
  if (input.productIds) {
    const products = await prisma.product.findMany({ where: { id: { in: input.productIds }, storeId: current.storeId, deletedAt: null }, select: { id: true } });
    if (products.length !== input.productIds.length) throw Errors.badRequest("All targeted products must belong to this store");
  }
  return prisma.$transaction(async (tx) => {
    const promotion = await tx.promotion.update({ where: { id: input.id }, data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
      type, value, minSubtotal: input.minSubtotal ?? current.minSubtotal, maxDiscount: input.maxDiscount === undefined ? current.maxDiscount : input.maxDiscount,
      startsAt, endsAt, usageLimit: input.usageLimit === undefined ? current.usageLimit : input.usageLimit,
    } });
    if (input.productIds) {
      await tx.promotionProduct.deleteMany({ where: { promotionId: input.id } });
      await tx.promotionProduct.createMany({ data: input.productIds.map((productId) => ({ promotionId: input.id, productId })) });
    }
    return promotion;
  });
}

export async function deactivatePromotion(sellerId: string, id: string) {
  const result = await prisma.promotion.updateMany({ where: { id, sellerId }, data: { isActive: false } });
  if (result.count !== 1) throw Errors.notFound("Promotion");
  return { success: true };
}

export async function promotionAnalytics(sellerId: string, promotionId: string) {
  const promotion = await prisma.promotion.findFirst({ where: { id: promotionId, sellerId }, include: { orders: { select: { subtotal: true, total: true, tax: true, createdAt: true, status: true } } } });
  if (!promotion) throw Errors.notFound("Promotion");
  const validOrders = promotion.orders.filter((order) => !["CANCELLED", "REFUNDED"].includes(order.status));
  const revenue = validOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const discountValue = validOrders.reduce((sum, order) => sum + Number(order.subtotal) - (Number(order.total) - Number(order.tax ?? 0)), 0);
  return { id: promotion.id, name: promotion.name, code: promotion.code, usageCount: promotion.usageCount, orders: validOrders.length, revenue, discountValue };
}
