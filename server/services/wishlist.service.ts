import { prisma } from "@/lib/db/prisma";
import { Errors } from "@/server/errors";

export async function getOrCreateDefaultWishlist(userId: string) {
  const wishlist = await prisma.wishlist.findFirst({
    where: { userId, isDefault: true },
    select: { id: true, name: true, isDefault: true },
  });

  if (wishlist) return wishlist;

  const created = await prisma.wishlist.create({
    data: { userId, isDefault: true, name: "My Wishlist" },
    select: { id: true, name: true, isDefault: true },
  });

  return created;
}

export async function listMyWishlists(userId: string) {
  return prisma.wishlist.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      isDefault: true,
      createdAt: true,
      items: {
        select: { productId: true },
      },
    },
  }).then((wishlists) =>
    wishlists.map((w) => ({
      id: w.id,
      name: w.name,
      isDefault: w.isDefault,
      createdAt: w.createdAt,
      itemCount: w.items.length,
    }))
  );
}

export async function listWishlistItems(wishlistId: string, userId: string) {
  const wishlist = await prisma.wishlist.findFirst({
    where: { id: wishlistId, userId },
    select: { id: true },
  });

  if (!wishlist) throw Errors.notFound("Wishlist");

  return prisma.wishlistItem.findMany({
    where: { wishlistId },
    include: {
      product: {
        select: {
          id: true,
          sellerId: true,
          storeId: true,
          categoryId: true,
          title: true,
          slug: true,
          price: true,
          comparePrice: true,
          images: true,
          rating: true,
          reviewCount: true,
          stock: true,
          status: true,
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              verificationStatus: true,
            },
          },
        },
      },
    },
  }).then((items) =>
    items.map((i) => ({
      id: i.id,
      wishlistId: i.wishlistId,
      productId: i.productId,
      createdAt: i.createdAt,
      product: i.product,
    }))
  );
}

export async function addProductToWishlist(params: {
  userId: string;
  wishlistId?: string; // if omitted => default wishlist
  productId: string;
}) {
  const { userId, productId } = params;

  const wishlist = params.wishlistId
    ? await prisma.wishlist.findFirst({
        where: { id: params.wishlistId, userId },
        select: { id: true },
      })
    : await getOrCreateDefaultWishlist(userId);

  if (!wishlist) throw Errors.notFound("Wishlist");

  // Ensure product exists and not deleted
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true },
  });
  if (!product) throw Errors.notFound("Product");

  try {
    const created = await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId,
      },
      select: { id: true, createdAt: true },
    });

    return { added: true, wishlistItemId: created.id };
  } catch (e: unknown) {
    // Unique constraint => already exists
    if (typeof e === "object" && e !== null) {
      const maybeCode = (e as { code?: unknown }).code;
      if (maybeCode === "P2002") {
        return { added: false, wishlistItemId: null };
      }
    }
    throw e;
  }
}

export async function removeProductFromWishlist(params: {
  userId: string;
  wishlistId?: string;
  productId: string;
}) {
  const { userId, productId } = params;

  const wishlist = params.wishlistId
    ? await prisma.wishlist.findFirst({
        where: { id: params.wishlistId, userId },
        select: { id: true },
      })
    : await getOrCreateDefaultWishlist(userId);

  if (!wishlist) throw Errors.notFound("Wishlist");

  const res = await prisma.wishlistItem.deleteMany({
    where: { wishlistId: wishlist.id, productId },
  });

  return { removed: res.count > 0 };
}

export async function toggleProductInDefaultWishlist(userId: string, productId: string) {
  const defaultWishlist = await getOrCreateDefaultWishlist(userId);

  const existing = await prisma.wishlistItem.findFirst({
    where: { wishlistId: defaultWishlist.id, productId },
    select: { id: true },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return { toggledOn: false };
  }

  await prisma.wishlistItem.create({
    data: { wishlistId: defaultWishlist.id, productId },
  });

  return { toggledOn: true };
}

