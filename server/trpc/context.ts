import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit } from "@/lib/middleware/rate-limit";
import { Errors } from "@/server/errors";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export interface TRPCContext {
  user: SessionUser | null;
  prisma: typeof prisma;
  ip: string;
  userAgent: string;
}

export async function createTRPCContext(
  opts: FetchCreateContextFnOptions
): Promise<TRPCContext> {
  const user = await getSessionUser();
  const ip =
    opts.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    opts.req.headers.get("x-real-ip") ??
    "unknown";
  const userAgent = opts.req.headers.get("user-agent") ?? "unknown";

  const rateLimit = await checkRateLimit(ip, "trpc");
  if (!rateLimit.allowed) {
    throw Errors.rateLimited();
  }

  return { user, prisma, ip, userAgent };
}
