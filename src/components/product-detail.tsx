'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useApp, type ProductDTO } from './provider';
import { computeUnitPriceCents } from '@/lib/currency';

/**
 * Product detail interactive panel: 3D stage (.stage-col#pd-stage),
 * config subset (this model only), live pricing, add-to-cart.
 */
export default function ProductExperience({ product }: { product: ProductDTO }) {
  const {
    t, lang, fmt, catalog, config, setConfigKind, addToCart, premiums,
  } = useApp();

  /* Snap stage + config to this model (keep custom dial/bezel/bracelet when same model) */
  useEffect(() => {
    if (config.model !== product.slug) {
      setConfigKind('model', product.slug, product);
    }
  }, [product, config.model, setConfigKind]);

  const price = computeUnitPriceCents({
    basePriceCents: product.basePriceCents,
    stockDialKey: product.stockDialKey,
    dialKey: config.dial, bezelKey: config.bezel, braceletKey: config.bracelet,
    premiums,
  });
  const name = lang === 'ar' ? product.nameAr : product.nameEn;
  const desc = lang === 'ar' ? product.descAr : product.descEn;

  return (
    <main id="app" className="page-shell" style={{ maxWidth: 1400 }}>
      <div className="pd-layout">
        <div className="stage-col" id="pd-stage" aria-hidden="true" />
        <div className="pd-panel">
          <Link href="/#collection" className="backlink">← {t('pd.kicker')}</Link>
          <p className="kicker">{t('collection.kicker')}</p>
          <h1 className="page-title" style={{ marginBottom: '0.2rem' }}>{name}</h1>
          <div style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: `.26em`, textTransform: 'uppercase' }}>
            {product.refCode} · {product.caseMm} · {lang === 'ar' ? `مقاومة ${product.waterM}` : `${product.waterM} waterproof`}
          </div>
          <p className="pd-desc">{desc}</p>

          <div className="cfg-group">
            <h4>{t('config.dial')}</h4>
            <div className="swatches">
              {catalog.options.dial.map((dial) => (
                <button
                  key={dial.key}
                  className={`swatch ${config.dial === dial.key ? 'active' : ''}`}
                  style={{ background: dial.colorHex ?? '#111' }}
                  title={lang === 'ar' ? dial.nameAr : dial.nameEn}
                  aria-pressed={config.dial === dial.key}
                  onClick={() => setConfigKind('dial', dial.key)}
                />
              ))}
            </div>
          </div>

          <div className="cfg-group">
            <h4>{t('config.bezel')}</h4>
            <div className="opts">
              {catalog.options.bezel.map((bezel) => (
                <button
                  key={bezel.key}
                  className={`opt ${config.bezel === bezel.key ? 'active' : ''}`}
                  onClick={() => setConfigKind('bezel', bezel.key)}
                >
                  {lang === 'ar' ? bezel.nameAr : bezel.nameEn}
                </button>
              ))}
            </div>
          </div>

          <div className="cfg-group">
            <h4>{t('config.bracelet')}</h4>
            <div className="opts">
              {catalog.options.bracelet.map((bracelet) => (
                <button
                  key={bracelet.key}
                  className={`opt ${config.bracelet === bracelet.key ? 'active' : ''}`}
                  onClick={() => setConfigKind('bracelet', bracelet.key)}
                >
                  {lang === 'ar' ? bracelet.nameAr : bracelet.nameEn}
                </button>
              ))}
            </div>
          </div>

          <div className="cfg-footer">
            <div className="cfg-price">
              <span>{t('config.price')}</span>
              <strong>{fmt(price / 100)}</strong>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/boutiques" className="btn btn-ghost">{t('pd.enquire')}</Link>
              <button className="btn btn-gold" onClick={() => addToCart(product)}>{t('config.add')}</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
