import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  sellerProcedure,
  withErrorHandling,
} from "@/server/trpc/init";
import * as productService from "@/server/services/product.service";

export const productRouter = createTRPCRouter({
  list: publicProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        cursor: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).optional(),
        categoryId: z.string().uuid().optional(),
        storeId: z.string().uuid().optional(),
        search: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        sortBy: z
          .enum(["createdAt", "price", "rating", "soldCount"])
          .optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
      })
    )
    .query(async ({ input }) => productService.listProducts(input)),

  get: publicProcedure
    .use(withErrorHandling)
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => productService.getProduct(input.id)),

  create: sellerProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        storeId: z.string().uuid(),
        categoryId: z.string().uuid().optional(),
        title: z.string().min(3).max(300),
        description: z.string().min(10),
        price: z.number().positive(),
        comparePrice: z.number().positive().optional(),
        stock: z.number().int().min(0),
        images: z.array(z.string().url()).min(1).max(10),
        tags: z.array(z.string()).optional(),
        sku: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { categoryId, ...rest } = input;
      return productService.createProduct(ctx.user.id, {
        ...rest,
        ...(categoryId ? { categoryId } : {}),
      });
    }),

  update: sellerProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(3).max(300).optional(),
        description: z.string().min(10).optional(),
        price: z.number().positive().optional(),
        comparePrice: z.number().positive().nullable().optional(),
        stock: z.number().int().min(0).optional(),
        images: z.array(z.string().url()).optional(),
        tags: z.array(z.string()).optional(),
        status: z
          .enum(["DRAFT", "ACTIVE", "OUT_OF_STOCK", "SUSPENDED", "ARCHIVED"])
          .optional(),
        categoryId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return productService.updateProduct(ctx.user.id, id, data);
    }),

  delete: sellerProcedure
    .use(withErrorHandling)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await productService.deleteProduct(ctx.user.id, input.id);
      return { success: true };
    }),
});
