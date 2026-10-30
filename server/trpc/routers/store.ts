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
          address: true,
          city: true,
          region: true,
          country: true,
          latitude: true,
          longitude: true,
          locationId: true,
          logoUrl: true,
          bannerUrl: true,
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
        locationId: z.string().uuid(),
        city: z.string().trim().min(2).max(100),
        region: z.string().trim().min(2).max(100),
        country: z.string().trim().max(100).optional().default("Ghana"),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sellerVerification = await prisma.sellerVerification.findUnique({
        where: { userId: ctx.user.id }, select: { status: true },
      });
      if (sellerVerification?.status !== "APPROVED") {
        throw Errors.forbidden("Complete seller identity verification before creating a public store.");
      }
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

      const location = await prisma.location.findUnique({
        where: { id: input.locationId },
        select: { id: true, name: true, region: true },
      });
      if (!location) throw Errors.badRequest("Selected store location was not found.");

      return prisma.store.create({
        data: {
          ownerId: ctx.user.id,
          name: input.name,
          slug,
          description: input.description || null,
          logoUrl: input.logoUrl ?? null,
          bannerUrl: input.bannerUrl ?? null,
          address: input.address,
          city: input.city,
          region: input.region,
          country: input.country,
          latitude: input.latitude,
          longitude: input.longitude,
          locationId: location.id,
          // An approved seller with a complete, canonical pilot location may
          // publish their first store immediately. Later material location
          // changes intentionally require an operational re-review.
          verificationStatus: "VERIFIED",
          verifiedAt: new Date(),
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

  update: sellerProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        storeId: z.string().uuid(),
        name: z.string().trim().min(2).max(200).optional(),
        description: z.string().trim().max(1000).optional().nullable(),
        logoUrl: z.string().trim().url().max(500).optional().nullable(),
        bannerUrl: z.string().trim().url().max(500).optional().nullable(),
        address: z.string().trim().min(3).max(255).optional(),
        locationId: z.string().uuid().optional(),
        city: z.string().trim().min(2).max(100).optional(),
        region: z.string().trim().min(2).max(100).optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const current = await prisma.store.findFirst({
        where: { id: input.storeId, ownerId: ctx.user.id, deletedAt: null },
      });
      if (!current) throw Errors.notFound("Store");

      const locationChanged =
        (input.address !== undefined && input.address !== current.address) ||
        (input.locationId !== undefined && input.locationId !== current.locationId) ||
        (input.city !== undefined && input.city !== current.city) ||
        (input.region !== undefined && input.region !== current.region) ||
        (input.latitude !== undefined && input.latitude !== Number(current.latitude)) ||
        (input.longitude !== undefined && input.longitude !== Number(current.longitude));

      if (input.locationId) {
        const location = await prisma.location.findUnique({
          where: { id: input.locationId },
          select: { id: true },
        });
        if (!location) throw Errors.badRequest("Selected store location was not found.");
      }

      return prisma.store.update({
        where: { id: current.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
          ...(input.bannerUrl !== undefined && { bannerUrl: input.bannerUrl }),
          ...(input.address !== undefined && { address: input.address }),
          ...(input.locationId !== undefined && { locationId: input.locationId }),
          ...(input.city !== undefined && { city: input.city }),
          ...(input.region !== undefined && { region: input.region }),
          ...(input.latitude !== undefined && { latitude: input.latitude }),
          ...(input.longitude !== undefined && { longitude: input.longitude }),
          ...(locationChanged && {
            verificationStatus: "PENDING",
            verifiedAt: null,
            verifiedBy: null,
          }),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          address: true,
          city: true,
          region: true,
          country: true,
          latitude: true,
          longitude: true,
          locationId: true,
          logoUrl: true,
          bannerUrl: true,
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
