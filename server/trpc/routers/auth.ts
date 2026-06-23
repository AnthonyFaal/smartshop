import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  withErrorHandling,
} from "@/server/trpc/init";
import * as authService from "@/server/services/auth.service";
import { prisma } from "@/lib/db/prisma";
import { OtpPurpose } from "@prisma/client";

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
        acceptTerms: z.boolean().refine((v) => v, {
          message: "You must accept the Terms of Service",
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { acceptTerms: _, ...registerInput } = input;
      const result = await authService.registerUser({
        ...registerInput,
        userAgent: ctx.userAgent,
        ipAddress: ctx.ip,
      });
      return {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        phone: result.user.phone,
        phoneVerified: result.user.phoneVerified,
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
        emailVerified: true,
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
        phone: z
          .string()
          .regex(/^\+233[0-9]{9}$/, "Use Ghana format: +233XXXXXXXXX"),
        purpose: z.nativeEnum(OtpPurpose),
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
        purpose: z.nativeEnum(OtpPurpose), // Fixed: Fully synced with all 4 schema enums
      })
    )
    .mutation(async ({ input, ctx }) => {
      await authService.verifyOtp({
        phone: input.phone,
        code: input.code,
        purpose: input.purpose,
        userId: ctx.user.id,
      });
      return { success: true };
    }),

  sendEmailVerification: protectedProcedure
    .use(withErrorHandling)
    .mutation(async ({ ctx }) => {
      await authService.sendEmailVerification({
        userId: ctx.user.id,
        email: ctx.user.email,
      });
      return { success: true };
    }),

  // Allow verifying email codes from the public flow (user may be unauthenticated)
  verifyEmailOtp: publicProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        email: z.string().email(),
        code: z.string().length(6),
      })
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.findFirst({ where: { email: input.email.toLowerCase(), deletedAt: null } });
      if (!user) throw new Error("Invalid verification request");

      await authService.verifyOtp({
        phone: input.email,
        code: input.code,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        userId: user.id,
      });
      return { success: true };
    }),

  // Public resend for email verification (does not reveal account existence)
  resendEmailVerification: publicProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const user = await prisma.user.findFirst({ where: { email: input.email.toLowerCase(), deletedAt: null } });
      if (!user) return { success: true };

      await authService.sendEmailVerification({ userId: user.id, email: user.email });
      return { success: true };
    }),

  forgotPassword: publicProcedure
    .use(withErrorHandling)
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      await authService.requestPasswordReset(input.email);
      return {
        success: true,
        message:
          "If an account exists with that email, a reset code has been sent.",
      };
    }),

  resetPassword: publicProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        email: z.string().email(),
        code: z.string().length(6),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      await authService.resetPassword(input);
      return { success: true };
    }),

  resendResetCode: publicProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await authService.resendPasswordResetCode(input.email);
      return result;
    }),

  changePassword: protectedProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await authService.changePassword({
        userId: ctx.user.id,
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
      });
      return { success: true };
    }),
});