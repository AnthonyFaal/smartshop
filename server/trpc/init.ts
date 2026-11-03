import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TRPCContext } from "@/server/trpc/context";
import type { UserRole } from "@prisma/client";
import { toTRPCError } from "@/server/errors";

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in to continue." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const enforceRole = (...roles: UserRole[]) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in to continue." });
    }
    if (!roles.includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You don’t have permission to perform this action." });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  });

export const protectedProcedure = t.procedure.use(enforceAuth);
export const sellerProcedure = t.procedure.use(enforceRole("SELLER", "ADMIN"));
export const runnerProcedure = t.procedure.use(enforceRole("RUNNER", "ADMIN"));
export const adminProcedure = t.procedure.use(enforceRole("ADMIN"));

export const withErrorHandling = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    throw toTRPCError(error);
  }
});
