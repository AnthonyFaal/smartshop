import { z } from "zod";
import { createTRPCRouter, sellerProcedure, withErrorHandling } from "@/server/trpc/init";
import * as promotionService from "@/server/services/promotion.service";

const input = z.object({
  storeId: z.string().uuid(), name: z.string().trim().min(2).max(120), code: z.string().trim().min(3).max(40),
  type: z.enum(["PERCENTAGE", "FIXED"]), value: z.number().positive(), minSubtotal: z.number().min(0).optional(),
  maxDiscount: z.number().positive().optional(), startsAt: z.coerce.date(), endsAt: z.coerce.date(),
  usageLimit: z.number().int().positive().optional(), productIds: z.array(z.string().uuid()).min(1),
});

export const promotionRouter = createTRPCRouter({
  create: sellerProcedure.use(withErrorHandling).input(input).mutation(({ input, ctx }) => promotionService.createPromotion(ctx.user.id, input)),
  list: sellerProcedure.use(withErrorHandling).input(z.object({ storeId: z.string().uuid().optional() }).optional()).query(({ input, ctx }) => promotionService.listPromotions(ctx.user.id, input?.storeId)),
  update: sellerProcedure.use(withErrorHandling).input(input.extend({ id: z.string().uuid() })).mutation(({ input, ctx }) => promotionService.updatePromotion(ctx.user.id, input)),
  deactivate: sellerProcedure.use(withErrorHandling).input(z.object({ id: z.string().uuid() })).mutation(({ input, ctx }) => promotionService.deactivatePromotion(ctx.user.id, input.id)),
  analytics: sellerProcedure.use(withErrorHandling).input(z.object({ promotionId: z.string().uuid() })).query(({ input, ctx }) => promotionService.promotionAnalytics(ctx.user.id, input.promotionId)),
});
