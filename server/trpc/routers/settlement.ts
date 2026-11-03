import { z } from "zod";
import { adminProcedure, createTRPCRouter, sellerProcedure, withErrorHandling } from "@/server/trpc/init";
import * as settlement from "@/server/services/settlement.service";

export const settlementRouter = createTRPCRouter({
  mine: sellerProcedure.use(withErrorHandling).query(({ ctx }) => settlement.listSellerSettlements(ctx.user.id)),
  operationsQueue: adminProcedure.use(withErrorHandling).query(() => settlement.listOperationsSettlements()),
  markPaid: adminProcedure.use(withErrorHandling)
    .input(z.object({ settlementId: z.string().uuid(), providerRef: z.string().trim().min(3).max(255), note: z.string().trim().max(1000).optional() }))
    .mutation(({ input, ctx }) => settlement.markSettlementPaid(ctx.user.id, input.settlementId, input.providerRef, input.note)),
  block: adminProcedure.use(withErrorHandling)
    .input(z.object({ settlementId: z.string().uuid(), note: z.string().trim().min(5).max(1000) }))
    .mutation(({ input, ctx }) => settlement.blockSettlement(ctx.user.id, input.settlementId, input.note)),
});
