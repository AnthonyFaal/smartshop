import { prisma } from "@/lib/db/prisma";

const DAY = 24 * 60 * 60 * 1000;

export async function getPilotScorecard(days = 30) {
  const since = new Date(Date.now() - days * DAY);
  const fulfilled = await prisma.order.findMany({
    where: { createdAt: { gte: since }, status: { in: ["DELIVERED", "COMPLETED"] } },
    select: { id: true, buyerId: true, createdAt: true, subtotal: true, platformFee: true, shippingCost: true, total: true, deliveryTask: { select: { deliveredAt: true, promisedBy: true } } },
  });
  const [disputes, cancelled, completedPayments, supportCosts] = await Promise.all([
    prisma.dispute.count({ where: { createdAt: { gte: since } } }),
    prisma.order.count({ where: { createdAt: { gte: since }, status: "CANCELLED" } }),
    prisma.payment.aggregate({ where: { createdAt: { gte: since }, status: "COMPLETED" }, _sum: { amount: true }, _count: { id: true } }),
    // Support costs are deliberately zero until an operations expense feed is
    // integrated. Reporting this explicitly prevents a false margin claim.
    Promise.resolve(0),
  ]);

  const gmv = fulfilled.reduce((sum, order) => sum + Number(order.subtotal), 0);
  const platformRevenue = fulfilled.reduce((sum, order) => sum + Number(order.platformFee), 0);
  const deliveryRevenue = fulfilled.reduce((sum, order) => sum + Number(order.shippingCost), 0);
  const onTimeTasks = fulfilled.filter((order) => order.deliveryTask?.deliveredAt && order.deliveryTask.deliveredAt <= order.deliveryTask.promisedBy).length;
  const deliveryTasks = fulfilled.filter((order) => order.deliveryTask).length;
  const buyerIds = [...new Set(fulfilled.map((order) => order.buyerId))];
  const repeatBuyers = buyerIds.filter((buyerId) => fulfilled.filter((order) => order.buyerId === buyerId).length >= 2).length;

  return {
    periodDays: days,
    fulfilledOrders: fulfilled.length,
    paidOrders: completedPayments._count.id,
    gmv,
    platformRevenue,
    deliveryRevenue,
    grossMarketplaceRevenue: platformRevenue + deliveryRevenue,
    contributionMarginBeforeVariableCosts: platformRevenue + deliveryRevenue - supportCosts,
    variableCostsIncluded: false,
    activeBuyers: buyerIds.length,
    repeatBuyerRate: buyerIds.length ? (repeatBuyers / buyerIds.length) * 100 : 0,
    onTimeDeliveryRate: deliveryTasks ? (onTimeTasks / deliveryTasks) * 100 : null,
    disputeRate: fulfilled.length ? (disputes / fulfilled.length) * 100 : 0,
    cancellationRate: fulfilled.length + cancelled ? (cancelled / (fulfilled.length + cancelled)) * 100 : 0,
    targets: { weeklyFulfilledOrders: 100, repeatBuyerRate: 25, onTimeDeliveryRate: 90, disputeRateMaximum: 3 },
  };
}
