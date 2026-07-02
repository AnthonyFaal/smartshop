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
          isVerified: true,
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

      const slug = await createUniqueStoreSlug(input.name);

      return prisma.store.create({
        data: {
          ownerId: ctx.user.id,
          name: input.name,
          slug,
          description: input.description || null,
          isVerified: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isActive: true,
          isVerified: true,
          productCount: true,
          followerCount: true,
          createdAt: true,
        },
      });
    }),
});

export default storeRouter;
