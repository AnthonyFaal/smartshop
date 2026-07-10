import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  withErrorHandling,
} from "@/server/trpc/init";
import { prisma } from "@/lib/db/prisma";

export const locationRouter = createTRPCRouter({
  search: publicProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        query: z.string().trim().min(1),
        limit: z.number().int().min(1).max(20).optional().default(10),
        types: z
          .array(z.enum(["CITY", "TOWN", "AREA", "DISTRICT", "SUBURB", "REGION", "COUNTRY"  ]))
          .optional(),
        country: z.string().optional().default("Ghana"),
      })
    )
    .query(async ({ input }) => {
      const { query, limit, types, country } = input;

      const where = {
        country: country ?? "Ghana",
        name: { contains: query, mode: "insensitive" },
        ...(types && types.length > 0 ? { type: { in: types } } : {}),
      };

      // Prisma expects `mode` to be a specific query-mode literal type.
      const results = await prisma.location.findMany({
        where: {
          ...(where as any),
          name: { contains: query, mode: "insensitive" as const },
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          region: true,
          latitude: true,
          longitude: true,
        },
      });

      return results;
    }),
});

export default locationRouter;
