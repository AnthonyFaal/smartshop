import { prisma } from "@/lib/db/prisma";
import { Errors } from "@/server/errors";
import { createNotification } from "@/lib/notifications/service";

const DISPUTE_HOLD_DAYS = 7;

export async function createSettlementForDeliveredOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, sellerId: true, sellerPayout: true, currency: true, status: true, orderNumber: true },
  });
  if (!order || !["DELIVERED", "COMPLETED"].includes(order.status)) return null;

  const availableAt = new Date(Date.now() + DISPUTE_HOLD_DAYS * 24 * 60 * 60 * 1000);
  return prisma.sellerSettlement.upsert({
    where: { orderId },
    create: { orderId, sellerId: order.sellerId, amount: order.sellerPayout, currency: order.currency, availableAt },
    update: {},
  });
}

/** Release only settled orders that have cleared the buyer-protection window. */
export async function refreshAvailableSettlements() {
  const now = new Date();
  return prisma.sellerSettlement.updateMany({
    where: {
      status: "HELD",
      availableAt: { lte: now },
      order: { disputes: { none: { status: { in: ["OPEN", "UNDER_REVIEW"] } } } },
    },
    data: { status: "AVAILABLE" },
  });
}

export async function listSellerSettlements(sellerId: string) {
  await refreshAvailableSettlements();
  const [settlements, totals] = await Promise.all([
    prisma.sellerSettlement.findMany({
      where: { sellerId }, orderBy: { createdAt: "desc" },
      include: { order: { select: { orderNumber: true, status: true, completedAt: true } } },
    }),
    prisma.sellerSettlement.groupBy({ where: { sellerId }, by: ["status"], _sum: { amount: true } }),
  ]);
  const balanceByStatus = Object.fromEntries(totals.map((row) => [row.status, Number(row._sum.amount ?? 0)]));
  return { settlements, balanceByStatus };
}

export async function listOperationsSettlements() {
  await refreshAvailableSettlements();
  return prisma.sellerSettlement.findMany({
    where: { status: { in: ["AVAILABLE", "BLOCKED"] } }, orderBy: { availableAt: "asc" },
    include: {
      seller: { select: { id: true, email: true, phone: true, profile: { select: { displayName: true, firstName: true, lastName: true } } } },
      order: { select: { orderNumber: true, status: true } },
    },
  });
}

export async function markSettlementPaid(adminId: string, settlementId: string, providerRef: string, note?: string) {
  const settlement = await prisma.sellerSettlement.findUnique({ where: { id: settlementId } });
  if (!settlement) throw Errors.notFound("Settlement");
  if (settlement.status !== "AVAILABLE") throw Errors.badRequest("Only available settlements can be marked paid.");

  const updated = await prisma.sellerSettlement.update({
    where: { id: settlementId },
    data: { status: "PAID", paidAt: new Date(), paidBy: adminId, providerRef, note: note ?? null },
  });
  await createNotification({
    userId: settlement.sellerId, type: "PAYMENT", title: "Seller settlement sent",
    body: `GHS ${Number(settlement.amount).toFixed(2)} for order settlement has been recorded as paid.`,
    data: { settlementId, providerRef }, channels: ["IN_APP", "EMAIL"],
  });
  return updated;
}

export async function blockSettlement(adminId: string, settlementId: string, note: string) {
  const settlement = await prisma.sellerSettlement.findUnique({ where: { id: settlementId } });
  if (!settlement) throw Errors.notFound("Settlement");
  if (!["HELD", "AVAILABLE"].includes(settlement.status)) throw Errors.badRequest("This settlement cannot be blocked.");
  return prisma.sellerSettlement.update({ where: { id: settlementId }, data: { status: "BLOCKED", note: `${note} (operator: ${adminId})` } });
}
