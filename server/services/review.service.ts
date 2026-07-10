import { prisma } from "@/lib/db/prisma";
import { Errors } from "@/server/errors";

export async function listProductReviews(input: {
  productId: string;
  cursor?: string;
  limit?: number;
}) {
  const limit = Math.min(input.limit ?? 10, 50);

  const product = await prisma.product.findFirst({
    where: { id: input.productId, deletedAt: null },
    select: { id: true },
  });

  if (!product) throw Errors.notFound("Product");

  const reviews = await prisma.review.findMany({
    where: { productId: input.productId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(input.cursor && {
      cursor: { id: input.cursor },
      skip: 1,
    }),
    select: {
      id: true,
      userId: true,
      rating: true,
      title: true,
      content: true,
      isVerified: true,
      createdAt: true,
      user: { select: { id: true, profile: { select: { displayName: true } } } },
      store: { select: { id: true, name: true } },
    },
  });

  let nextCursor: string | undefined;
  if (reviews.length > limit) {
    const next = reviews.pop();
    nextCursor = next?.id;
  }

  return {
    reviews: reviews.map((r) => ({
      id: r.id,
      productId: input.productId,
      rating: r.rating,
      title: r.title,
      content: r.content,
      isVerified: r.isVerified,
      createdAt: r.createdAt,
      user: {
        id: r.userId,
        displayName: r.user.profile?.displayName ?? null,
      },
      store: r.store ? { id: r.store.id, name: r.store.name } : null,
    })),
    nextCursor,
  };
}

export async function getMyReviewForProduct(userId: string, productId: string) {
  return prisma.review.findFirst({
    where: { userId, productId, deletedAt: null },
    select: {
      id: true,
      rating: true,
      title: true,
      content: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

function computeVerifiedFlag(_args: {
  userId: string;
  productId: string;
}) {
  // Conservative default: keep unverified unless business rule is known.
  // The schema already includes `isVerified`, so we can enhance later.
  return false;
}

export async function upsertMyReviewForProduct(params: {
  userId: string;
  productId: string;
  rating: number;
  title?: string | null;
  content?: string | null;
}) {
  const { userId, productId, rating, title, content } = params;

  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, storeId: true },
  });

  if (!product) throw Errors.notFound("Product");

  const isVerified = computeVerifiedFlag({ userId, productId });

  // Prefer update if exists, else create.
  const existing = await prisma.review.findFirst({
    where: { userId, productId, deletedAt: null },
    select: { id: true },
  });

  if (existing) {
    const updated = await prisma.review.update({
      where: { id: existing.id },
      data: {
        rating,
        title: title ?? null,
        content: content ?? null,
        isVerified,
      },
      select: { id: true, rating: true, title: true, content: true, isVerified: true },
    });

    // Recompute aggregates based on all non-deleted reviews.
    const agg = await prisma.review.aggregate({
      _avg: { rating: true },
      _count: { id: true },
      where: { productId, deletedAt: null },
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: (agg._avg.rating ?? 0) as any,
        reviewCount: agg._count.id,
      },
    });

    return updated;
  }

  const created = await prisma.review.create({
    data: {
      userId,
      productId,
      storeId: product.storeId,
      orderId: null,
      rating,
      title: title ?? null,
      content: content ?? null,
      isVerified,
    },
    select: { id: true, rating: true, title: true, content: true, isVerified: true },
  });

  const agg = await prisma.review.aggregate({
    _avg: { rating: true },
    _count: { id: true },
    where: { productId, deletedAt: null },
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: (agg._avg.rating ?? 0) as any,
      reviewCount: agg._count.id,
    },
  });

  return created;
}

export async function deleteMyReview(userId: string, productId: string) {
  const existing = await prisma.review.findFirst({
    where: { userId, productId, deletedAt: null },
    select: { id: true },
  });

  if (!existing) throw Errors.notFound("Review");

  await prisma.review.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
  });

  const agg = await prisma.review.aggregate({
    _avg: { rating: true },
    _count: { id: true },
    where: { productId, deletedAt: null },
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: (agg._avg.rating ?? 0) as any,
      reviewCount: agg._count.id,
    },
  });

  return { deleted: true };
}

