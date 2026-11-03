import bcrypt from "bcryptjs";
import { prisma } from "./types";
import { getDefaultSubscriptionOfferings } from "@/lib/config/subscriptions";
import { LocationType, SubscriptionPlan } from "@prisma/client";

// IMPORTANT: Prisma enum LocationType only supports:
// CITY, TOWN, AREA, DISTRICT, SUBURB (no COUNTRY/REGION).
// Seed data below must not reference COUNTRY or REGION.

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
        priceGhs: offering.priceGhs,
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
  // The pilot deliberately trades catalogue breadth for trust and operational
  // control. Inactive categories stay in the database for later review but
  // cannot be listed or surfaced publicly.
  const categories = [
    { name: "Books & Stationery", slug: "books-stationery", sortOrder: 1, isActive: true },
    { name: "Fashion & Accessories", slug: "fashion", sortOrder: 2, isActive: true },
    { name: "Hostel Essentials", slug: "home-living", sortOrder: 3, isActive: true },
    { name: "Beauty & Personal Care", slug: "beauty-personal-care", sortOrder: 4, isActive: true },
    { name: "Phone Accessories", slug: "electronics", sortOrder: 5, isActive: true },
    { name: "Food & Beverages", slug: "food-beverages", sortOrder: 6, isActive: false },
    { name: "Sports & Fitness", slug: "sports-fitness", sortOrder: 7, isActive: false },
    { name: "Automotive", slug: "automotive", sortOrder: 8, isActive: false },
    { name: "Babies & Kids", slug: "babies-kids", sortOrder: 9, isActive: false },
    { name: "Software & Digital", slug: "software-digital", sortOrder: 10, isActive: false },
    { name: "Agriculture", slug: "agriculture", sortOrder: 11, isActive: false },
    { name: "Health & Wellness", slug: "health-wellness", sortOrder: 12, isActive: false },
    { name: "Services", slug: "services", sortOrder: 13, isActive: false },
    { name: "Groceries", slug: "groceries", sortOrder: 14, isActive: false },
    { name: "Gaming & Entertainment", slug: "gaming-entertainment", sortOrder: 15, isActive: false },
  ];
  await Promise.all(categories.map((category) => prisma.category.upsert({
    where: { slug: category.slug }, update: category, create: category,
  })));
}

/**
 * LOCATION SEED (TARKWA + UMAT FOCUSED)
 */
export async function seedLocations() {
  /**
   * =========================
   * COUNTRY
   * =========================
   */
  // LocationType has no COUNTRY/REGION values in schema.prisma.
  // We still keep the hierarchical tree by storing country/region as plain strings.
  // Create top-level "country" record using CITY/TOWN/AREA etc. (pick a neutral type).
  const ghana = await prisma.location.upsert({
    where: { slug: "ghana" },
    update: {},
    create: {
      name: "Ghana",
      slug: "ghana",
      type: LocationType.TOWN,
      country: "Ghana",
    },
  });


  /**
   * =========================
   * REGION
   * =========================
   */
  const westernRegion = await prisma.location.upsert({
    where: { slug: "western-region" },
    update: {},
    create: {
      name: "Western Region",
      slug: "western-region",
      // REGION not supported in enum; store it as region string instead.
      type: LocationType.CITY,
      country: "Ghana",
      region: "Western Region",
      parentId: ghana.id,
    },
  });


  /**
   * =========================
   * CITY (TARKWA)
   * =========================
   */
  const tarkwa = await prisma.location.upsert({
    where: { slug: "tarkwa" },
    update: {},
    create: {
      name: "Tarkwa",
      slug: "tarkwa",
      type: LocationType.CITY,
      country: "Ghana",
      region: "Western Region",
      parentId: westernRegion.id,
      latitude: 5.3039,
      longitude: -1.9947,
    },
  });

  /**
   * =========================
   * UMAT ZONE (CORE HUB)
   * =========================
   */
  const umatZone = await prisma.location.upsert({
    where: { slug: "umat-zone" },
    update: {},
    create: {
      name: "UMAT Campus Zone",
      slug: "umat-zone",
      type: LocationType.TOWN,
      country: "Ghana",
      region: "Western Region",
      parentId: tarkwa.id,
      latitude: 5.3008,
      longitude: -1.9942,
    },
  });

  /**
   * =========================
   * CAMPUS AREA (0–2KM)
   * =========================
   */
  const campusAreas = [
    {
      name: "UMAT Main Gate",
      slug: "umat-main-gate",
      type: LocationType.AREA,
      lat: 5.3009,
      lng: -1.9940,
    },
    {
      name: "UMAT Hostel Zone",
      slug: "umat-hostels",
      type: LocationType.AREA,
      lat: 5.3016,
      lng: -1.9934,
    },
    {
      name: "UMAT Lecture Halls",
      slug: "umat-lecture-zone",
      type: LocationType.AREA,
      lat: 5.3002,
      lng: -1.9951,
    },
    {
      name: "UMAT Back Gate",
      slug: "umat-back-gate",
      type: LocationType.AREA,
      lat: 5.2997,
      lng: -1.9949,
    },
  ];

  for (const a of campusAreas) {
    await prisma.location.upsert({
      where: { slug: a.slug },
      update: {},
      create: {
        name: a.name,
        slug: a.slug,
        type: a.type,
        country: "Ghana",
        region: "Western Region",
        parentId: umatZone.id,
        latitude: a.lat,
        longitude: a.lng,
      },
    });
  }

  /**
   * =========================
   * URBAN CORE (TARKWA 2–5KM)
   * =========================
   */
  const urbanCore = [
    {
      name: "Tarkwa Central Business District",
      slug: "tarkwa-cbd",
      type: LocationType.DISTRICT,
      lat: 5.3003,
      lng: -1.9906,
    },
    {
      name: "Tarkwa Main Market",
      slug: "tarkwa-market",
      type: LocationType.DISTRICT,
      lat: 5.3010,
      lng: -1.9921,
    },
    {
      name: "Akontansi Community",
      slug: "akontansi",
      type: LocationType.SUBURB,
      lat: 5.2955,
      lng: -1.9968,
    },
    {
      name: "Bankyim Residential Area",
      slug: "bankyim",
      type: LocationType.SUBURB,
      lat: 5.3056,
      lng: -1.9964,
    },
  ];

  for (const l of urbanCore) {
    await prisma.location.upsert({
      where: { slug: l.slug },
      update: {},
      create: {
        name: l.name,
        slug: l.slug,
        type: l.type,
        country: "Ghana",
        region: "Western Region",
        parentId: tarkwa.id,
        latitude: l.lat,
        longitude: l.lng,
      },
    });
  }

  /**
   * =========================
   * SURROUNDING TOWNS (5–40KM)
   * =========================
   */
  const surroundingTowns = [
    {
      name: "Tarkwa Banso",
      slug: "tarkwa-banso",
      type: LocationType.TOWN,
      lat: 5.3105,
      lng: -1.9902,
    },
    {
      name: "Nsuaem",
      slug: "nsuaem",
      type: LocationType.TOWN,
      lat: 5.2833,
      lng: -1.9833,
    },
    {
      name: "Aboso",
      slug: "aboso",
      type: LocationType.TOWN,
      lat: 5.3500,
      lng: -1.9667,
    },
    {
      name: "Huni Valley",
      slug: "huni-valley",
      type: LocationType.CITY,
      lat: 5.2333,
      lng: -1.7833,
    },
    {
      name: "Bogoso",
      slug: "bogoso",
      type: LocationType.CITY,
      lat: 5.5333,
      lng: -1.9333,
    },
    {
      name: "Prestea",
      slug: "prestea",
      type: LocationType.CITY,
      lat: 5.4333,
      lng: -2.1333,
    },
  ];

  for (const t of surroundingTowns) {
    await prisma.location.upsert({
      where: { slug: t.slug },
      update: {},
      create: {
        name: t.name,
        slug: t.slug,
        type: t.type,
        country: "Ghana",
        region: "Western Region",
        parentId: westernRegion.id,
        latitude: t.lat,
        longitude: t.lng,
      },
    });
  }

  return {
    ghana,
    westernRegion,
    tarkwa,
    umatZone,
  };
}

/**
 * Pilot fulfilment is intentionally constrained to staffed UMaT zones. Prices
 * are explicit so the delivery unit economics can be reviewed weekly.
 */
export async function seedPilotDeliveryZones() {
  const zones = [
    { slug: "umat-main-gate", name: "UMaT Main Gate", deliveryFee: 5, promisedMinutes: 45 },
    { slug: "umat-hostels", name: "UMaT Hostels", deliveryFee: 7, promisedMinutes: 60 },
    { slug: "umat-lecture-zone", name: "UMaT Lecture Halls", deliveryFee: 5, promisedMinutes: 45 },
    { slug: "umat-back-gate", name: "UMaT Back Gate", deliveryFee: 7, promisedMinutes: 60 },
  ];
  for (const zone of zones) {
    const location = await prisma.location.findUniqueOrThrow({ where: { slug: zone.slug } });
    const zoneData = {
      name: zone.name,
      deliveryFee: zone.deliveryFee,
      promisedMinutes: zone.promisedMinutes,
    };
    await prisma.deliveryZone.upsert({
      where: { locationId: location.id },
      create: { locationId: location.id, ...zoneData },
      update: { ...zoneData, isActive: true },
    });
  }
}
