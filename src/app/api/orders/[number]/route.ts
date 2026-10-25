import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ number: string }> };

/** Order lookup. Guests may view orders they created (no user attached);
    logged-in owners may view their own. */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { number } = await context.params;
  const order = await prisma.order.findUnique({
    where: { number: number },
    include: { items: true, events: { orderBy: { at: 'asc' } } },
  });
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (order.userId) {
    const user = await getSessionUser();
    if (!user || user.id !== order.userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }
  const { events, items, ...safe } = order;
  return NextResponse.json({ order: safe, items: items, events: events });
}
