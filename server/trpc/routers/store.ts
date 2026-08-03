import { z } from "zod";
import { SubscriptionPlan } from "@prisma/client";

import {
  createTRPCRouter,
  protectedProcedure,
  sellerProcedure,
  withErrorHandling,
} from "@/server/trpc/init";
import { prisma } from "@/lib/db/prisma";
import { Errors } from "@/server/errors";
import { getPlanLimits } from "@/lib/config/subscriptions";
import { slugify } from "@/lib/utils/format";

function buildStoreSlugBase(name: string) {
  return (slugify(name) || "store").slice(0, 180);
}

async function createUniqueStoreSlug(name: string) {
  const baseSlug = buildStoreSlugBase(name);
  let slug = baseSlug;
  let attempt = 1;

  while (await prisma.store.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  return slug;
}

export const storeRouter = createTRPCRouter({
  list: protectedProcedure
    .use(withErrorHandling)
    .query(async ({ ctx }) => {
      return prisma.store.findMany({
        where: { ownerId: ctx.user.id, deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isActive: true,
          verificationStatus: true,
          productCount: true,
          followerCount: true,
          createdAt: true,
        },
        orderBy: { name: "asc" },
      });
    }),

  create: sellerProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        name: z.string().trim().min(2).max(200),
        description: z.string().trim().max(1000).optional(),

        // Branding (optional, but if provided must be valid URLs)
        logoUrl: z
          .string()
          .trim()
          .url()
          .max(500)
          .optional()
          .nullable(),
        bannerUrl: z
          .string()
          .trim()
          .url()
          .max(500)
          .optional()
          .nullable(),

        // Store location
        // Migration window:
        // - Prefer canonical `locationId`
        // - Keep legacy `city`/`region` optional so old UI/data can still work
        address: z.string().trim().min(3).max(255),
        locationId: z.string().uuid().optional(),
        city: z.string().trim().min(2).max(100).optional(),
        region: z.string().trim().min(2).max(100).optional(),
        country: z.string().trim().max(100).optional().default("Ghana"),
        latitude: z.number(),
        longitude: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingStoreCount = await prisma.store.count({
        where: { ownerId: ctx.user.id, deletedAt: null },
      });

      if (existingStoreCount > 0) {
        const subscription = await prisma.subscription.findUnique({
          where: { userId: ctx.user.id },
          select: { plan: true },
        });
        const plan = (subscription?.plan ?? "FREE") as SubscriptionPlan;
        const limits = getPlanLimits(plan);

        if (!limits.multiStore) {
          throw Errors.subscriptionLimit(
            "Your current plan supports one store. Upgrade to create more stores."
          );
        }
      }

      
      if ((input.country ?? "Ghana") !== "Ghana") {
        throw Errors.badRequest("Only Ghana is supported for store location for now.");
      }


      const slug = await createUniqueStoreSlug(input.name);

      let resolvedLocationId: string | undefined = input.locationId;

      if (!resolvedLocationId) {
        const legacyRegion = input.region?.trim() || undefined;
        const legacyCity = input.city?.trim() || undefined;

        if (legacyRegion && legacyCity) {
          const match = await prisma.location.findFirst({
            where: {
              region: legacyRegion,
              name: legacyCity,
              type: { in: ["CITY", "TOWN", "AREA", "DISTRICT", "SUBURB", "REGION", "COUNTRY"] },
            },
            select: { id: true },
          });

          resolvedLocationId = match?.id ?? undefined;
        }

        if (!resolvedLocationId && legacyCity) {
          const match = await prisma.location.findFirst({
            where: {
              name: legacyCity,
            },
            select: { id: true },
          });

          resolvedLocationId = match?.id ?? undefined;
        }
      }

      return prisma.store.create({
        data: {
          ownerId: ctx.user.id,
          name: input.name,
          slug,
          description: input.description || null,
          logoUrl: input.logoUrl ?? null,
          bannerUrl: input.bannerUrl ?? null,
          address: input.address ?? null,
          locationId: resolvedLocationId ?? null,
          
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isActive: true,
          verificationStatus: true,
          productCount: true,
          followerCount: true,
          createdAt: true,
        },
      });
    }),
});

export default storeRouter;

