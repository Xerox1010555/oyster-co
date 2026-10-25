import { prisma } from './prisma';
import { FALLBACK_RATES, type Rates } from './currency';

const TTL = 4 * 60 * 60 * 1000;
const URL = 'https://open.er-api.com/v6/latest/USD';
let memoryCache: { rates: Rates; updatedAt: number } | null = null;

async function fetchLive(): Promise<Rates | null> {
  try {
    const res = await fetch(URL, { signal: AbortSignal.timeout(6000), cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.rates) return data.rates as Rates;
    return null;
  } catch {
    return null;
  }
}

async function fromDb(): Promise<Rates> {
  const rows = await prisma.rate.findMany();
  const rates: Rates = { ...FALLBACK_RATES };
  for (const row of rows) rates[row.code] = row.rate;
  return rates;
}

/** Fresh rates for server rendering / API. Network (4h) → DB → constants. */
export async function getRates(): Promise<{ rates: Rates; updatedAt: number; source: string }> {
  if (memoryCache && Date.now() - memoryCache.updatedAt < TTL) {
    return { rates: memoryCache.rates, updatedAt: memoryCache.updatedAt, source: 'memory' };
  }
  const live = await fetchLive();
  if (live) {
    const out: Rates = { ...FALLBACK_RATES };
    for (const code of Object.keys(FALLBACK_RATES)) {
      const r = Number(live[code]);
      if (Number.isFinite(r) && r > 0) out[code] = r;
    }
    await persist(out);
    memoryCache = { rates: out, updatedAt: Date.now() };
    return { rates: out, updatedAt: memoryCache.updatedAt, source: 'network' };
  }
  const rates = await fromDb();
  memoryCache = { rates, updatedAt: Date.now() - TTL / 2 };
  return { rates, updatedAt: memoryCache.updatedAt, source: 'db' };
}

async function persist(rates: Rates) {
  for (const [code, rate] of Object.entries(rates)) {
    await prisma.rate.upsert({ where: { code }, update: { rate }, create: { code, rate } });
  }
}
