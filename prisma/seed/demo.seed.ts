import bcrypt from "bcryptjs";
import { prisma } from "./types";

/**
 * Location helpers (demo-time only)
 * NOTE: During migration/backfill window we keep `Store.city/region`,
 * but we also attach `Store.locationId` so the Location system is exercised.
 */
function slugifyLocation(name: string, type: string, region?: string | null) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const regionPart = region ? `-${slugifyRegion(region)}` : "";
  return `${base}-${type.toLowerCase()}${regionPart}`.replace(/--+/g, "-");
}

function slugifyRegion(region: string) {
  return region
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function upsertLocation(input: {
  name: string;
  type: "CITY" | "TOWN" | "AREA" | "DISTRICT" | "SUBURB";
  slug: string;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  country?: string;
  parentId?: string | null;
}) {
  return prisma.location.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      type: input.type,
      region: input.region ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      parentId: input.parentId ?? null,
      country: input.country ?? "Ghana",
    },
    create: {
      name: input.name,
      slug: input.slug,
      type: input.type,
      region: input.region ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      country: input.country ?? "Ghana",
      parentId: input.parentId ?? null,
    },
  });
}

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

  // Ensure required canonical locations exist.
  // Demo store is Tarkwa marketplace, so at minimum we need Tarkwa (CITY).
  const tarkwaRegion = "Western";
  const tarkwa = await upsertLocation({
    name: "Tarkwa",
    type: "CITY",
    slug: slugifyLocation("Tarkwa", "CITY", tarkwaRegion),
    region: tarkwaRegion,
    latitude: 4.8833,
    longitude: -1.7667,
    country: "Ghana",
    parentId: null,
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
      logoUrl: null,
      verificationStatus: "PENDING",
      isActive: true,
      followerCount: 0,
      productCount: 0,
      reviewCount: 12,
      rating: 4.5,
      locationId: tarkwa.id,
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
