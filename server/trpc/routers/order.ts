import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  sellerProcedure,
  adminProcedure,
  withErrorHandling,
} from "@/server/trpc/init";
import * as orderService from "@/server/services/order.service";

const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  region: z.string().min(1),
  postalCode: z.string().optional(),
  country: z.string().default("GH"),
});

export const orderRouter = createTRPCRouter({
  create: protectedProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        shippingAddress: addressSchema,
        fulfillmentLocationId: z.string().uuid().optional(),
        paymentMethod: z.enum([
          "MOBILE_MONEY",
          "CARD",
          "BANK_TRANSFER",
          "CASH_ON_DELIVERY",
        ]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) =>
      orderService.createOrderFromCart(ctx.user.id, input)
    ),

  listBuyer: protectedProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        cursor: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).optional(),
        status: z
          .enum([
            "PENDING",
            "CONFIRMED",
            "PROCESSING",
            "SHIPPED",
            "DELIVERED",
            "COMPLETED",
            "CANCELLED",
            "REFUNDED",
          ])
          .optional(),
      })
    )
    .query(async ({ input, ctx }) =>
      orderService.listOrders(ctx.user.id, "buyer", input)
    ),

  listSeller: sellerProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        cursor: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).optional(),
        status: z
          .enum([
            "PENDING",
            "CONFIRMED",
            "PROCESSING",
            "SHIPPED",
            "DELIVERED",
            "COMPLETED",
            "CANCELLED",
            "REFUNDED",
          ])
          .optional(),
      })
    )
    .query(async ({ input, ctx }) =>
      orderService.listOrders(ctx.user.id, "seller", input)
    ),

  listSellerCustomers: sellerProcedure
    .use(withErrorHandling)
    .query(async ({ ctx }) => orderService.listSellerCustomers(ctx.user.id)),

  updateStatus: sellerProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        orderId: z.string().uuid(),
        status: z.enum([
          "CONFIRMED",
          "PROCESSING",
          "SHIPPED",
          "DELIVERED",
          "COMPLETED",
          "CANCELLED",
        ]),
      })
    )
    .mutation(async ({ input, ctx }) =>
      orderService.updateOrderStatus(
        ctx.user.id,
        input.orderId,
        input.status
      )
    ),

  adminUpdateStatus: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        orderId: z.string().uuid(),
        status: z.enum([
          "CONFIRMED",
          "PROCESSING",
          "SHIPPED",
          "DELIVERED",
          "COMPLETED",
          "CANCELLED",
          "REFUNDED",
        ]),
      })
    )
    .mutation(async ({ input, ctx }) =>
      orderService.updateOrderStatus(
        ctx.user.id,
        input.orderId,
        input.status,
        true
      )
    ),
});
