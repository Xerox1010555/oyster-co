'use client';

import { useEffect, useState } from 'react';

/** Branded preloader with real-failsafe — can never trap the visitor,
 *  even in a throttled background tab (rAF paused, intervals still tick). */
export default function Preloader() {
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const t0 = performance.now();
    let loaded = document.readyState === 'complete';
    let failed = false;
    let finished = false;
    let raf = 0;

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      setPct(100);
      setTimeout(() => setDone(true), 200);
    };

    const onLoad = () => { loaded = true; };
    window.addEventListener('load', onLoad);
    if (document.readyState === 'complete') loaded = true;
    // Hard failsafe: 3.5s no matter what (background tabs, blocked CDNs…)
    const failTimer = setTimeout(finish, 3500);
    const onFail = (event: PromiseRejectionEvent) => { event.preventDefault(); finish(); };
    window.addEventListener('unhandledrejection', onFail);

    // Visual progress (rAF — smooth when the tab is visible)
    const step = () => {
      if (finished) return;
      const elapsed = performance.now() - t0;
      const ceiling = loaded ? 100 : Math.min(88, (elapsed / 13));
      setPct((prev) => {
        const next = Math.min(ceiling, prev + Math.max(0.35, (ceiling - prev) * 0.08));
        return next;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    // Completion driver (setInterval — keeps firing in throttled tabs)
    const tick = setInterval(() => {
      const elapsed = performance.now() - t0;
      if ((loaded || failed) && elapsed > 800) finish();
    }, 250);

    return () => {
      finished = true;
      cancelAnimationFrame(raf);
      clearInterval(tick);
      clearTimeout(failTimer);
      window.removeEventListener('load', onLoad);
      window.removeEventListener('unhandledrejection', onFail);
    };
  }, []);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setRemoved(true), 1100);
    return () => clearTimeout(timer);
  }, [done]);

  if (removed) return null;

  return (
    <div id="preloader" className={done ? 'done' : ''} aria-hidden="true">
      <div className="pre-inner">
        <svg className="pre-ring" viewBox="0 0 120 120">
          <circle className="ring-bg" cx="60" cy="60" r="52" />
          <circle
            className="ring-fg" cx="60" cy="60" r="52"
            style={{ strokeDashoffset: `${326.7 - (326.7 * pct) / 100}` }}
          />
        </svg>
        <svg className="pre-crown" viewBox="0 0 96 64" fill="none">
          <rect x="4" y="4" width="88" height="4" stroke="var(--gold)" strokeWidth="1.4" />
          <rect x="10" y="10" width="76" height="2.5" stroke="var(--gold)" strokeWidth="1" />
          <path d="M8 20 L30 14 L48 8 L66 14 L88 20 L88 30 L8 30 Z" stroke="var(--gold)" strokeWidth="1.4" />
          <circle cx="16" cy="36" r="5" stroke="var(--gold)" strokeWidth="1.2" />
          <circle cx="34" cy="36" r="5" stroke="var(--gold)" strokeWidth="1.2" />
          <circle cx="62" cy="36" r="5" stroke="var(--gold)" strokeWidth="1.2" />
          <circle cx="80" cy="36" r="5" stroke="var(--gold)" strokeWidth="1.2" />
          <rect x="44" y="44" width="8" height="16" stroke="var(--gold)" strokeWidth="1.2" />
        </svg>
        <div className="pre-pct">{Math.round(pct)}%</div>
        <div className="pre-brand">OYSTER &amp; CO. — GENEVA</div>
      </div>
    </div>
  );
}
