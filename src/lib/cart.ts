import "server-only";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { getCurrentUser } from "./auth/session";
import { randomToken } from "./auth/crypto";
import { evaluateCoupon, finalPrice } from "./pricing";

const CART_COOKIE = "pb_cart";
export const MAX_QTY_PER_ITEM = 10;

const cartInclude = {
  items: {
    orderBy: { id: "asc" as const },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          priceCents: true,
          discountPercent: true,
          stock: true,
          active: true,
          platform: true,
          images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
        },
      },
    },
  },
};

async function findCart() {
  const user = await getCurrentUser();
  if (user) return prisma.cart.findUnique({ where: { userId: user.id }, include: cartInclude });
  const id = (await cookies()).get(CART_COOKIE)?.value;
  if (!id) return null;
  return prisma.cart.findFirst({ where: { id, userId: null }, include: cartInclude });
}

/** Obtém (ou cria) o carrinho da requisição. Criar só é permitido em server actions. */
export async function getOrCreateCart() {
  const existing = await findCart();
  if (existing) return existing;
  const user = await getCurrentUser();
  if (user) return prisma.cart.create({ data: { userId: user.id }, include: cartInclude });
  const cart = await prisma.cart.create({ data: { id: randomToken(18) }, include: cartInclude });
  (await cookies()).set(CART_COOKIE, cart.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return cart;
}

/** Ao entrar/cadastrar, move os itens do carrinho de visitante para o carrinho do usuário. */
export async function mergeGuestCart(userId: string) {
  const jar = await cookies();
  const guestId = jar.get(CART_COOKIE)?.value;
  if (!guestId) return;
  const guest = await prisma.cart.findFirst({ where: { id: guestId, userId: null }, include: { items: true } });
  jar.delete(CART_COOKIE);
  if (!guest) return;
  const userCart = (await prisma.cart.findUnique({ where: { userId } })) ?? (await prisma.cart.create({ data: { userId } }));
  for (const item of guest.items) {
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: userCart.id, productId: item.productId } },
      create: { cartId: userCart.id, productId: item.productId, quantity: item.quantity },
      update: { quantity: { increment: item.quantity } },
    });
  }
  await prisma.cartItem.updateMany({ where: { cartId: userCart.id, quantity: { gt: MAX_QTY_PER_ITEM } }, data: { quantity: MAX_QTY_PER_ITEM } });
  if (guest.couponCode && !userCart.couponCode)
    await prisma.cart.update({ where: { id: userCart.id }, data: { couponCode: guest.couponCode } });
  await prisma.cart.delete({ where: { id: guest.id } });
}

type CartWithItems = NonNullable<Awaited<ReturnType<typeof findCart>>>;

/** Resumo calculado sempre no servidor a partir dos preços atuais do banco. */
export async function summarizeCart(cart: CartWithItems | null) {
  const lines = (cart?.items ?? []).map((item) => {
    const unit = finalPrice(item.product);
    const available = item.product.active && item.product.stock >= item.quantity;
    return {
      id: item.id,
      productId: item.product.id,
      name: item.product.name,
      slug: item.product.slug,
      platform: item.product.platform,
      image: item.product.images[0]?.url ?? null,
      quantity: item.quantity,
      stock: item.product.stock,
      active: item.product.active,
      unitCents: unit,
      originalUnitCents: item.product.priceCents,
      totalCents: unit * item.quantity,
      available,
    };
  });
  const subtotalCents = lines.reduce((s, l) => s + l.totalCents, 0);
  let discountCents = 0;
  let couponError: string | null = null;
  let couponCode: string | null = cart?.couponCode ?? null;
  let couponId: string | null = null;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
    const result = evaluateCoupon(coupon, subtotalCents);
    if (result.ok) {
      discountCents = result.discountCents;
      couponId = coupon!.id;
    } else {
      couponError = result.error;
    }
  }
  if (couponError && lines.length === 0) {
    couponError = null;
    couponCode = null;
  }
  return {
    cartId: cart?.id ?? null,
    lines,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    subtotalCents,
    discountCents,
    totalCents: Math.max(subtotalCents - discountCents, 0),
    couponCode,
    couponId,
    couponError,
    hasIssues: lines.some((l) => !l.available),
  };
}

export async function getCartSummary() {
  return summarizeCart(await findCart());
}

export async function getCartCount() {
  const cart = await findCart();
  return cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
}

export type CartSummary = Awaited<ReturnType<typeof summarizeCart>>;
