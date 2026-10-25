'use client';

import { useMemo, useState } from 'react';
import { useApp } from './provider';

/** Private-visit appointment request form (posts to /api/appointments). */
export default function BookingForm({ boutiques }: { boutiques: { id: string; cityEn: string; cityAr: string }[] }) {
  const { t, lang } = useApp();
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');
  const [form, setForm] = useState({
    boutiqueId: boutiques[0]?.id ?? '',
    service: 'consultation',
    startsAt: '',
    name: '', email: '', phone: '', notes: '',
  });

  const services = useMemo(() => ([
    { value: 'consultation', label: lang === 'ar' ? 'استشارة خاصة' : 'Private consultation' },
    { value: 'fitting', label: lang === 'ar' ? 'قياس وتجربة' : 'Fitting & try-on' },
    { value: 'servicing', label: lang === 'ar' ? 'تسليم/صيانة ساعة' : 'Watch hand-over / servicing' },
  ]), [lang]);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState('busy');
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, startsAt: new Date(form.startsAt).toISOString() }),
      });
      setState(res.ok ? 'ok' : 'err');
    } catch {
      setState('err');
    }
  };

  if (state === 'ok') {
    return <p className="news-ok" role="status">{t('book.ok')}</p>;
  }

  return (
    <form className="form-grid" onSubmit={submit} style={{ marginTop: '2.6rem' }}>
      <div className="row">
        <label>{t('book.boutique')}
          <select value={form.boutiqueId} onChange={set('boutiqueId')} required>
            {boutiques.map((b) => (
              <option key={b.id} value={b.id}>{lang === 'ar' ? b.cityAr : b.cityEn}</option>
            ))}
          </select>
        </label>
        <label>{t('book.service')}
          <select value={form.service} onChange={set('service')}>
            {services.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>
      <div className="row">
        <label>{t('book.date')}
          <input type="datetime-local" required value={form.startsAt} onChange={set('startsAt')} />
        </label>
        <label>{t('book.name')}
          <input required value={form.name} onChange={set('name')} autoComplete="name" />
        </label>
      </div>
      <div className="row">
        <label>{t('book.email')}
          <input type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
        </label>
        <label>{t('book.phone')}
          <input value={form.phone} onChange={set('phone')} autoComplete="tel" />
        </label>
      </div>
      <label>{t('book.notes')}
        <textarea rows={3} value={form.notes} onChange={set('notes')} />
      </label>
      <button className="btn btn-gold" disabled={state === 'busy'}>{t('book.submit')}</button>
      {state === 'err' ? <p className="form-error">{t('book.err')}</p> : null}
    </form>
  );
}
