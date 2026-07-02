import { prisma } from "@/lib/db/prisma";
import { redis, cacheKeys, cacheGet, cacheSet, cacheDelete } from "@/lib/redis/client";
import { slugify } from "@/lib/utils/format";
import { Errors } from "@/server/errors";
import { getPlanLimits } from "@/lib/config/subscriptions";
import type { ProductStatus, Prisma } from "@prisma/client";

const PRODUCT_CACHE_TTL = 300;

export interface ProductListInput {
  cursor?: string;
  limit?: number;
  categoryId?: string;
  storeId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "createdAt" | "price" | "rating" | "soldCount";
  sortOrder?: "asc" | "desc";
}

export async function listProducts(input: ProductListInput) {
  const limit = Math.min(input.limit ?? 20, 50);
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    deletedAt: null,
    ...(input.categoryId && { categoryId: input.categoryId }),
    ...(input.storeId && { storeId: input.storeId }),
    ...(input.search && {
      OR: [
        { title: { contains: input.search, mode: "insensitive" } },
        { description: { contains: input.search, mode: "insensitive" } },
        { tags: { has: input.search.toLowerCase() } },
      ],
    }),
    ...(input.minPrice !== undefined && { price: { gte: input.minPrice } }),
    ...(input.maxPrice !== undefined && { price: { lte: input.maxPrice } }),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput = {
    [input.sortBy ?? "createdAt"]: input.sortOrder ?? "desc",
  };

  const products = await prisma.product.findMany({
    where,
    take: limit + 1,
    ...(input.cursor && {
      cursor: { id: input.cursor },
      skip: 1,
    }),
    orderBy,
    include: {
      store: { select: { id: true, name: true, slug: true, logoUrl: true, isVerified: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  let nextCursor: string | undefined;
  if (products.length > limit) {
    const next = products.pop();
    nextCursor = next?.id;
  }

  return { products, nextCursor };
}

export async function getProduct(id: string) {
  const cached = await cacheGet<Awaited<ReturnType<typeof fetchProduct>>>(
    cacheKeys.product(id)
  );
  if (cached) return cached;

  const product = await fetchProduct(id);
  if (product) {
    await cacheSet(cacheKeys.product(id), product, PRODUCT_CACHE_TTL);
  }
  return product;
}

async function fetchProduct(id: string) {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          isVerified: true,
          rating: true,
          reviewCount: true,
          ownerId: true,
        },
      },
      category: { select: { id: true, name: true, slug: true } },
      seller: {
        select: {
          id: true,
          verificationLevel: true,
          trustScore: { select: { score: true } },
        },
      },
    },
  });

  if (product && product.status === "ACTIVE") {
    await prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  return product;
}

export async function createProduct(
  sellerId: string,
  input: {
    storeId: string;
    categoryId: string;
    title: string;
    description: string;
    price: number;
    comparePrice?: number;
    stock: number;
    images: string[];
    tags?: string[];
    sku?: string;
  }
) {
  const store = await prisma.store.findFirst({
    where: { id: input.storeId, ownerId: sellerId, deletedAt: null },
  });
  if (!store) throw Errors.notFound("Store");

  const subscription = await prisma.subscription.findUnique({
    where: { userId: sellerId },
  });
  const limits = getPlanLimits(subscription?.plan ?? "FREE");

  const productCount = await prisma.product.count({
    where: { sellerId, deletedAt: null },
  });

  if (limits.maxProducts !== null && productCount >= limits.maxProducts) {
    throw Errors.subscriptionLimit(
      `Your plan allows a maximum of ${limits.maxProducts} products. Upgrade to add more.`
    );
  }

  const baseSlug = slugify(input.title);
  let slug = baseSlug;
  let attempt = 0;
  while (
    await prisma.product.findFirst({
      where: { storeId: input.storeId, slug },
    })
  ) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        sellerId,
        storeId: input.storeId,
        categoryId: input.categoryId,
        title: input.title,
        slug,
        description: input.description,
        price: input.price,
        comparePrice: input.comparePrice,
        stock: input.stock,
        images: input.images,
        tags: input.tags ?? [],
        sku: input.sku,
        status: input.stock > 0 ? "ACTIVE" : "OUT_OF_STOCK",
      },
    });

    await tx.store.update({
      where: { id: input.storeId },
      data: { productCount: { increment: 1 } },
    });

    return created;
  });

  return product;
}

export async function updateProduct(
  sellerId: string,
  productId: string,
  input: Partial<{
    title: string;
    description: string;
    price: number;
    comparePrice: number | null;
    stock: number;
    images: string[];
    tags: string[];
    status: ProductStatus;
    categoryId: string;
  }>
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, sellerId, deletedAt: null },
  });
  if (!product) throw Errors.notFound("Product");

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      ...input,
      ...(input.stock !== undefined && {
        status: input.stock > 0 ? input.status ?? "ACTIVE" : "OUT_OF_STOCK",
      }),
    },
  });

  await cacheDelete(cacheKeys.product(productId));
  return updated;
}

export async function deleteProduct(
  sellerId: string,
  productId: string
): Promise<void> {
  const product = await prisma.product.findFirst({
    where: { id: productId, sellerId, deletedAt: null },
  });
  if (!product) throw Errors.notFound("Product");

  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    }),
    prisma.store.update({
      where: { id: product.storeId },
      data: { productCount: { decrement: 1 } },
    }),
  ]);

  await cacheDelete(cacheKeys.product(productId));
}
