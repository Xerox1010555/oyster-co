import { prisma } from './prisma';
import { FALLBACK_PREMIUMS, type PremiumMap } from './currency';
import raw from '@/data/catalog.json';
import type { CatalogDTO } from '@/components/provider';

/* Server-side catalog assembly with a JSON fallback so the UI never
   white-screens even before `db push` / seeding. */

export type BoutiqueDTO = {
  id: string; cityEn: string; cityAr: string;
  addressEn: string; addressAr: string;
  phone: string; hoursEn: string; hoursAr: string;
};
export type TestimonialDTO = {
  quoteEn: string; quoteAr: string; author: string; cityEn: string; cityAr: string;
};

export async function getCatalog(): Promise<CatalogDTO> {
  try {
    const [products, options, prices] = await Promise.all([
      prisma.product.findMany({ where: { publishState: 'published' }, orderBy: { sort: 'asc' } }),
      prisma.option.findMany({ orderBy: [{ kind: 'asc' }, { sort: 'asc' }] }),
      prisma.optionPrice.findMany({ where: { productId: null } }),
    ]);
    if (products.length === 0) throw new Error('empty');
    const pick = (kind: string) => options.filter((o) => o.kind === kind);
    const premiums: PremiumMap = {
      bracelet: { ...FALLBACK_PREMIUMS.bracelet },
      bezel: { ...FALLBACK_PREMIUMS.bezel },
    };
    for (const p of prices) {
      if (p.kind === 'bracelet') premiums.bracelet[p.key] = p.cents;
      if (p.kind === 'bezel') premiums.bezel[p.key] = p.cents;
    }
    return {
      products: products.map((p) => ({
        id: p.id, slug: p.slug, nameEn: p.nameEn, nameAr: p.nameAr, refCode: p.refCode,
        basePriceCents: p.basePriceCents, caseMm: p.caseMm, waterM: p.waterM, calibre: p.calibre,
        descEn: p.descEn, descAr: p.descAr,
        stockDialKey: p.stockDialKey, stockBezelKey: p.stockBezelKey, stockBraceletKey: p.stockBraceletKey,
        modelAccent: p.modelAccent,
      })),
      options: {
        dial: pick('dial').map((o) => ({ key: o.key, nameEn: o.nameEn, nameAr: o.nameAr, colorHex: o.colorHex })),
        bezel: pick('bezel').map((o) => ({ key: o.key, nameEn: o.nameEn, nameAr: o.nameAr })),
        bracelet: pick('bracelet').map((o) => ({ key: o.key, nameEn: o.nameEn, nameAr: o.nameAr })),
      },
    };
  } catch {
    /* Fallback: static catalog.json (pre-seed state) */
    return {
      products: raw.products.map((p, i) => ({
        id: `static-${i}`, slug: p.slug, nameEn: p.nameEn, nameAr: p.nameAr, refCode: p.refCode,
        basePriceCents: p.basePriceCents, caseMm: p.caseMm, waterM: p.waterM, calibre: p.calibre,
        descEn: p.descEn, descAr: p.descAr,
        stockDialKey: p.stockDialKey, stockBezelKey: p.stockBezelKey, stockBraceletKey: p.stockBraceletKey,
        modelAccent: p.modelAccent,
      })) as CatalogDTO['products'],
      options: {
        dial: raw.dials.map((o) => ({ key: o.key, nameEn: o.nameEn, nameAr: o.nameAr, colorHex: o.colorHex })),
        bezel: raw.bezels.map((o) => ({ key: o.key, nameEn: o.nameEn, nameAr: o.nameAr })),
        bracelet: raw.bracelets.map((o) => ({ key: o.key, nameEn: o.nameEn, nameAr: o.nameAr })),
      },
    };
  }
}

export async function getPremiums(): Promise<PremiumMap> {
  try {
    const prices = await prisma.optionPrice.findMany({ where: { productId: null } });
    if (!prices.length) return FALLBACK_PREMIUMS;
    const premiums: PremiumMap = { bracelet: { ...FALLBACK_PREMIUMS.bracelet }, bezel: { ...FALLBACK_PREMIUMS.bezel } };
    for (const p of prices) {
      if (p.kind === 'bracelet') premiums.bracelet[p.key] = p.cents;
      if (p.kind === 'bezel') premiums.bezel[p.key] = p.cents;
    }
    return premiums;
  } catch {
    return FALLBACK_PREMIUMS;
  }
}

export async function getBoutiques(): Promise<BoutiqueDTO[]> {
  try {
    const rows = await prisma.boutique.findMany({ where: { active: true }, orderBy: { cityEn: 'asc' } });
    if (rows.length) {
      return rows.map((b) => ({
        id: b.id, cityEn: b.cityEn, cityAr: b.cityAr, addressEn: b.addressEn,
        addressAr: b.addressAr, phone: b.phone, hoursEn: b.hoursEn, hoursAr: b.hoursAr,
      }));
    }
  } catch { /* fall through */ }
  return raw.boutiques.map((b, i) => ({ id: `static-b${i}`, ...b, hoursEn: 'Daily 10:00 — 22:00', hoursAr: 'يومياً 10:00 — 22:00' }));
}

export async function getTestimonials(): Promise<TestimonialDTO[]> {
  try {
    const rows = await prisma.testimonial.findMany({ where: { published: true }, orderBy: { sort: 'asc' } });
    if (rows.length) {
      return rows.map((t) => ({ quoteEn: t.quoteEn, quoteAr: t.quoteAr, author: t.author, cityEn: t.cityEn, cityAr: t.cityAr }));
    }
  } catch { /* fall through */ }
  return raw.testimonials as TestimonialDTO[];
}

export async function getPublishedProduct(slug: string) {
  const catalog = await getCatalog();
  return catalog.products.find((p) => p.slug === slug) ?? null;
}
