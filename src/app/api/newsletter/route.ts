import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: NextRequest) {
  try {
    const { email, locale, source } = await request.json();
    if (!EMAIL_RE.test(String(email ?? ''))) {
      return NextResponse.json({ error: 'invalid email' }, { status: 400 });
    }
    await prisma.newsletterSubscriber.upsert({
      where: { email: String(email).toLowerCase() },
      update: { locale: locale === 'ar' ? 'ar' : 'en' },
      create: {
        email: String(email).toLowerCase(),
        locale: locale === 'ar' ? 'ar' : 'en',
        source: typeof source === 'string' ? source : 'footer',
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
