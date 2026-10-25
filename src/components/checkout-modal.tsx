'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from './provider';

/**
 * Concierge details + provider hand-off.
 * - Stripe configured → redirect to Stripe Checkout (hosted).
 * - Demo mode → order is confirmed instantly (no real payment).
 */
export default function CheckoutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang, cart, clearCartLocal } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [stripeMode, setStripeMode] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', address: '' });

  useEffect(() => {
    if (!open) return;
    fetch('/api/checkout/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.checkout === 'stripe') setStripeMode(true); })
      .catch(() => { /* demo mode */ });
  }, [open]);

  if (!open) return null;

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        setErr(lang === 'ar' ? 'تعذر إنشاء الطلب.' : 'Could not create the order.');
        setBusy(false);
        return;
      }
      const data = await res.json() as { url: string; cart?: unknown; checkout?: 'stripe' | 'demo' };
      onClose();
      if (data.cart) clearCartLocal();
      if (data.url.startsWith('http')) {
        window.location.href = data.url; // Stripe hosted checkout
      } else {
        router.push(data.url);
      }
    } catch {
      setErr('Network error.');
      setBusy(false);
    }
  };

  return (
    <div
      id="checkout-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t('co.title')}
      onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
    >
      <div className="modal-card">
        <header>
          <h3>{t('co.title')}</h3>
          <button className="ci-remove" onClick={onClose} aria-label={t('co.close')}>✕</button>
        </header>

        <form className="form-grid" onSubmit={submit}>
          <label>{t('co.name')}
            <input required value={form.name} onChange={set('name')} autoComplete="name" />
          </label>
          <label>{t('co.email')}
            <input required type="email" value={form.email} onChange={set('email')} autoComplete="email" />
          </label>
          <div className="row">
            <label>{t('co.phone')}
              <input value={form.phone} onChange={set('phone')} autoComplete="tel" />
            </label>
            <label>{t('co.city')}
              <input value={form.city} onChange={set('city')} autoComplete="address-level2" />
            </label>
          </div>
          <label>{t('co.address')}
            <input value={form.address} onChange={set('address')} autoComplete="street-address" />
          </label>

          <p className="form-note">
            {stripeMode ? t('co.withStripe') : t('co.demo')}
          </p>
          {err ? <p className="form-error">{err}</p> : null}

          <button className="btn btn-gold btn-block" disabled={busy || !cart || cart.isEmpty}>
            {busy ? '…' : t('co.place')}
          </button>
        </form>
      </div>
    </div>
  );
}
