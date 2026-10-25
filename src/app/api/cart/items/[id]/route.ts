import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateCart, serializeCart } from '@/lib/cart';
import { getSessionUser } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

async function ownedCart() {
  const user = await getSessionUser();
  return getOrCreateCart(user ? { id: user.id } : null);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const delta = Number(body?.delta);
  if (!Number.isInteger(delta) || delta === 0) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  const cart = await ownedCart();
  const item = await prisma.cartItem.findFirst({
    where: { id: id, cartId: cart.id },
  });
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const qty = Math.max(1, Math.min(9, item.qty + delta));
  await prisma.cartItem.update({ where: { id: item.id }, data: { qty: qty } });
  return NextResponse.json(await serializeCart(cart.id));
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const cart = await ownedCart();
  const item = await prisma.cartItem.findFirst({ where: { id: id, cartId: cart.id } });
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await prisma.cartItem.delete({ where: { id: item.id } });
  return NextResponse.json(await serializeCart(cart.id));
}
