import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const product = await prisma.product.findUnique({ where: { slug: slug } });
    if (!product) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const options = await prisma.option.findMany({ orderBy: { sort: 'asc' } });
    return NextResponse.json({
      product: product,
      options: {
        dial: options.filter((o) => o.kind === 'dial'),
        bezel: options.filter((o) => o.kind === 'bezel'),
        bracelet: options.filter((o) => o.kind === 'bracelet'),
      },
    });
  } catch {
    return NextResponse.json({ error: 'catalog unavailable' }, { status: 503 });
  }
}
