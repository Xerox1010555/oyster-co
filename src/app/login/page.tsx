'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/provider';

export default function LoginPage() {
  const { t } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setErr(t(mode === 'register' ? 'auth.exists' : 'auth.error'));
        setBusy(false);
        return;
      }
      router.push('/account/orders');
      router.refresh();
    } catch {
      setErr('Network error.');
      setBusy(false);
    }
  };

  return (
    <main className="page-shell">
      <div className="auth-card">
        <h1>{mode === 'login' ? t('login.title') : t('login.register')}</h1>
        <form className="form-grid" onSubmit={submit}>
          <label>{t('auth.email')}
            <input
              type="email" required value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>
          <label>{t('auth.password')}
            <input
              type="password" required minLength={8} value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
          {err ? <p className="form-error">{err}</p> : null}
          <button className="btn btn-gold btn-block" disabled={busy}>
            {t(mode === 'login' ? 'auth.submit.login' : 'auth.submit.register')}
          </button>
        </form>
        <p className="auth-switch">
          {mode === 'login' ? (
            <>
              {t('login.register')}?{' '}
              <button onClick={() => { setMode('register'); setErr(null); }}>{t('auth.submit.register')}</button>
            </>
          ) : (
            <>
              {t('login.haveAccount')}{' '}
              <button onClick={() => { setMode('login'); setErr(null); }}>{t('auth.submit.login')}</button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
