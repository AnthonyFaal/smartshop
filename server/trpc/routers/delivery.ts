import { z } from "zod";
import { adminProcedure, createTRPCRouter, protectedProcedure, withErrorHandling } from "@/server/trpc/init";
import * as delivery from "@/server/services/delivery.service";

export const deliveryRouter = createTRPCRouter({
  quote: protectedProcedure.use(withErrorHandling)
    .input(z.object({ fulfillmentMethod: z.enum(["PICKUP", "CAMPUS_DELIVERY"]), locationId: z.string().uuid().optional() }))
    .query(({ input }) => delivery.getFulfillmentQuote(input.fulfillmentMethod, input.locationId)),
  operationsQueue: adminProcedure.use(withErrorHandling).query(() => delivery.listOperationsQueue()),
  updateTask: adminProcedure.use(withErrorHandling)
    .input(z.object({ taskId: z.string().uuid(), status: z.enum(["ASSIGNED", "PICKED_UP", "DELIVERED", "FAILED", "CANCELLED"]), runnerId: z.string().uuid().optional(), proofUrl: z.string().url().max(2048).optional(), handoffCode: z.string().trim().min(4).max(16).optional() }))
    .mutation(({ input, ctx }) => delivery.updateDeliveryTask(ctx.user.id, input.taskId, input.status, input.runnerId, input.proofUrl, input.handoffCode)),
});
