import { prisma } from "@/lib/db/prisma";
import { Errors } from "@/server/errors";

export async function getCart(userId: string) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              images: true,
              stock: true,
              status: true,
              slug: true,
              variants: {
                select: { size: true, quantity: true },
              },
              store: { select: { name: true, slug: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                images: true,
                stock: true,
                status: true,
                slug: true,
                store: { select: { name: true, slug: true } },
              },
            },
          },
        },
      },
    });
  }

  return cart;
}

export async function addToCart(
  userId: string,
  productId: string,
  items: Array<{ quantity: number; selectedSize?: string }>
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, status: "ACTIVE", deletedAt: null },
    include: { variants: true },
  });

  if (!product) throw Errors.notFound("Product");

  return await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    for (const item of items) {
      const qty = item.quantity;
      const size = item.selectedSize?.trim() ?? "";
      
      const variants = product.variants as Array<{ size: string; quantity: number }>;
      const hasVariants = variants.length > 0;

      // Validation
      if (hasVariants) {
        if (!size) throw Errors.badRequest("Select a size");
        const inv = variants.find((x) => x.size === size);
        if (!inv || inv.quantity < qty) throw Errors.badRequest(`Insufficient stock for ${size}`);
      } else if (product.stock < qty) {
        throw Errors.badRequest("Insufficient stock");
      }

      // Upsert logic (Requires unique index on [cartId, productId, selectedSize])
      await tx.cartItem.upsert({
        where: {
          cartId_productId_selectedSize: { cartId: cart.id, productId, selectedSize: size },
        },
        create: { cartId: cart.id, productId, quantity: qty, selectedSize: size },
        update: { quantity: { increment: qty } },
      });
    }
  });
}

export async function updateCartItem(
  userId: string,
  itemId: string,
  quantity: number
) {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    include: { product: true },
  });
  if (!item) throw Errors.notFound("Cart item");
  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
    return null;
  }
  // If this product has per-size variants, validate against selectedSize inventory.
  // CartItem always stores selectedSize (default ""), so we use it when available.
  const variants = (item.product as { variants?: Array<{ size: string; quantity: number }> })
    .variants;

  const productHasVariants = Array.isArray(variants) && variants.length > 0;

  if (productHasVariants) {
    const normalizedSize = (item.selectedSize ?? "").trim();

    if (normalizedSize) {
      const inv = variants?.find((x) => x.size === normalizedSize);
      const availableQty = inv?.quantity ?? 0;

      if (availableQty < quantity) {
        throw Errors.badRequest("Insufficient stock");
      }
    } else {
      // Defensive fallback: if selectedSize is missing, fallback to global stock.
      if (item.product.stock < quantity) {
        throw Errors.badRequest("Insufficient stock");
      }
    }
  } else {
    if (item.product.stock < quantity) {
      throw Errors.badRequest("Insufficient stock");
    }
  }
  return prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  });
}

export async function removeFromCart(
  userId: string,
  itemId: string
): Promise<void> {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
  });
  if (!item) throw Errors.notFound("Cart item");
  await prisma.cartItem.delete({ where: { id: itemId } });
}

export async function clearCart(userId: string): Promise<void> {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
}
