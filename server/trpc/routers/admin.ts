import { z } from "zod";
import {
  createTRPCRouter,
  adminProcedure,
  withErrorHandling,
} from "@/server/trpc/init";
import { prisma } from "@/lib/db/prisma";
import { Errors } from "@/server/errors";
import { calculateTrustScore } from "@/server/services/trust.service";
import { createNotification } from "@/lib/notifications/service";

export const adminRouter = createTRPCRouter({
  dashboard: adminProcedure.use(withErrorHandling).query(async () => {
    const [
      totalUsers,
      totalSellers,
      pendingVerifications,
      totalProducts,
      totalOrders,
      openDisputes,
      revenue,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { role: "SELLER", deletedAt: null } }),
      prisma.sellerVerification.count({ where: { status: "PENDING" } }),
      prisma.product.count({ where: { deletedAt: null, status: "ACTIVE" } }),
      prisma.order.count(),
      prisma.dispute.count({ where: { status: "OPEN" } }),
      prisma.payment.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalUsers,
      totalSellers,
      pendingVerifications,
      totalProducts,
      totalOrders,
      openDisputes,
      totalRevenue: revenue._sum.amount ?? 0,
    };
  }),

  sellerQueue: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        status: z
          .enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"])
          .optional(),
        cursor: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).optional(),
      })
    )
    .query(async ({ input }) => {
      const limit = input.limit ?? 20;
      const items = await prisma.sellerVerification.findMany({
        where: input.status ? { status: input.status } : undefined,
        take: limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              profile: true,
              trustScore: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  approveSeller: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        verificationId: z.string().uuid(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const verification = await prisma.sellerVerification.findUnique({
        where: { id: input.verificationId },
      });
      if (!verification) throw Errors.notFound("Verification");

      await prisma.$transaction([
        prisma.sellerVerification.update({
          where: { id: input.verificationId },
          data: {
            status: "APPROVED",
            reviewedBy: ctx.user.id,
            reviewedAt: new Date(),
            notes: input.notes,
          },
        }),
        prisma.user.update({
          where: { id: verification.userId },
          data: {
            role: "SELLER",
            verificationLevel: "TRUSTED_SELLER",
          },
        }),
      ]);

      await calculateTrustScore(verification.userId);

      await createNotification({
        userId: verification.userId,
        type: "VERIFICATION",
        title: "Seller Verification Approved",
        body: "Congratulations! Your seller account has been approved.",
        channels: ["IN_APP", "EMAIL", "SMS"],
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "APPROVE",
          entityType: "SellerVerification",
          entityId: input.verificationId,
        },
      });

      return { success: true };
    }),

  rejectSeller: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        verificationId: z.string().uuid(),
        reason: z.string().min(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const verification = await prisma.sellerVerification.findUnique({
        where: { id: input.verificationId },
      });
      if (!verification) throw Errors.notFound("Verification");

      await prisma.sellerVerification.update({
        where: { id: input.verificationId },
        data: {
          status: "REJECTED",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          rejectionReason: input.reason,
        },
      });

      await createNotification({
        userId: verification.userId,
        type: "VERIFICATION",
        title: "Seller Verification Rejected",
        body: input.reason,
        channels: ["IN_APP", "EMAIL"],
      });

      return { success: true };
    }),

  suspendUser: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        userId: z.string().uuid(),
        reason: z.string().min(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await prisma.user.update({
        where: { id: input.userId },
        data: {
          isSuspended: true,
          suspendedAt: new Date(),
          suspendedReason: input.reason,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: "SUSPEND",
          entityType: "User",
          entityId: input.userId,
          newValues: { reason: input.reason },
        },
      });

      return { success: true };
    }),

  moderateProduct: adminProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        productId: z.string().uuid(),
        action: z.enum(["SUSPEND", "ACTIVATE", "ARCHIVE"]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const statusMap = {
        SUSPEND: "SUSPENDED" as const,
        ACTIVATE: "ACTIVE" as const,
        ARCHIVE: "ARCHIVED" as const,
      };

      await prisma.product.update({
        where: { id: input.productId },
        data: { status: statusMap[input.action] },
      });

      await prisma.auditLog.create({
        data: {
          userId: ctx.user.id,
          action: input.action === "ACTIVATE" ? "UPDATE" : "SUSPEND",
          entityType: "Product",
          entityId: input.productId,
          newValues: { action: input.action, reason: input.reason },
        },
      });

      return { success: true };
    }),
});
