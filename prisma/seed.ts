import { PrismaClient, SubscriptionPlan } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { getDefaultSubscriptionOfferings } from "@/lib/config/subscriptions";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://smartshop:smartshop@localhost:5432/smartshop",
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * -------------------------
 * ADMIN SEED
 * -------------------------
 */
async function seedAdmin() {
  const passwordHash = await bcrypt.hash("Admin123!", 12);

  return prisma.user.upsert({
    where: { email: "admin@smartshop.gh" },
    update: {}, // intentionally immutable
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
          currentPeriodEnd: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000
          ),
        },
      },
    },
  });
}

/**
 * -------------------------
 * SUBSCRIPTION CATALOG SEED
 * (SAFE - NO OVERWRITES)
 * -------------------------
 */
async function seedSubscriptionOfferings() {
  const offerings = getDefaultSubscriptionOfferings();

  for (const offering of offerings) {
    const existing = await prisma.subscriptionOffering.findFirst({
      where: {
        tier: offering.tier as SubscriptionPlan,
        version: offering.version,
      },
    });

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

    if (siblings.length > 1) {
      await Promise.all(
        siblings.slice(1).map((item) =>
          prisma.subscriptionOffering.delete({ where: { id: item.id } })
        )
      );
    }

    // Only safe updates (non-financial / structural metadata)
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
 * -------------------------
 * CATEGORIES SEED
 * -------------------------
 */
async function seedCategories() {
  return Promise.all([
    prisma.category.upsert({
      where: { slug: "electronics" },
      update: {},
      create: {
        name: "Electronics",
        slug: "electronics",
        description: "Phones, laptops, accessories",
        sortOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: "books-stationery" },
      update: {},
      create: {
        name: "Books & Stationery",
        slug: "books-stationery",
        description: "Textbooks, notebooks, supplies",
        sortOrder: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: "fashion" },
      update: {},
      create: {
        name: "Fashion",
        slug: "fashion",
        description: "Clothing, shoes, accessories",
        sortOrder: 3,
      },
    }),
    prisma.category.upsert({
      where: { slug: "food-beverages" },
      update: {},
      create: {
        name: "Food & Beverages",
        slug: "food-beverages",
        description: "Snacks, drinks, local food",
        sortOrder: 4,
      },
    }),
  ]);
}

/**
 * -------------------------
 * SELLER + STORE SEED
 * -------------------------
 */
async function seedSeller(categories: any[]) {
  const sellerHash = await bcrypt.hash("Seller123!", 12);

  const seller = await prisma.user.upsert({
    where: { email: "seller@smartshop.gh" },
    update: {},
    create: {
      email: "seller@smartshop.gh",
      passwordHash: sellerHash,
      role: "SELLER",
      emailVerified: true,
      phone: "+233209876543",
      phoneVerified: true,
      verificationLevel: "TRUSTED_SELLER",
      profile: {
        create: {
          firstName: "Kwame",
          lastName: "Mensah",
          displayName: "Kwame's Shop",
        },
      },
      trustScore: { create: { score: 85 } },
      cart: { create: {} },
      wishlists: { create: { name: "My Wishlist", isDefault: true } },
      sellerVerification: {
        create: {
          status: "APPROVED",
          ghanaCardNumber: "GHA-000000000-0",
          ghanaCardFrontUrl:
            "https://placeholder.smartshop.gh/ghana-card-front.jpg",
          selfieUrl: "https://placeholder.smartshop.gh/selfie.jpg",
          shop_address: "UMaT Campus, Tarkwa",
          shop_city: "Tarkwa",
          shop_region: "Western Region",
          latitude: 5.303,
          longitude: -1.989,
          reviewedAt: new Date(),
        },
      },
      subscription: {
        create: {
          plan: "STARTER",
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ),
        },
      },
    },
  });

  const store = await prisma.store.upsert({
    where: { slug: "kwames-shop" },
    update: {},
    create: {
      ownerId: seller.id,
      name: "Kwame's Shop",
      slug: "kwames-shop",
      description: "Quality products for UMaT students",
      isVerified: true,
      rating: 4.5,
      reviewCount: 12,
    },
  });

  return { seller, store };
}

/**
 * -------------------------
 * PRODUCTS SEED
 * -------------------------
 */
async function seedProducts(store: any, seller: any, categories: any[]) {
  const sampleProducts = [
    {
      title: "Scientific Calculator FX-991EX",
      description:
        "ClassWiz scientific calculator, perfect for engineering students at UMaT.",
      price: 180,
      comparePrice: 220,
      stock: 25,
      images: [
        "https://images.unsplash.com/photo-1587148220147-0a89b882b1b9?w=400",
      ],
      tags: ["calculator", "engineering", "stationery"],
      categoryId: categories[1].id,
    },
    {
      title: "USB-C Laptop Charger 65W",
      description: "Universal USB-C PD charger compatible with most laptops.",
      price: 95,
      stock: 40,
      images: [
        "https://images.unsplash.com/photo-1591290619762-d2b4a0a2d1e1?w=400",
      ],
      tags: ["charger", "laptop", "electronics"],
      categoryId: categories[0].id,
    },
    {
      title: "Engineering Drawing Set",
      description:
        "Complete drawing set with compass, protractor, and scales.",
      price: 45,
      stock: 60,
      images: [
        "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400",
      ],
      tags: ["drawing", "engineering", "stationery"],
      categoryId: categories[1].id,
    },
    {
      title: "Wireless Earbuds Pro",
      description:
        "Noise-cancelling wireless earbuds with 24hr battery life.",
      price: 150,
      comparePrice: 200,
      stock: 30,
      images: [
        "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400",
      ],
      tags: ["earbuds", "audio", "electronics"],
      categoryId: categories[0].id,
    },
    {
      title: "UMaT Hoodie — Navy",
      description: "Official-style UMaT campus hoodie, unisex, sizes S-XL.",
      price: 120,
      stock: 15,
      images: [
        "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400",
      ],
      tags: ["hoodie", "fashion", "umat"],
      categoryId: categories[2].id,
    },
  ];

  for (const product of sampleProducts) {
    const slug = product.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    await prisma.product.upsert({
      where: { storeId_slug: { storeId: store.id, slug } },
      update: {},
      create: {
        sellerId: seller.id,
        storeId: store.id,
        categoryId: product.categoryId,
        title: product.title,
        slug,
        description: product.description,
        price: product.price,
        comparePrice: product.comparePrice,
        stock: product.stock,
        images: product.images,
        tags: product.tags,
        status: "ACTIVE",
      },
    });
  }

  await prisma.store.update({
    where: { id: store.id },
    data: { productCount: sampleProducts.length },
  });
}

/**
 * -------------------------
 * MAIN
 * -------------------------
 */
async function main() {
  await seedAdmin();
  await seedSubscriptionOfferings();

  const categories = await seedCategories();
  const { seller, store } = await seedSeller(categories);

  await seedProducts(store, seller, categories);

  console.log("Seed completed:");
  console.log("Admin: admin@smartshop.gh / Admin123!");
  console.log("Seller: seller@smartshop.gh / Seller123!");
  console.log(`Categories: ${categories.length}`);
  console.log("Subscription offerings: safely synced");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });