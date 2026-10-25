import { NextResponse } from 'next/server';
import { getRates } from '@/lib/rates';

export async function GET() {
  try {
    const { rates, updatedAt, source } = await getRates();
    return NextResponse.json({ rates, updatedAt, source });
  } catch {
    // never fail the UI — constants are the floor
    return NextResponse.json({ rates: { USD: 1, EGP: 48.5, AED: 3.67, SAR: 3.75 }, updatedAt: 0, source: 'fallback' });
  }
}
