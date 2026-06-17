import { prisma } from "@/lib/db/prisma";
import { getSessionUser } from "@/lib/auth/session";

export async function getAuthUserForClient() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;

  return prisma.user.findUnique({
    where: { id: sessionUser.id },
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
}

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getAuthUserForClient>>>;
