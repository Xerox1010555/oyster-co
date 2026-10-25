import HomeSections from '@/components/sections-home';
import { getBoutiques, getTestimonials } from '@/lib/catalog-server';

export default async function HomePage() {
  const [boutiques, testimonials] = await Promise.all([getBoutiques(), getTestimonials()]);
  return <HomeSections boutiques={boutiques} testimonials={testimonials} />;
}
