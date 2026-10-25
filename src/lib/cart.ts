import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import type { Cart } from '@prisma/client';
import { FALLBACK_RATES, type Rates } from './currency';
import { getRates } from './rates';

export const CART_COOKIE = 'oc_cart';

export type CartLine = {
  id: string;
  productId: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  modelAccent: string;
  dialKey: string;
  bezelKey: string;
  braceletKey: string;
  dialHex: string | null;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export type CartDTO = {
  items: CartLine[];
  count: number;
  subtotalCents: number;
  isEmpty: boolean;
};

/** Get the visitor's cart, creating one (with cookie) when missing. Always returns a Cart. */
export async function getOrCreateCart(currentUser: { id: string } | null) {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;

  // logged-in users get a personal cart
  if (currentUser) {
    const existing = await prisma.cart.findUnique({ where: { userId: currentUser.id } });
    if (existing) {
      return existing;
    }
    // merge guest cart into a fresh user cart if one exists
    const userToken = randomBytes(24).toString('hex');
    let merged: Cart = await prisma.cart.create({ data: { userId: currentUser.id, token: userToken } });
    if (token) {
      const guest = await prisma.cart.findUnique({ where: { token }, include: { items: true } });
      if (guest) {
        for (const item of guest.items) {
          await prisma.cartItem.upsert({
            where: { cartId_configHash: { cartId: merged.id, configHash: item.configHash } },
            update: { qty: item.qty },
            create: {
              cartId: merged.id,
              productId: item.productId,
              dialKey: item.dialKey,
              bezelKey: item.bezelKey,
              braceletKey: item.braceletKey,
              qty: item.qty,
              unitPriceCents: item.unitPriceCents,
              configHash: item.configHash,
            },
          });
        }
        await prisma.cart.delete({ where: { id: guest.id } });
      }
    }
    try { store.set(CART_COOKIE, merged.token, cartCookieOptions()); } catch { /* read-only context */ }
    return merged;
  }

  // guest cart by cookie token
  if (token) {
    const cart = await prisma.cart.findUnique({ where: { token } });
    if (cart) return cart;
  }
  const newToken = randomBytes(24).toString('hex');
  const cart = await prisma.cart.create({ data: { token: newToken } });
  try { store.set(CART_COOKIE, newToken, cartCookieOptions()); } catch { /* read-only context */ }
  return cart;
}

export function cartCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 180 * 24 * 60 * 60,
  };
}

/** Full server-side serialization with product join + totals. */
export async function serializeCart(cartId: string): Promise<CartDTO> {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: { include: { product: true }, orderBy: { id: 'asc' } },
    },
  });
  if (!cart) return { items: [], count: 0, subtotalCents: 0, isEmpty: true };

  const dials = await prisma.option.findMany({ where: { kind: 'dial' } });
  const dialHexByKey = new Map(dials.map((d) => [d.key, d.colorHex]));

  const items: CartLine[] = cart.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    slug: item.product.slug,
    nameEn: item.product.nameEn,
    nameAr: item.product.nameAr,
    modelAccent: item.product.modelAccent,
    dialKey: item.dialKey,
    bezelKey: item.bezelKey,
    braceletKey: item.braceletKey,
    dialHex: dialHexByKey.get(item.dialKey) ?? null,
    qty: item.qty,
    unitPriceCents: item.unitPriceCents,
    lineTotalCents: item.qty * item.unitPriceCents,
  }));

  return {
    items,
    count: items.reduce((sum, item) => sum + item.qty, 0),
    subtotalCents: items.reduce((sum, item) => sum + item.lineTotalCents, 0),
    isEmpty: items.length === 0,
  };
}
