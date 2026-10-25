import BookingForm from '@/components/booking-form';
import { getBoutiques } from '@/lib/catalog-server';
import { cookies } from 'next/headers';

export default async function BoutiquesPage() {
  const boutiques = await getBoutiques();
  const store = await cookies();
  const ar = store.get('oc_lang')?.value === 'ar';

  return (
    <main className="page-shell">
      <p className="kicker">{ar ? 'زيارة خاصة' : 'Private Visit'}</p>
      <h1 className="page-title" style={{ marginBottom: '0.4rem' }}>
        {ar ? 'البوتيكات' : 'The Boutiques'}
      </h1>
      <p className="page-sub">
        {ar
          ? 'اختر البوتيك الأقرب واحجز موعداً — سيؤكد الكونسيرج التفاصيل خلال 24 ساعة.'
          : 'Choose the closest boutique and request an appointment — our concierge confirms within 24 hours.'}
      </p>

      <div className="boutiques" style={{ marginTop: '3rem' }}>
        {boutiques.map((boutique) => (
          <article className="boutique" key={boutique.id}>
            <h3>{ar ? boutique.cityAr : boutique.cityEn}</h3>
            <p className="b-addr">{ar ? boutique.addressAr : boutique.addressEn}</p>
            <div className="b-meta">
              <span>{ar ? boutique.hoursAr : boutique.hoursEn}</span>
              <a href={`tel:${boutique.phone.replace(/\s+/g, '')}`}>{boutique.phone}</a>
            </div>
          </article>
        ))}
      </div>

      <h2 style={{ fontFamily: 'var(--fh)', fontSize: '1.9rem', marginTop: '5rem' }}>
        {ar ? 'احجز موعداً' : 'Book an Appointment'}
      </h2>
      <BookingForm boutiques={boutiques.map((b) => ({ id: b.id, cityEn: b.cityEn, cityAr: b.cityAr }))} />
    </main>
  );
}
