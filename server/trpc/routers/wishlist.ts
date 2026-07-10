import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  withErrorHandling,
} from "@/server/trpc/init";

import * as wishlistService from "@/server/services/wishlist.service";

export const wishlistRouter = createTRPCRouter({
  listMyWishlists: protectedProcedure
    .use(withErrorHandling)
    .query(async ({ ctx }) => wishlistService.listMyWishlists(ctx.user.id)),

  getDefaultWishlist: protectedProcedure
    .use(withErrorHandling)
    .query(async ({ ctx }) => wishlistService.getOrCreateDefaultWishlist(ctx.user.id)),

  getWishlistItems: protectedProcedure
    .use(withErrorHandling)
    .input(z.object({ wishlistId: z.string().uuid().optional() }))
    .query(async ({ input, ctx }) => {
      const defaultWishlist = await wishlistService.getOrCreateDefaultWishlist(ctx.user.id);
      const wishlistId = input.wishlistId ?? defaultWishlist.id;
      return wishlistService.listWishlistItems(wishlistId, ctx.user.id);
    }),

  add: protectedProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        productId: z.string().uuid(),
        wishlistId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input, ctx }) =>
      wishlistService.addProductToWishlist({
        userId: ctx.user.id,
        productId: input.productId,
        wishlistId: input.wishlistId,
      })
    ),

  remove: protectedProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        productId: z.string().uuid(),
        wishlistId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input, ctx }) =>
      wishlistService.removeProductFromWishlist({
        userId: ctx.user.id,
        productId: input.productId,
        // If wishlistId is provided, remove from that specific wishlist.
        // Otherwise, service will remove from the user's default wishlist.
        wishlistId: input.wishlistId,
      })
    ),


  toggleDefault: protectedProcedure
    .use(withErrorHandling)
    .input(z.object({ productId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) =>
      wishlistService.toggleProductInDefaultWishlist(ctx.user.id, input.productId)
    ),
});

