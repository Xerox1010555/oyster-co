import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import raw from '@/data/catalog.json';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const base: MetadataRoute.Sitemap = [
    { url: `${site}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${site}/boutiques`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${site}/login`, changeFrequency: 'yearly', priority: 0.2 },
  ];
  let slugs: string[];
  try {
    const products = await prisma.product.findMany({ where: { publishState: 'published' }, select: { slug: true } });
    slugs = products.map((p) => p.slug);
  } catch {
    slugs = raw.products.map((p) => p.slug);
  }
  return [
    ...base,
    ...slugs.map((slug) => ({ url: `${site}/collection/${slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
  ];
}
