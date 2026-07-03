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
              sizes: true,
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
                sizes: true,
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
  quantity = 1,
  selectedSize = ""
) {
  const product = (await prisma.product.findFirst({
    where: { id: productId, status: "ACTIVE", deletedAt: null },
    select: {
      stock: true,
      sizes: true,
    },
  })) as { stock: number; sizes: string[] } | null;
  if (!product) throw Errors.notFound("Product");
  if (product.stock < quantity) {
    throw Errors.badRequest("Insufficient stock");
  }
  const normalizedSize = selectedSize.trim();
  const sizes = product.sizes;
  if (sizes.length > 0 && !normalizedSize) {
    throw Errors.badRequest(
      "Select a size before adding this product to cart"
    );
  }
  if (normalizedSize && !sizes.includes(normalizedSize)) {
    throw Errors.badRequest("Selected size is not available for this product");
  }

  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const existing = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId,
      selectedSize: normalizedSize,
    },
  });

  if (existing) {
    const newQty = existing.quantity + quantity;
    if (product.stock < newQty) {
      throw Errors.badRequest("Insufficient stock");
    }
    return prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: newQty },
    });
  }

  return prisma.cartItem.create({
    data: { cartId: cart.id, productId, quantity, selectedSize: normalizedSize },
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
  if (item.product.stock < quantity) {
    throw Errors.badRequest("Insufficient stock");
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
