import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  let db = false;
  try {
    await prisma.product.count();
    db = true;
  } catch { /* unreachable */ }
  return NextResponse.json({ ok: true, db: db ? 'up' : 'down', time: new Date().toISOString() });
}
