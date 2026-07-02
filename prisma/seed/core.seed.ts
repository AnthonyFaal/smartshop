import bcrypt from "bcryptjs";
import { prisma } from "./types";
import { getDefaultSubscriptionOfferings } from "@/lib/config/subscriptions";
import { SubscriptionPlan } from "@prisma/client";

/**
 * ADMIN
 */
export async function seedAdmin() {
  const passwordHash = await bcrypt.hash("Adminlan!", 12);

  return prisma.user.upsert({
    where: { email: "admin@smartshop.gh" },
    update: {},
    create: {
      email: "admin@smartshop.gh",
      passwordHash,
      role: "ADMIN",
      emailVerified: true,
      phone: "+233241234567",
      phoneVerified: true,
      verificationLevel: "TRUSTED_SELLER",
      profile: {
        create: {
          firstName: "System",
          lastName: "Admin",
          displayName: "SmartShop Admin",
        },
      },
      trustScore: { create: { score: 100 } },
      cart: { create: {} },
      wishlists: { create: { name: "My Wishlist", isDefault: true } },
      subscription: {
        create: {
          plan: "ENTERPRISE",
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });
}

/**
 * SUBSCRIPTIONS (SAFE SYNC)
 */
export async function seedSubscriptionOfferings() {
  const offerings = getDefaultSubscriptionOfferings();

  for (const offering of offerings) {
    const siblings = await prisma.subscriptionOffering.findMany({
      where: { tier: offering.tier as SubscriptionPlan },
    });

    const primary = siblings[0];

    if (!primary) {
      await prisma.subscriptionOffering.create({
        data: {
          ...offering,
          tier: offering.tier as SubscriptionPlan,
        },
      });
      continue;
    }

    await prisma.subscriptionOffering.update({
      where: { id: primary.id },
      data: {
        name: offering.name,
        version: offering.version,
        maxProducts: offering.maxProducts,
        aiTier: offering.aiTier,
        analytics: offering.analytics,
        promotions: offering.promotions,
        multiStore: offering.multiStore,
        teamManagement: offering.teamManagement,
        apiAccess: offering.apiAccess,
        freeTrialDays: offering.freeTrialDays,
        aiDailyRequests: offering.aiDailyRequests,
        aiMaxTokensPerRequest: offering.aiMaxTokensPerRequest,
        isActive: offering.isActive,
      },
    });
  }
}

/**
 * CATEGORIES (STATIC)
 */
export async function seedCategories() {
  return prisma.category.createMany({
    data: [
      { name: "Electronics", slug: "electronics", sortOrder: 1 },
      { name: "Books & Stationery", slug: "books-stationery", sortOrder: 2 },
      { name: "Fashion", slug: "fashion", sortOrder: 3 },
      { name: "Food & Beverages", slug: "food-beverages", sortOrder: 4 },
      { name: "Home & Living", slug: "home-living", sortOrder: 5 },
      { name: "Beauty & Personal Care", slug: "beauty-personal-care", sortOrder: 6 },
      { name: "Sports & Fitness", slug: "sports-fitness", sortOrder: 7 },
      { name: "Automotive", slug: "automotive", sortOrder: 8 },
      { name: "Babies & Kids", slug: "babies-kids", sortOrder: 9 },
      { name: "Software & Digital", slug: "software-digital", sortOrder: 10 },
      { name: "Agriculture", slug: "agriculture", sortOrder: 11 },
      { name: "Health & Wellness", slug: "health-wellness", sortOrder: 12 },
      { name: "Services", slug: "services", sortOrder: 13 },
      { name: "Groceries", slug: "groceries", sortOrder: 14 },
      { name: "Gaming & Entertainment", slug: "gaming-entertainment", sortOrder: 15 },
    ],
    skipDuplicates: true,
  });
}