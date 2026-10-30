import { prisma } from "@/lib/db/prisma";
import { createNotification } from "@/lib/notifications/service";
import { Errors } from "@/server/errors";

const DISPUTE_WINDOW_DAYS = 7;

export async function openDispute(input: { buyerId: string; orderId: string; reason: string }) {
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, buyerId: input.buyerId },
    select: { id: true, sellerId: true, orderNumber: true, status: true, completedAt: true, updatedAt: true },
  });
  if (!order) throw Errors.notFound("Order");
  if (!["DELIVERED", "COMPLETED"].includes(order.status)) {
    throw Errors.badRequest("You can report an issue after the order has been delivered.");
  }
  const deliveredAt = order.completedAt ?? order.updatedAt;
  if (deliveredAt.getTime() < Date.now() - DISPUTE_WINDOW_DAYS * 86_400_000) {
    throw Errors.badRequest("The 7-day buyer-protection window for this order has ended.");
  }
  const buyer = await prisma.user.findUnique({ where: { id: input.buyerId }, select: { phoneVerified: true } });
  if (!buyer?.phoneVerified) throw Errors.forbidden("Verify your phone number before opening a dispute.");

  const dispute = await prisma.$transaction(async (tx) => {
    const existing = await tx.dispute.findFirst({
      where: { orderId: order.id, status: { in: ["OPEN", "UNDER_REVIEW"] } },
      select: { id: true },
    });
    if (existing) throw Errors.conflict("There is already an open issue for this order.");
    const created = await tx.dispute.create({
      data: { orderId: order.id, openedById: input.buyerId, againstId: order.sellerId, reason: input.reason },
    });
    // Prevent automatic payout while an operator investigates. This is a
    // ledger hold, not an escrow or a promise of a refund.
    await tx.sellerSettlement.updateMany({
      where: { orderId: order.id, status: { in: ["HELD", "AVAILABLE"] } },
      data: { status: "BLOCKED", note: "Blocked while buyer dispute is under review." },
    });
    return created;
  });

  await createNotification({
    userId: order.sellerId, type: "DISPUTE", title: "Buyer reported an issue",
    body: `Order ${order.orderNumber} is under review. Do not arrange an off-platform refund.`,
    data: { orderId: order.id, disputeId: dispute.id }, channels: ["IN_APP", "EMAIL"],
  });
  return dispute;
}

export async function listBuyerDisputes(buyerId: string) {
  return prisma.dispute.findMany({
    where: { openedById: buyerId }, orderBy: { createdAt: "desc" },
    include: { order: { select: { orderNumber: true, status: true } } },
  });
}

export async function resolveDispute(input: {
  adminId: string; disputeId: string; outcome: "RESOLVED_BUYER" | "RESOLVED_SELLER" | "CLOSED"; resolution: string;
}) {
  const dispute = await prisma.dispute.findUnique({ where: { id: input.disputeId } });
  if (!dispute) throw Errors.notFound("Dispute");
  if (!["OPEN", "UNDER_REVIEW"].includes(dispute.status)) throw Errors.badRequest("This dispute is already closed.");
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.dispute.update({
      where: { id: input.disputeId },
      data: { status: input.outcome, resolution: input.resolution, resolvedBy: input.adminId, resolvedAt: new Date() },
    });
    if (input.outcome === "RESOLVED_SELLER" || input.outcome === "CLOSED") {
      await tx.sellerSettlement.updateMany({
        where: { orderId: dispute.orderId, status: "BLOCKED" },
        data: { status: "HELD", note: "Dispute closed; normal settlement hold resumed." },
      });
    }
    return result;
  });
  await createNotification({ userId: dispute.openedById, type: "DISPUTE", title: "Dispute resolved", body: input.resolution, data: { disputeId: updated.id } });
  await createNotification({ userId: dispute.againstId, type: "DISPUTE", title: "Dispute resolved", body: input.resolution, data: { disputeId: updated.id } });
  return updated;
}
