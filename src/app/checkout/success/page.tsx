import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getRates } from '@/lib/rates';
import { fmt } from '@/lib/currency';
import { statusLabelEn, statusLabelAr, lineLabel } from '@/lib/orders';

export default async function CheckoutSuccessPage({
  searchParams,
}: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderNumber } = await searchParams;

  const [store, rates] = await Promise.all([cookies(), getRates()]);
  const ar = store.get('oc_lang')?.value === 'ar';

  let order = null;
  if (orderNumber) {
    order = await prisma.order.findUnique({
      where: { number: orderNumber },
      include: { items: true },
    });
  }

  return (
    <main className="page-shell">
      <div className="success-wrap">
        <div className="success-mark" aria-hidden="true">✓</div>
        <h1 className="page-title">{ar ? 'شكراً لك' : 'Thank you'}</h1>
        <p className="page-sub" style={{ margin: '0 auto' }}>
          {ar ? 'طلبك مؤكد. سيتواصل الكونسيرج خلال 24 ساعة.' :
            'Your order is confirmed. A concierge will contact you within 24 hours.'}
        </p>

        {order ? (
          <article className="order-card" style={{ textAlign: 'start', maxWidth: 640, margin: '3rem auto 0' }}>
            <div className="oc-head">
              <span className="oc-num">{order.number}</span>
              <span className="oc-status" data-status={order.status}>
                {ar ? statusLabelAr(order.status) : statusLabelEn(order.status)}
              </span>
            </div>
            <ul>
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.qty} × {lineLabel(item.configJson, ar)}
                  {' — '}{fmt((item.qty * item.unitPriceCents) / 100, order.currency, rates.rates)}
                </li>
              ))}
            </ul>
            <div className="oc-meta">
              {ar ? 'الإجمالي' : 'Total'}: <strong>{fmt(order.totalCents / 100, order.currency, rates.rates)}</strong>
            </div>
          </article>
        ) : orderNumber ? (
          <p className="page-sub" style={{ marginTop: '2rem' }}>{t404(ar)}</p>
        ) : null}

        <p style={{ marginTop: '3rem' }}>
          <Link href="/" className="btn btn-ghost">← {ar ? 'واصل التجول' : 'Continue exploring'}</Link>
        </p>
      </div>
    </main>
  );
}

function t404(ar: boolean) {
  return ar ? 'الطلب غير موجود.' : 'Order not found.';
}
