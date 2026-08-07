import { prisma } from "@/lib/db/prisma";
import {
  formatMaxProductsDisplay,
  getPlanLimits,
  getPlanMeta,
} from "@/lib/config/subscriptions";
import { SubscriptionPlan } from "@prisma/client";

export async function getSellerDashboardData(userId: string) {
  const [user, store, productCount, products, orders] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        subscription: {
          select: {
            plan: true,
            status: true,
          },
        },
        trustScore: {
          select: {
            score: true,
          },
        },
        sellerVerification: {
          select: {
            status: true,
          },
        },
      },
    }),
    prisma.store.findFirst({
      where: { ownerId: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        verificationStatus: true,
        productCount: true,
      },
    }),
    prisma.product.count({
      where: { sellerId: userId, deletedAt: null },
    }),
    prisma.product.findMany({
      where: { sellerId: userId, deletedAt: null },
      select: {
        id: true,
        title: true,
        price: true,
        status: true,
        stock: true,
        variants: { select: { quantity: true } },
        viewCount: true,
        soldCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.order.findMany({
      where: { sellerId: userId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const plan = (user?.subscription?.plan ?? "FREE") as SubscriptionPlan;
  const planStatus = user?.subscription?.status ?? "EXPIRED";
  const planLimits = getPlanLimits(plan);
  const planMeta = getPlanMeta(plan);

  const totals = orders.reduce(
    (acc, order) => {
      const value = Number(order.total);
      if (["COMPLETED", "DELIVERED"].includes(order.status)) {
        acc.completedRevenue += value;
      }
      if (["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED"].includes(order.status)) {
        acc.pendingEscrow += value;
      }
      return acc;
    },
    { completedRevenue: 0, pendingEscrow: 0 }
  );

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const ordersToday = orders.filter((order) => order.createdAt >= startOfDay).length;

  const activeProducts = products.filter((product) => product.status === "ACTIVE").length;
  const totalViews = products.reduce((sum, product) => sum + product.viewCount, 0);
  const totalSold = products.reduce((sum, product) => sum + product.soldCount, 0);
  const conversionRate = totalViews > 0 ? (totalSold / totalViews) * 100 : 0;

  const limit = planLimits.maxProducts;
  const canCreateProduct = limit === null || productCount < limit;

  return {
    plan,
    planStatus,
    planLabel: planMeta.label,
    planDescription: planMeta.description,
    verificationStatus: store?.verificationStatus ?? "PENDING",
    trustScore: user?.trustScore?.score ?? 0,
    store: store
      ? {
          id: store.id,
          name: store.name,
          isVerified: store.verificationStatus === "VERIFIED",
          productCount: store.productCount,
        }
      : null,
    metrics: {
      totalRevenue: totals.completedRevenue,
      pendingEscrow: totals.pendingEscrow,
      availableBalance: Math.max(0, totals.completedRevenue - totals.pendingEscrow),
      ordersToday,
      productsLive: activeProducts,
      conversionRate,
      trustScore: user?.trustScore?.score ?? 0,
    },
    productUsage: {
      used: productCount,
      limit,
      limitLabel: formatMaxProductsDisplay(limit ?? null),
      remaining: limit === null ? null : Math.max(0, limit - productCount),
      canCreateProduct,
    },
    recentProducts: products.map((product) => ({
      id: product.id,
      title: product.title,
      price: Number(product.price),
      status: product.status,
      stock:
        product.variants.length > 0
          ? product.variants.reduce((sum, variant) => sum + variant.quantity, 0)
          : product.stock,
      createdAt: product.createdAt,
    })),
    recentOrders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: Number(order.total),
      createdAt: order.createdAt,
    })),
  };
}
