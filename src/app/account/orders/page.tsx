import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRates } from '@/lib/rates';
import { fmt } from '@/lib/currency';
import { statusLabelEn, statusLabelAr, lineLabel } from '@/lib/orders';

export default async function AccountOrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const [orders, rates, langStore] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    getRates(),
    cookies(),
  ]);
  const ar = langStore.get('oc_lang')?.value === 'ar';

  return (
    <main className="page-shell">
      <p className="kicker">{ar ? 'حسابي' : 'Account'}</p>
      <h1 className="page-title">{ar ? 'طلباتي' : 'My Orders'}</h1>
      <p className="page-sub" style={{ marginBottom: '2.4rem' }}>{user.email}</p>

      {orders.length === 0 ? (
        <p className="page-sub">{ar ? 'لا طلبات بعد.' : 'No orders yet.'}{' '}
          <Link href="/#collection" style={{ color: 'var(--gold)' }}>{ar ? 'تصفح المجموعة' : 'Browse the collection'}</Link>
        </p>
      ) : (
        orders.map((order) => (
          <article className="order-card" key={order.id}>
            <div className="oc-head">
              <span className="oc-num">{order.number}</span>
              <span className="oc-status" data-status={order.status}>
                {ar ? statusLabelAr(order.status) : statusLabelEn(order.status)}
              </span>
            </div>
            <ul>
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.qty} × {lineLabel(item.configJson, ar)}{' '}
                  — {fmt((item.qty * item.unitPriceCents) / 100, order.currency, rates.rates)}
                </li>
              ))}
            </ul>
            <div className="oc-meta">
              {new Date(order.createdAt).toLocaleString(ar ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
              {' · '}{fmt(order.totalCents / 100, order.currency, rates.rates)}
            </div>
          </article>
        ))
      )}
    </main>
  );
}
