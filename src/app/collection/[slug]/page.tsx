import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublishedProduct } from '@/lib/catalog-server';
import ProductExperience from '@/components/product-detail';

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProduct(slug);
  if (!product || product.id.startsWith('static-')) {
    return { title: 'OYSTER & CO.' };
  }
  return {
    title: `${product.nameEn} — OYSTER & CO.`,
    description: product.descEn,
    openGraph: { title: product.nameEn, description: product.descEn, type: 'website' },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getPublishedProduct(slug);
  if (!product) notFound();
  return <ProductExperience product={product} />;
}
