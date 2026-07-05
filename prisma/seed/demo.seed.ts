import bcrypt from "bcryptjs";
import { prisma } from "./types";

/**
 * SELLER + STORE (DEMO ONLY)
 */
export async function seedDemoSeller() {
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
          ghanaCardFrontUrl: "https://placeholder.smartshop.gh/card.jpg",
          selfieUrl: "https://placeholder.smartshop.gh/selfie.jpg",
          reviewedAt: new Date(),
        },
      },
      subscription: {
        create: {
          plan: "STARTER",
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
    description: "Demo store in Tarkwa marketplace",

    address: "Tarkwa Market Area",
    city: "Tarkwa",
    region: "Western Region",
    country: "Ghana",
    logoUrl: null,

    latitude: 5.3016,
    longitude: -1.9951,

    verificationStatus: "PENDING",

    isActive: true,

    followerCount: 0,
    productCount: 0,
    reviewCount: 12,
    rating: 4.5,
    },
  });

  return { seller, store };
}


/**
 * DEMO PRODUCTS
 */

export async function seedDemoProducts(storeId: string, sellerId: string) {
  const products = [
    {
      title: "Scientific Calculator FX-991EX",
      price: 180,
      stock: 25,
      description: "Advanced scientific calculator for engineering students",
    },
    {
      title: "USB-C Charger 65W",
      price: 95,
      stock: 40,
      description: "Fast charging USB-C power adapter for laptops",
    },
  ];

  // Fetch a valid category once (adjust slug if needed)
  const category = await prisma.category.findFirst({
    where: { slug: "electronics" },
  });

  if (!category) {
    throw new Error("Seed failed: 'electronics' category not found");
  }

  const categoryId = category.id;

  for (const p of products) {
    const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    await prisma.product.upsert({
      where: {
        storeId_slug: { storeId, slug },
      },
      update: {},
      create: {
        sellerId,
        storeId,
        categoryId, // ✅ now properly defined
        title: p.title,
        slug,
        description: p.description,
        price: p.price,
        stock: p.stock,
        images: [],
        status: "ACTIVE",
      },
    });
  }
}