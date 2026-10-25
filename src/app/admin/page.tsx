import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fmt } from '@/lib/currency';
import { statusLabelEn, ORDER_STATUSES } from '@/lib/orders';
import { setOrderStatus } from './actions';

export default async function AdminPage() {
  if (!(await isAdmin())) redirect('/login');

  const [orders, subscribers, appointments, productCount] = await Promise.all([
    prisma.order.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' }, take: 60 }),
    prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' }, take: 40 }),
    prisma.appointment.findMany({ include: { boutique: true }, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.product.count(),
  ]);

  return (
    <main className="admin-shell">
      <p className="kicker">Concierge desk</p>
      <h1 className="page-title" style={{ marginBottom: '2rem' }}>Administration</h1>

      <section className="admin-panel">
        <h2>Products · {productCount}</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Managed via <code>prisma/seed.mjs</code> and the <code>Product</code> table — status, pricing
          and option premiums are server-authoritative.
        </p>
      </section>

      <section className="admin-panel">
        <h2>Orders ({orders.length})</h2>
        {orders.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No orders yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Number</th><th>Email</th><th>Items</th><th>Total</th><th>Status</th><th>Change</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td><strong>{order.number}</strong><br />{new Date(order.createdAt).toISOString().slice(0, 10)}</td>
                    <td>{order.email}</td>
                    <td>{order.items.reduce((sum, i) => sum + i.qty, 0)}</td>
                    <td>{fmt(order.totalCents / 100, order.currency, { USD: 1 })}</td>
                    <td><strong>{statusLabelEn(order.status)}</strong></td>
                    <td>
                      <form action={setOrderStatus} style={{ display: 'flex', gap: 6 }}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <select name="status" defaultValue={order.status} aria-label={`Status ${order.number}`}>
                          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button className="tool-btn" type="submit">Set</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-panel">
        <h2>Appointments ({appointments.length})</h2>
        {appointments.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>None yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr><th>When</th><th>Boutique</th><th>Service</th><th>Guest</th><th>Status</th></tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>{new Date(appointment.startsAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td><strong>{appointment.boutique.cityEn}</strong></td>
                    <td>{appointment.service}</td>
                    <td>{appointment.name} · {appointment.email}</td>
                    <td>{appointment.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-panel">
        <h2>Newsletter ({subscribers.length})</h2>
        {subscribers.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No subscribers yet.</p>
        ) : (
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 2 }}>
            {subscribers.map((s) => s.email).join(' · ')}
          </p>
        )}
      </section>

      <p style={{ marginTop: 30 }}>
        <Link href="/" className="backlink">← Back to the maison</Link>
      </p>
    </main>
  );
}
