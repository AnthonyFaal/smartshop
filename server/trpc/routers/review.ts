import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  withErrorHandling,
} from "@/server/trpc/init";

import * as reviewService from "@/server/services/review.service";

export const reviewRouter = createTRPCRouter({
  listProduct: protectedProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        productId: z.string().uuid(),
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      })
    )
    .query(async ({ input}) =>
      reviewService.listProductReviews({
        productId: input.productId,
        cursor: input.cursor,
        limit: input.limit,
      })
    ),

  getMyReview: protectedProcedure
    .use(withErrorHandling)
    .input(z.object({ productId: z.string().uuid() }))
    .query(async ({ input, ctx }) =>
      reviewService.getMyReviewForProduct(ctx.user.id, input.productId)
    ),

  upsertMyReview: protectedProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        productId: z.string().uuid(),

        // Ratings are stored as decimals in DB; UI uses 0.5-step selection.
        // Accept only 0.5 increments to avoid accidental precision issues.
        rating: z
          .number()
          .min(0.5)
          .max(5)
          .refine((n) => Math.round(n * 2) === n * 2, "Rating must be in 0.5 steps"),

        title: z.string().trim().min(2).max(200).optional().nullable(),
        content: z.string().trim().min(3).max(2000).optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) =>
      reviewService.upsertMyReviewForProduct({
        userId: ctx.user.id,
        productId: input.productId,
        rating: input.rating,
        title: input.title,
        content: input.content,
      })
    ),

  deleteMyReview: protectedProcedure
    .use(withErrorHandling)
    .input(z.object({ productId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) =>
      reviewService.deleteMyReview(ctx.user.id, input.productId)
    ),
});

