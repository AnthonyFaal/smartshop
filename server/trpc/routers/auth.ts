import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  withErrorHandling,
} from "@/server/trpc/init";
import * as authService from "@/server/services/auth.service";
import { prisma } from "@/lib/db/prisma";

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await authService.registerUser({
        ...input,
        userAgent: ctx.userAgent,
        ipAddress: ctx.ip,
      });
      return {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
      };
    }),

  login: publicProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await authService.loginUser({
        ...input,
        userAgent: ctx.userAgent,
        ipAddress: ctx.ip,
      });
      return {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
      };
    }),

  logout: protectedProcedure
    .use(withErrorHandling)
    .mutation(async () => {
      await authService.logoutUser();
      return { success: true };
    }),

  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        phone: true,
        phoneVerified: true,
        verificationLevel: true,
        profile: true,
        subscription: { select: { plan: true, status: true } },
        trustScore: { select: { score: true } },
      },
    });
    return user;
  }),

  sendOtp: protectedProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        phone: z.string().regex(/^\+233[0-9]{9}$/, "Use Ghana format: +233XXXXXXXXX"),
        purpose: z.enum(["PHONE_VERIFICATION", "PASSWORD_RESET", "LOGIN"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await authService.sendOtp({
        phone: input.phone,
        purpose: input.purpose,
        userId: ctx.user.id,
      });
      return { success: true };
    }),

  verifyOtp: protectedProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        phone: z.string(),
        code: z.string().length(6),
        purpose: z.enum(["PHONE_VERIFICATION", "PASSWORD_RESET", "LOGIN"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await authService.verifyOtp({
        ...input,
        userId: ctx.user.id,
      });
      return { success: true };
    }),
});
