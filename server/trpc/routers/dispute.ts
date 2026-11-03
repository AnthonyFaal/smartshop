import { z } from "zod";
import { adminProcedure, createTRPCRouter, protectedProcedure, withErrorHandling } from "@/server/trpc/init";
import * as disputes from "@/server/services/dispute.service";

export const disputeRouter = createTRPCRouter({
  mine: protectedProcedure.use(withErrorHandling).query(({ ctx }) => disputes.listBuyerDisputes(ctx.user.id)),
  open: protectedProcedure.use(withErrorHandling)
    .input(z.object({ orderId: z.string().uuid(), reason: z.string().trim().min(10).max(2_000) }))
    .mutation(({ ctx, input }) => disputes.openDispute({ buyerId: ctx.user.id, ...input })),
  resolve: adminProcedure.use(withErrorHandling)
    .input(z.object({ disputeId: z.string().uuid(), outcome: z.enum(["RESOLVED_BUYER", "RESOLVED_SELLER", "CLOSED"]), resolution: z.string().trim().min(10).max(2_000) }))
    .mutation(({ ctx, input }) => disputes.resolveDispute({ adminId: ctx.user.id, ...input })),
});
