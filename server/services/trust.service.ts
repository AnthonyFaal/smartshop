import { prisma } from "@/lib/db/prisma";
import type { VerificationLevel } from "@prisma/client";

const VERIFICATION_SCORES: Record<VerificationLevel, number> = {
  NONE: 0,
  PHONE_VERIFIED: 20,
  IDENTITY_VERIFIED: 30,
  LOCATION_VERIFIED: 20,
  TRUSTED_SELLER: 30,
};

export async function calculateTrustScore(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      trustScore: true,
      sellerVerification: true,
    },
  });

  if (!user) return 0;

  const verificationScore = VERIFICATION_SCORES[user.verificationLevel];

  const orders = await prisma.order.groupBy({
    by: ["status"],
    where: { sellerId: userId },
    _count: true,
  });

  const totalOrders = orders.reduce((sum, o) => sum + o._count, 0);
  const completedOrders =
    orders.find((o) => o.status === "COMPLETED")?._count ?? 0;
  const refundedOrders =
    orders.find((o) => o.status === "REFUNDED")?._count ?? 0;

  const orderCompletionRate =
    totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
  const refundRate =
    totalOrders > 0 ? (refundedOrders / totalOrders) * 100 : 0;

  const disputeCount = await prisma.dispute.count({
    where: { againstId: userId },
  });
  const disputeRate =
    totalOrders > 0 ? (disputeCount / totalOrders) * 100 : 0;

  const reviews = await prisma.review.aggregate({
    where: { store: { ownerId: userId } },
    _avg: { rating: true },
    _count: true,
  });

  const averageRating = reviews._avg.rating ?? 0;

  const behavioralScore =
    orderCompletionRate * 0.15 +
    Math.max(0, 100 - refundRate) * 0.1 +
    Math.max(0, 100 - disputeRate) * 0.1 +
    (Number(averageRating) / 5) * 100 * 0.15;

  const rawScore = verificationScore + behavioralScore;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  await prisma.trustScore.upsert({
    where: { userId },
    create: {
      userId,
      score,
      orderCompletionRate,
      refundRate,
      disputeRate,
      averageRating,
      totalOrders,
      completedOrders,
      lastCalculatedAt: new Date(),
    },
    update: {
      score,
      orderCompletionRate,
      refundRate,
      disputeRate,
      averageRating,
      totalOrders,
      completedOrders,
      lastCalculatedAt: new Date(),
    },
  });

  return score;
}
