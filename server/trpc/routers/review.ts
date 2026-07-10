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
    .query(async ({ input, ctx }) =>
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
        rating: z.number().int().min(1).max(5),
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

