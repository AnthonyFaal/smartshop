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
    update: {
      description: "Verified campus essentials for UMaT/Tarkwa students.",
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
      isActive: true,
    },
    create: {
      ownerId: seller.id,
      name: "Kwame's Shop",
      slug: "kwames-shop",
      description: "Verified campus essentials for UMaT/Tarkwa students.",
      address: "Tarkwa Market Area",
      logoUrl: null,
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
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
  // Representative Unsplash images make the local demo feel like a real
  // catalogue. They are not merchant inventory photography: replace each with
  // seller-owned images before a production listing is approved.
  const products = [
    {
      title: "Scientific Calculator FX-991EX",
      price: 180,
      stock: 25,
      description: "Advanced scientific calculator for engineering students",
      categorySlug: "electronics",
      images: ["https://img.cdnx.in/367727/SKU-1449_1-1760165414987.png?format=webp&width=900"],
    },
    {
      title: "USB-C Charger 65W",
      price: 95,
      stock: 40,
      description: "Fast charging USB-C power adapter for laptops",
      categorySlug: "electronics",
      images: ["https://www.aum-world.com/cdn/shop/articles/Gestion_de_cables_et_bureau_Assis_Debout_597b07e5-0b77-4b3b-b8a7-10e491abab8c.jpg?v=1749813233"],
    },
    { title: "A4 Lecture Notebook", price: 28, stock: 80, description: "Hard-cover ruled notebook for lectures, assignments and revision.", categorySlug: "books-stationery", images: ["https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=80"] },
    { title: "Engineering Drawing Set", price: 65, stock: 30, description: "Compass, ruler, protractor and set squares in a protective case.", categorySlug: "books-stationery", images: ["https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80"] },
    { title: "Blue Ballpoint Pen Pack", price: 18, stock: 120, description: "Smooth-writing blue pens, pack of ten for everyday coursework.", categorySlug: "books-stationery", images: ["https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80"] },
    { title: "USB-C to USB-C Cable", price: 35, stock: 70, description: "Durable one-metre charging and data cable for modern phones and laptops.", categorySlug: "electronics", images: ["https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=900&q=80"] },
    { title: "Wireless Earbuds Case", price: 120, stock: 22, description: "Compact Bluetooth earbuds for lectures, calls and study sessions.", categorySlug: "electronics", images: ["https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=900&q=80"] },
    { title: "Tempered Glass Screen Protector", price: 25, stock: 100, description: "Clear protective glass compatible with common smartphone sizes.", categorySlug: "electronics", images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80"] },
    { title: "Canvas Campus Backpack", price: 160, stock: 18, description: "Everyday backpack with a padded laptop sleeve and room for books.", categorySlug: "fashion", images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80"] },
    { title: "Plain Cotton T-Shirt", price: 55, stock: 45, description: "Comfortable unisex cotton T-shirt for campus days.", categorySlug: "fashion", images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80"] },
    { title: "Reusable Water Bottle", price: 48, stock: 36, description: "Leak-resistant bottle for lectures, gym sessions and the hostel.", categorySlug: "home-living", images: ["https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80"] },
    { title: "Bedside LED Study Lamp", price: 110, stock: 20, description: "Adjustable LED lamp for late-night reading and hostel study desks.", categorySlug: "home-living", images: ["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80"] },
    { title: "Laundry Basket", price: 75, stock: 25, description: "Lightweight folding laundry basket for hostel rooms.", categorySlug: "home-living", images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80"] },
    { title: "Body Lotion 400ml", price: 42, stock: 55, description: "Everyday moisturizing body lotion for personal care.", categorySlug: "beauty-personal-care", images: ["https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80"] },
    { title: "Travel Toiletry Pouch", price: 45, stock: 34, description: "Compact wash-bag for keeping personal-care essentials organised.", categorySlug: "beauty-personal-care", images: ["https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80"] },
  ];

  const categories = await prisma.category.findMany({
    where: { slug: { in: [...new Set(products.map((product) => product.categorySlug))] }, isActive: true },
    select: { id: true, slug: true },
  });
  const categoryIds = new Map(categories.map((category) => [category.slug, category.id]));

  for (const p of products) {
    const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const categoryId = categoryIds.get(p.categorySlug);
    if (!categoryId) throw new Error(`Seed failed: active category '${p.categorySlug}' not found`);

    await prisma.product.upsert({
      where: {
        storeId_slug: { storeId, slug },
      },
      update: {
        categoryId,
        description: p.description,
        price: p.price,
        stock: p.stock,
        images: p.images,
        status: "ACTIVE",
      },
      create: {
        sellerId,
        storeId,
        categoryId,
        title: p.title,
        slug,
        description: p.description,
        price: p.price,
        stock: p.stock,
        images: p.images,
        status: "ACTIVE",
      },
    });
  }

  await prisma.store.update({
    where: { id: storeId },
    data: { productCount: products.length },
  });
}
