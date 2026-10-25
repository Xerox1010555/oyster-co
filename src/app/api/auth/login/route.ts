import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, signToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const user = await prisma.user.findUnique({ where: { email: String(email ?? '').toLowerCase() } });
    const ok = user && verifyPassword(String(password ?? ''), user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'invalid credentials' }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true, email: user!.email, role: user!.role });
    res.cookies.set(SESSION_COOKIE, signToken(user!.id), sessionCookieOptions());
    return res;
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
