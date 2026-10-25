import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { publishState: 'published' },
      orderBy: { sort: 'asc' },
    });
    return NextResponse.json({ products: products });
  } catch (error) {
    return NextResponse.json({ error: 'catalog unavailable' }, { status: 503 });
  }
}
