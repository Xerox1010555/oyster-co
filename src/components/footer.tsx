'use client';

import Link from 'next/link';
import { useApp } from './provider';

export default function Footer() {
  const { t, lang } = useApp();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="foot-grid">
        <div>
          <div className="foot-brand">OYSTER <em>&amp;</em> CO.</div>
          <p className="foot-tag">{t('footer.tag')}</p>
          <p className="foot-rights">{t('footer.legal')} © {year}.</p>
        </div>
        <div className="foot-col">
          <h4>{t('footer.explore')}</h4>
          <Link href="/#collection">{t('nav.collection')}</Link>
          <Link href="/#configurator">{t('nav.configurator')}</Link>
          <Link href="/#craft">{t('nav.craft')}</Link>
          <Link href="/boutiques">{t('nav.boutiques')}</Link>
          <Link href="/login">{t('nav.account')}</Link>
        </div>
        <div className="foot-col">
          <h4>{t('footer.contact')}</h4>
          <span>{t('footer.hours')}</span>
          <a href="mailto:concierge@oysterand.co">concierge@oysterand.co</a>
          <a href={`tel:+41225420105`}>+41 22 542 01 05</a>
        </div>
      </div>
    </footer>
  );
}
