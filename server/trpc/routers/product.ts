import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  sellerProcedure,
  withErrorHandling,
} from "@/server/trpc/init";
import * as productService from "@/server/services/product.service";
import { prisma } from "@/lib/db/prisma";

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

  sellerList: sellerProcedure
    .use(withErrorHandling)
    .input(
      z
        .object({
          storeId: z.string().uuid().optional(),
          status: z
            .enum(["DRAFT", "ACTIVE", "OUT_OF_STOCK", "SUSPENDED", "ARCHIVED"])
            .optional(),
          search: z.string().trim().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) =>
      productService.listSellerProducts(ctx.user.id, input ?? {})
    ),

  get: publicProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        id: z.union([z.string().uuid(), z.string().min(1)]),
      })
    )
    .query(async ({ input }) => {
      const raw = input.id;

      // UUIDs stay on the existing fast path (product primary key).
      if (z.string().uuid().safeParse(raw).success) {
        return productService.getProduct(raw);
      }

      // Otherwise treat `id` as product slug.
      return productService.getProductBySlug(raw);
    }),

  categories: publicProcedure
    .use(withErrorHandling)
    .query(async () =>
      prisma.category.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true },
      })
    ),

  create: sellerProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        storeId: z.string().uuid(),
        categoryId: z.string().uuid().optional(),
        title: z.string().min(3).max(300),
        description: z.string().min(10),
        price: z.number().int().min(1),
        comparePrice: z.number().int().min(1).optional(),

        // Backwards compatible: single stock for non-sized products
        stock: z.number().int().min(1),

        // New: size -> quantity variants for sized products.
        // If provided, these quantities will be persisted to ProductSizeInventory.
        sizesQuantities: z
          .array(
            z.object({
              size: z.string().trim().min(1).max(40),
              quantity: z.number().int().min(1).max(99999),
            })
          )
          .optional(),

        images: z.array(z.string().url()).min(1).max(10),
        tags: z.array(z.string()).optional(),
        sku: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return productService.createProduct(ctx.user.id, input);
    }),

  update: sellerProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(3).max(300).optional(),
        description: z.string().min(10).optional(),
        price: z.number().int().min(1).optional(),
        comparePrice: z.number().int().min(1).nullable().optional(),
        stock: z.number().int().min(1).optional(),
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

  updateVariantStocks: sellerProcedure
    .use(withErrorHandling)
    .input(
      z.object({
        productId: z.string().uuid(),
        variants: z.array(
          z.object({
            id: z.string().uuid(),
            quantity: z.number().int().min(0),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return productService.updateVariantStocks(
        ctx.user.id,
        input.productId,
        input.variants
      );
    }),

  delete: sellerProcedure
    .use(withErrorHandling)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await productService.deleteProduct(ctx.user.id, input.id);
      return { success: true };
    }),
});
