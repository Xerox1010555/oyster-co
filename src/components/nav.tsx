'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useApp } from './provider';
import { CURRENCIES } from '@/lib/currency';

export default function Nav() {
  const {
    t, lang, setLang, theme, setTheme, currency, setCurrency,
    cart, cartOpen, openCart, closeCart,
  } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accounted, setAccounted] = useState<'none' | 'in'>('none');
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => { setAccounted(data?.user ? 'in' : 'none'); })
      .catch(() => setAccounted('none'));
  }, []);

  /* Close the mobile menu when the route hash / page changes */
  useEffect(() => { setMenuOpen(false); }, [cartOpen]);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    if (menuOpen) el.classList.add('nav-open');
    else el.classList.remove('nav-open');
  }, [menuOpen]);

  const links = [
    { href: '/#collection', key: 'nav.collection' },
    { href: '/#configurator', key: 'nav.configurator' },
    { href: '/#craft', key: 'nav.craft' },
    { href: '/boutiques', key: 'nav.boutiques' },
  ];

  return (
    <nav id="nav" ref={navRef} className={scrolled ? 'scrolled' : ''}>
      <Link href="/" className="nav-logo" aria-label="OYSTER & CO.">
        <span className="logo-crown">♛</span>OYSTER <em>&amp;</em> CO.
      </Link>

      <div className="nav-links">
        {links.map((link) => (
          <Link key={link.key} href={link.href}>{t(link.key)}</Link>
        ))}
      </div>

      <div className="nav-tools">
        <select
          id="currency"
          value={currency}
          aria-label="Currency"
          onChange={(event) => setCurrency(event.target.value)}
        >
          {CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
        </select>
        <button className="tool-btn" id="lang-btn" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} aria-label={t('nav.lang')}>
          {lang === 'en' ? 'ع' : 'EN'}
        </button>
        <button className="tool-btn" id="theme-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={t('nav.theme')}>
          {theme === 'dark' ? '☾' : '☀'}
        </button>
        <Link className="tool-btn" href={accounted === 'in' ? '/account/orders' : '/login'} aria-label={t('nav.account')}>
          {accounted === 'in' ? (lang === 'ar' ? 'حسابي' : 'Account') : (lang === 'ar' ? 'دخول' : 'Sign In')}
        </Link>
        <button className="tool-btn cart-btn" onClick={cartOpen ? closeCart : openCart} aria-label={t('nav.cart')} aria-expanded={cartOpen}>
          🛍{cart && cart.count > 0 ? <span id="cart-count">{cart.count}</span> : null}
        </button>
        <button id="burger" onClick={() => setMenuOpen((open) => !open)} aria-label="Menu">
          <span /><span />
        </button>
      </div>
    </nav>
  );
}
