import { prisma } from "@/lib/db/prisma";
import { cacheKeys, cacheGet, cacheSet, cacheDelete } from "@/lib/redis/client";
import { slugify } from "@/lib/utils/format";
import { Errors } from "@/server/errors";
import { getPlanLimits } from "@/lib/config/subscriptions";
import type { ProductStatus, Prisma } from "@prisma/client";

const PRODUCT_CACHE_TTL = 300;

function assertNonNegativeInt(value: number, fieldName: string) {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw Errors.badRequest(`${fieldName} must be a non-negative integer`);
  }
}

function assertPositiveInt(value: number, fieldName: string) {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    throw Errors.badRequest(`${fieldName} must be a positive integer (>= 1)`);
  }
}

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
      store: { select: { id: true, name: true, slug: true, logoUrl: true, verificationStatus: true } },
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

export async function listSellerProducts(
  sellerId: string,
  input: {
    storeId?: string;
    status?: ProductStatus;
    search?: string;
  } = {}
) {
  // Seller inventory list must be variant-aware.
  // If a product has variants (ProductVariant rows), we show effectiveStock = sum(quantity)
  // and allow updates via those variants (not product.stock).
  const products = await prisma.product.findMany({
    where: {
      sellerId,
      deletedAt: null,
      ...(input.storeId && { storeId: input.storeId }),
      ...(input.status && { status: input.status }),
      ...(input.search && {
        OR: [
          { title: { contains: input.search, mode: "insensitive" } },
          { sku: { contains: input.search, mode: "insensitive" } },
          { store: { name: { contains: input.search, mode: "insensitive" } } },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      comparePrice: true,
      stock: true,
      status: true,
      images: true,
      sku: true,
      viewCount: true,
      soldCount: true,
      rating: true,
      reviewCount: true,
      createdAt: true,
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      variants: {
        select: {
          id: true,
          size: true,
          quantity: true,
          createdAt: true,
        },
      },
    },
  });

  return products.map((p) => {
    const hasVariants = (p.variants?.length ?? 0) > 0;
    const effectiveStock = hasVariants
      ? (p.variants ?? []).reduce((sum, v) => sum + v.quantity, 0)
      : p.stock;

    return {
      ...p,
      effectiveStock,
      variants: hasVariants ? p.variants : [],
    };
  });
}

export async function getProduct(id: string) {
  const cached = await cacheGet<
    Awaited<ReturnType<typeof fetchProductById>>
  >(cacheKeys.product(id));
  if (cached) return cached;

  const product = await fetchProductById(id);
  if (product) {
    await cacheSet(cacheKeys.product(id), product, PRODUCT_CACHE_TTL);
  }
  return product;
}

export async function getProductBySlug(slug: string) {
  // Reuse the same cached shape but key it by slug.
  // cacheKeys.product(...) already uses a string; this is safe as long as
  // we don't mix UUID and slug under the same key accidentally.
  const cacheKey = `product:slug:${slug}`;
  const cached = await cacheGet<Awaited<ReturnType<typeof fetchProductBySlug>>>(
    cacheKey
  );
  if (cached) return cached;

  const product = await fetchProductBySlug(slug);
  if (product) {
    await cacheSet(cacheKey, product, PRODUCT_CACHE_TTL);
  }
  return product;
}

async function fetchProductById(id: string) {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          verificationStatus: true,
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

  if (!product) return null;

  return buildProductWithVariants({
    product,
    productId: id,
  });
}

async function fetchProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, deletedAt: null },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          verificationStatus: true,
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
      where: { id: product.id },
      data: { viewCount: { increment: 1 } },
    });
  }

  if (!product) return null;

  return buildProductWithVariants({
    product,
    productId: product.id,
  });
}

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    store: {
      select: {
        id: true;
        name: true;
        slug: true;
        logoUrl: true;
        verificationStatus: true;
        rating: true;
        reviewCount: true;
        ownerId: true;
      };
    };
    category: { select: { id: true; name: true; slug: true } };
    seller: {
      select: {
        id: true;
        verificationLevel: true;
        trustScore: { select: { score: true } };
      };
    };
  };
}>;

async function buildProductWithVariants(args: {
  product: ProductWithRelations;
  productId: string;
}) {
  const { product, productId } = args;

  const productVariants = await prisma.productVariant.findMany({
    where: { productId },
    select: { size: true, quantity: true },
    orderBy: { createdAt: "asc" },
  });

  const hasVariants = productVariants.length > 0;
  const effectiveStock = hasVariants
    ? productVariants.reduce((sum: number, v) => sum + v.quantity, 0)
    : product.stock;

  return {
    ...product,
    variants: hasVariants ? productVariants : [],
    effectiveStock,
    // Keep `stock` as stored in DB; UI should use effectiveStock.
  };
}

export async function createProduct(
  sellerId: string,
  input: {
    storeId: string;
    categoryId?: string;
    title: string;
    description: string;
    price: number;
    comparePrice?: number;
    stock: number;
    sizesQuantities?: Array<{ size: string; quantity: number }>;
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

  const resolvedCategoryId = input.categoryId
    ? input.categoryId
    : (await prisma.category.findFirst({
        orderBy: { sortOrder: "asc" },
        select: { id: true },
      }))?.id;

  if (!resolvedCategoryId) {
    throw Errors.badRequest("No product category is available yet.");
  }

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
    const normalizedSizesQuantities = (input.sizesQuantities ?? [])
      .map((sq) => ({
        size: sq.size.trim(),
        quantity: sq.quantity,
      }))
      .filter((v) => v.size.length > 0);

    // Variant-mode switch is strict and mutually exclusive:
    // - if seller indicates variants (sizesQuantities provided and non-empty), require >= 1 variant entry.
    // - in variant-mode, product.stock must be 0 and variants are the only source of inventory.
    // - if seller indicates no variants (sizesQuantities absent/empty), reject any variant data and use product.stock only.
    const isVariantMode = (input.sizesQuantities?.length ?? 0) > 0;

    if (isVariantMode) {
      if (normalizedSizesQuantities.length < 1) {
        throw Errors.badRequest(
          "Variant-based products require at least one valid variant entry (size + stock)."
        );
      }

      for (const v of normalizedSizesQuantities) {
        assertPositiveInt(v.quantity, `variant stock for size "${v.size}"`);
      }

      const totalVariantStock = normalizedSizesQuantities.reduce(
        (sum: number, v) => sum + v.quantity,
        0
      );

      // Important: Prisma relation field name is `variants` on Product,
      // and ProductVariant has columns: `size` and `stock`.
      const created = await tx.product.create({
        data: {
          sellerId,
          storeId: input.storeId,
          categoryId: resolvedCategoryId,
          title: input.title,
          slug,
          description: input.description,
          price: input.price,
          comparePrice: input.comparePrice,
          // Product-level stock is not used in variant mode.
          stock: 0,
          images: input.images,
          tags: input.tags ?? [],
          sku: input.sku,
          status: totalVariantStock > 0 ? "ACTIVE" : "OUT_OF_STOCK",
        },
      });

      // Create variant rows for variant-based inventory.
      // Use direct prisma delegate (transaction-safety relies on outer $transaction).
      await tx.productVariant.createMany({
        data: normalizedSizesQuantities.map((v) => ({
          productId: created.id,
          size: v.size,
          quantity: v.quantity,
        })),
      });

      await tx.store.update({
        where: { id: input.storeId },
        data: { productCount: { increment: 1 } },
      });

      return created;
    } else {
      // Simple mode: must not create variants, must use product.stock only.
      assertPositiveInt(input.stock, "stock");

      const hasAnyVariantData =
        (input.sizesQuantities?.length ?? 0) > 0 &&
        (input.sizesQuantities ?? []).some(
          (x) => String(x.size).trim().length > 0
        );

      if (hasAnyVariantData) {
        throw Errors.badRequest(
          "Simple products cannot include variants. Remove variant data (sizesQuantities)."
        );
      }

      const created = await tx.product.create({
        data: {
          sellerId,
          storeId: input.storeId,
          categoryId: resolvedCategoryId,
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
    }
  });

  return product;
}

export function computeUpdatedPriceAndCompare(args: {
  currentPrice: number;
  newPrice: number;
  currentComparePrice: number | null | undefined;
  // comparePrice is not used as history; it's only a function of discount logic.
}): { updatedPrice: number; updatedComparePrice: number | null } {
  const { currentPrice, newPrice } = args;

  // Rule 1: Always set updatedPrice = newPrice
  const updatedPrice = newPrice;

  // Rule 2/3 + edge-cases:
  // comparePrice ONLY used to show discount.
  // - If newPrice < currentPrice => updatedComparePrice = currentPrice
  // - else (>=) => clear compare price (null)
  const updatedComparePrice = newPrice < currentPrice ? currentPrice : null;

  return { updatedPrice, updatedComparePrice };
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

  const variantCount = await prisma.productVariant.count({
    where: { productId },
  });

  const productHasVariants = variantCount > 0;

  // Inventory mode immutability:
  // - Variant-based products must never accept stock changes on product.stock (or imply a mode switch).
  // - Simple products must never accept a transition to variant inventory (not possible here since update input has no variants).
  if (productHasVariants) {
    if (input.stock !== undefined) {
      throw Errors.badRequest(
        "Variant-based products are inventory-controlled by variants; product stock cannot be updated."
      );
    }
  } else {
    // Simple mode: product.stock updates are allowed.
    // No variant-mode data is accepted via this endpoint (variants are not part of input).
  }

  const priceUpdate =
    input.price !== undefined
      ? computeUpdatedPriceAndCompare({
          currentPrice: Number(product.price),
          newPrice: input.price,
          currentComparePrice: product.comparePrice
            ? Number(product.comparePrice)
            : null,
        })
      : null;

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      // IMPORTANT: if `price` is being updated, we ignore any caller-provided `comparePrice`
      // and deterministically compute it using the discount rules.
      ...(priceUpdate
        ? {
            price: priceUpdate.updatedPrice,
            comparePrice: priceUpdate.updatedComparePrice,
          }
        : input),
      // If caller explicitly sets status, respect it.
      ...(input.status !== undefined ? { status: input.status } : null),
      // If caller updates product.stock in simple mode, maintain simple status derivation.
      ...(input.stock !== undefined && {
        status: input.stock > 0
          ? input.status ?? "ACTIVE"
          : "OUT_OF_STOCK",
      }),
    },
  });

  await cacheDelete(cacheKeys.product(productId));
  return updated;
}

export async function updateVariantStocks(
  sellerId: string,
  productId: string,
  input: Array<{ id: string; quantity: number }>
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, sellerId, deletedAt: null },
    select: { id: true },
  });
  if (!product) throw Errors.notFound("Product");

  const variantCount = await prisma.productVariant.count({
    where: { productId },
  });

  if (variantCount === 0) {
    throw Errors.badRequest(
      "This product does not have variants; variant stock cannot be updated."
    );
  }

  // Validate and normalize
  const normalized = input.map((v) => ({
    id: v.id,
    quantity: v.quantity,
  }));

  for (const v of normalized) {
    assertNonNegativeInt(v.quantity, "variant quantity");
  }

  const providedIds = normalized.map((v) => v.id);

  // Ensure all provided variants belong to the product
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: providedIds }, productId },
    select: { id: true },
  });

  const foundIds = new Set(variants.map((v) => v.id));
  const missing = providedIds.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw Errors.badRequest(
      "One or more variants do not belong to this product."
    );
  }

  // Update quantities
  await prisma.productVariant.updateMany({
    // Prisma updateMany doesn't support per-row values, so do sequential updates.
    // Kept small since inventory edits are per-variant.
     
    where: { id: { in: providedIds } },
    data: { quantity: 0 },
  });

  // Above can't set differing quantities; redo with per-variant updates in transaction-like fashion.
  // We do per-row updates to ensure correctness.
  for (const v of normalized) {
    await prisma.productVariant.update({
      where: { id: v.id },
      data: { quantity: v.quantity },
    });
  }

  const totalQuantity = await prisma.productVariant.aggregate({
    where: { productId },
    _sum: { quantity: true },
  });

  const sum = totalQuantity._sum.quantity ?? 0;

  const newStatus: ProductStatus = sum > 0 ? "ACTIVE" : "OUT_OF_STOCK";

  await prisma.product.update({
    where: { id: productId },
    data: { status: newStatus },
  });

  await cacheDelete(cacheKeys.product(productId));
  return { productId, totalQuantity: sum, status: newStatus };
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
