import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  const user = await getSessionUser();
  // 200 with null (not 401) — an anonymous visitor is not an error condition,
  // and we keep the browser console perfectly clean.
  return NextResponse.json({ user: user ? { email: user.email, role: user.role } : null });
}
