import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  withErrorHandling,
} from "@/server/trpc/init";
import * as cartService from "@/server/services/cart.service";

export const cartRouter = createTRPCRouter({
  get: protectedProcedure
    .use(withErrorHandling)
    .query(async ({ ctx }) => cartService.getCart(ctx.user.id)),

  add: protectedProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(99).default(1),
      })
    )
    .mutation(async ({ input, ctx }) =>
      cartService.addToCart(ctx.user.id, input.productId, input.quantity)
    ),

  update: protectedProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        itemId: z.string().uuid(),
        quantity: z.number().int().min(0).max(99),
      })
    )
    .mutation(async ({ input, ctx }) =>
      cartService.updateCartItem(ctx.user.id, input.itemId, input.quantity)
    ),

  remove: protectedProcedure
    .use(withErrorHandling)
    .input(z.object({ itemId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await cartService.removeFromCart(ctx.user.id, input.itemId);
      return { success: true };
    }),

  clear: protectedProcedure
    .use(withErrorHandling)
    .mutation(async ({ ctx }) => {
      await cartService.clearCart(ctx.user.id);
      return { success: true };
    }),
});
