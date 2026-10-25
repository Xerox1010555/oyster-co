import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, verifyPassword, signToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!EMAIL_RE.test(String(email ?? ''))) {
      return NextResponse.json({ error: 'invalid email' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'password min 8 chars' }, { status: 400 });
    }
    const exists = await prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (exists) {
      return NextResponse.json({ error: 'email already registered' }, { status: 409 });
    }
    const user = await prisma.user.create({
      data: {
        email: String(email).toLowerCase(),
        passwordHash: hashPassword(password),
        role: 'customer',
      },
    });
    const res = NextResponse.json({ ok: true, email: user.email });
    res.cookies.set(SESSION_COOKIE, signToken(user.id), sessionCookieOptions());
    return res;
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
