'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useApp, type ProductDTO } from './provider';
import { computeUnitPriceCents } from '@/lib/currency';
import type { BoutiqueDTO, TestimonialDTO } from '@/lib/catalog-server';

gsap.registerPlugin(ScrollTrigger);

/* ───────────────────────────────── HERO ───────────────────────────── */
export function Hero() {
  const { t } = useApp();
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tween = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tween
      .from('#hero .hero-kicker', { y: 24, opacity: 0, duration: 1 }, 0.5)
      .from('#hero .line > span', { yPercent: 120, duration: 1.25, stagger: 0.16 }, 0.6)
      .from('#hero .hero-sub', { y: 26, opacity: 0, duration: 1 }, 1.15)
      .from('#hero .hero-ctas .btn', { y: 20, opacity: 0, duration: 0.9, stagger: 0.12 }, 1.3)
      .from('#hero .hero-hint', { opacity: 0, duration: 1.2 }, 1.8);
    return () => { tween.kill(); };
  }, []);

  return (
    <section id="hero" ref={rootRef}>
      <div className="hero-text">
        <p className="hero-kicker">{t('hero.kicker')}</p>
        <h1 className="hero-title">
          <span className="line"><span>{t('hero.title1')}</span></span>
          <span className="line"><span>{t('hero.title2')}</span></span>
        </h1>
      </div>
      <div className="hero-ui">
        <p className="hero-sub">{t('hero.sub')}</p>
        <div className="hero-ctas">
          <a href="#collection" className="btn btn-gold">{t('hero.cta1')}</a>
          <a href="#configurator" className="btn btn-ghost">{t('hero.cta2')}</a>
        </div>
        <div className="hero-hint">
          <span>{t('hero.scroll')}</span>
          <span className="hint-line" />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── STORY ────────────────────────────── */
const CALLOUT_COUNT = 5;

export function Story() {
  const { t, dir } = useApp();

  useEffect(() => {
    const story = document.getElementById('story');
    if (!story) return;
    const callouts = Array.from({ length: CALLOUT_COUNT }, (_, i) => document.getElementById(`callout-${i + 1}`)).filter(Boolean) as HTMLElement[];
    if (!callouts.length) return;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '#story', start: 'top top', end: 'bottom bottom', scrub: 1 },
    });
    callouts.forEach((el, i) => {
      const at = 0.06 + i * 0.17;
      tl.fromTo(el, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.04 }, at);
      if (i < callouts.length - 1) tl.to(el, { autoAlpha: 0, y: -18, duration: 0.03 }, at + 0.14);
    });
    tl.to(callouts[callouts.length - 1], { autoAlpha: 0, y: -18, duration: 0.04 }, 0.93);
    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
      callouts.forEach((el) => gsap.set(el, { clearProps: 'all' }));
    };
  }, [dir]);

  return (
    <section id="story" aria-label={t('story.title')}>
      <div className="story-head">
        <p className="kicker">{t('story.kicker')}</p>
        <h2 className="section-title">{t('story.title')}</h2>
      </div>
      {Array.from({ length: CALLOUT_COUNT }, (_, i) => (
        <div className="callout" id={`callout-${i + 1}`} key={i} dir={dir}>
          <span className="co-dot" />
          <span className="co-line" />
          <div>
            <h3>{t(`story.c${i + 1}t`)}</h3>
            <p>{t(`story.c${i + 1}d`)}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

/* ──────────────────────────── READOUT ─────────────────────────────── */
export function WatchReadout({ product }: { product: ProductDTO }) {
  const { t, fmt, config, premiums } = useApp();
  const price = computeUnitPriceCents({
    basePriceCents: product.basePriceCents,
    stockDialKey: product.stockDialKey,
    dialKey: config.dial, bezelKey: config.bezel, braceletKey: config.bracelet,
    premiums,
  });
  return (
    <aside className="watch-readout">
      <div className="ro-model">{t(`dial.${config.dial}`)} · {product.nameEn}</div>
      <div className="ro-ref">{product.refCode}</div>
      <div className="ro-price">{fmt(price / 100)}</div>
      <ul className="ro-specs">
        <li>{t('collection.case')} <b>{product.caseMm}</b></li>
        <li>{t('collection.water')} <b>{product.waterM}</b></li>
        <li>{t('collection.calibre')} <b>{product.calibre}</b></li>
      </ul>
      <Link href={`/collection/${product.slug}`} className="btn btn-ghost" style={{ padding: '11px 22px' }}>
        {t('collection.view')}
      </Link>
    </aside>
  );
}

/* ─────────────────────────── COLLECTION ───────────────────────────── */
export function Collection() {
  const { t, fmt, catalog, config, setConfigKind, addToCart, premiums, lang } = useApp();

  return (
    <section id="collection" className="section">
      <div className="wrap grid-2">
        <div className="stage-col" aria-hidden="false">
          <WatchReadout product={catalog.products.find((p) => p.slug === config.model) ?? catalog.products[0]} />
        </div>
        <div>
          <p className="kicker">{t('collection.kicker')}</p>
          <h2 className="section-title">{t('collection.title')}</h2>
          <p className="lead" style={{ marginTop: '1rem' }}>{t('collection.sub')}</p>

          <div className="cards">
            {catalog.products.map((product) => {
              const active = config.model === product.slug;
              const price = computeUnitPriceCents({
                basePriceCents: product.basePriceCents,
                stockDialKey: product.stockDialKey,
                dialKey: product.stockDialKey, bezelKey: product.stockBezelKey,
                braceletKey: product.stockBraceletKey, premiums,
              });
              return (
                <article
                  key={product.slug}
                  className={`card ${active ? 'active' : ''}`}
                  data-badge={t('collection.selected')}
                  onClick={() => setConfigKind('model', product.slug, product)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setConfigKind('model', product.slug, product);
                    }
                  }}
                >
                  <div
                    className="card-dial"
                    style={{ background: `radial-gradient(circle at 36% 30%, ${product.modelAccent}, #0a0a0a 78%)` }}
                    aria-hidden="true"
                  />
                  <h3>{lang === 'ar' ? product.nameAr : product.nameEn}</h3>
                  <div className="card-ref">{product.refCode}</div>
                  <div className="card-specs">
                    <span>{product.caseMm}</span>
                    <span>{product.waterM}</span>
                    <span>{product.calibre}</span>
                  </div>
                  <div className="card-foot">
                    <span className="card-price">{fmt(price / 100)}</span>
                    <span style={{ display: 'flex', gap: 8 }}>
                      <Link
                        href={`/collection/${product.slug}`}
                        className="card-add"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {t('collection.view')}
                      </Link>
                      <button
                        className="card-add"
                        onClick={(event) => {
                          event.stopPropagation();
                          addToCart(product, {
                            dialKey: product.stockDialKey,
                            bezelKey: product.stockBezelKey,
                            braceletKey: product.stockBraceletKey,
                          });
                        }}
                      >
                        {t('collection.add')}
                      </button>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── CONFIGURATOR ──────────────────────────── */
export function Configurator() {
  const { t, fmt, catalog, config, setConfigKind, addToCart, premiums, lang } = useApp();
  const product = catalog.products.find((p) => p.slug === config.model) ?? catalog.products[0];
  const price = computeUnitPriceCents({
    basePriceCents: product.basePriceCents,
    stockDialKey: product.stockDialKey,
    dialKey: config.dial, bezelKey: config.bezel, braceletKey: config.bracelet,
    premiums,
  });
  const name = lang === 'ar' ? product.nameAr : product.nameEn;

  return (
    <section id="configurator" className="section">
      <div className="wrap grid-2">
        <div className="stage-col" aria-hidden="true" />
        <div>
          <p className="kicker">{t('config.kicker')}</p>
          <h2 className="section-title">{t('config.title')}</h2>
          <p className="lead" style={{ marginTop: '1rem' }}>{t('config.sub')}</p>

          <div className="cfg-model" role="group" aria-label={t('config.model')}>
            {catalog.products.map((p) => (
              <button
                key={p.slug}
                className={config.model === p.slug ? 'active' : ''}
                onClick={() => setConfigKind('model', p.slug, p)}
              >
                {lang === 'ar' ? p.nameAr : p.nameEn}
              </button>
            ))}
          </div>

          <div className="cfg-group" aria-label={t('config.dial')}>
            <h4>{t('config.dial')} — {name}</h4>
            <div className="swatches">
              {catalog.options.dial.map((dial) => (
                <button
                  key={dial.key}
                  className={`swatch ${config.dial === dial.key ? 'active' : ''}`}
                  style={{ background: dial.colorHex ?? '#111' }}
                  title={lang === 'ar' ? dial.nameAr : dial.nameEn}
                  aria-label={lang === 'ar' ? dial.nameAr : dial.nameEn}
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
                  aria-pressed={config.bezel === bezel.key}
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
                  aria-pressed={config.bracelet === bracelet.key}
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
              <Link href="/boutiques" className="btn btn-ghost">{t('config.enquire')}</Link>
              <button className="btn btn-gold" onClick={() => addToCart(product)}>{t('config.add')}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── CRAFT ──────────────────────────────── */
const COUNTERS = [
  { val: 1905, key: 'craft.s1' },
  { val: 300, key: 'craft.s2' },
  { val: 70, key: 'craft.s3' },
  { val: 28800, key: 'craft.s4' },
];

export function Craft() {
  const { t } = useApp();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const nums = Array.from(section.querySelectorAll<HTMLElement>('.num'));
    const triggers: ScrollTrigger[] = [];
    nums.forEach((num) => {
      const target = Number(num.dataset.val ?? 0);
      const obj = { v: 0 };
      const tween = gsap.to(obj, {
        v: target,
        duration: 2.2,
        ease: 'power3.out',
        scrollTrigger: { trigger: num, start: 'top 85%', once: true },
        onUpdate: () => { num.textContent = Math.round(obj.v).toLocaleString('en-US'); },
      });
      if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
    });
    return () => { triggers.forEach((tr) => tr.kill()); };
  }, []);

  return (
    <section id="craft" className="section" ref={sectionRef}>
      <div className="wrap narrow">
        <p className="kicker">{t('craft.kicker')}</p>
        <h2 className="section-title">{t('craft.title')}</h2>
        <div className="craft-pars">
          <p>{t('craft.p1')}</p>
          <p>{t('craft.p2')}</p>
        </div>
        <div className="counters">
          {COUNTERS.map((counter) => (
            <div className="counter" key={counter.key}>
              <span className="num" data-val={counter.val}>0</span>
              <span className="lbl">{t(counter.key)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── TESTIMONIALS ──────────────────────────── */
export function Testimonials({ testimonials }: { testimonials: TestimonialDTO[] }) {
  const { t, lang } = useApp();
  const [idx, setIdx] = useState(0);
  const count = Math.max(1, testimonials.length);

  useEffect(() => {
    const timer = setInterval(() => setIdx((i) => (i + 1) % count), 7000);
    return () => clearInterval(timer);
  }, [count]);

  const onKey = (event: React.KeyboardEvent) => {
    const flip = lang === 'ar' ? -1 : 1;
    if (event.key === 'ArrowRight') setIdx((i) => (i - flip + count) % count);
    else if (event.key === 'ArrowLeft') setIdx((i) => (i + flip) % count);
    else if (event.key === 'Home') setIdx(0);
    else if (event.key === 'End') setIdx(count - 1);
  };

  const current = testimonials[idx % count];

  return (
    <section id="testimonials" className="section">
      <div className="wrap narrow" tabIndex={0} onKeyDown={onKey} aria-roledescription="carousel">
        <p className="kicker">{t('testi.kicker')}</p>
        <h2 className="section-title">{t('testi.title')}</h2>
        <div className="t-carousel">
          <div className="t-quote" key={idx} style={{ animation: 'modalIn .6s var(--ease)' }}>
            <blockquote>
              {lang === 'ar' ? current?.quoteAr : current?.quoteEn}
            </blockquote>
            <cite>{current?.author} — {lang === 'ar' ? current?.cityAr : current?.cityEn}</cite>
          </div>
          <div className="t-dots" role="tablist">
            {testimonials.map((_, i) => (
              <button
                key={i}
                className={i === idx % count ? 'active' : ''}
                onClick={() => setIdx(i)}
                aria-label={`Testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────── BOUTIQUES ───────────────────────────── */
export function Boutiques({ boutiques }: { boutiques: BoutiqueDTO[] }) {
  const { t, lang } = useApp();
  return (
    <section id="boutiques" className="section">
      <div className="wrap">
        <p className="kicker">{t('bout.kicker')}</p>
        <h2 className="section-title">{t('bout.title')}</h2>
        <div className="boutiques">
          {boutiques.map((boutique) => (
            <article className="boutique" key={boutique.id}>
              <h3>{lang === 'ar' ? boutique.cityAr : boutique.cityEn}</h3>
              <p className="b-addr">{lang === 'ar' ? boutique.addressAr : boutique.addressEn}</p>
              <div className="b-meta">
                <span>{lang === 'ar' ? boutique.hoursAr : boutique.hoursEn}</span>
                <a href={`tel:${boutique.phone.replace(/\s+/g, '')}`}>{t('bout.call')} · {boutique.phone}</a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── NEWSLETTER ───────────────────────────── */
export function Newsletter() {
  const { t, lang } = useApp();
  const [email, setEmail] = useState('');
  const [ok, setOk] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.includes('@')) return;
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale: lang }),
      });
      if (res.ok) { setOk(true); setEmail(''); }
    } catch { /* silent */ }
  };

  return (
    <section id="newsletter" className="section">
      <div className="wrap narrow">
        <p className="kicker">{t('news.kicker')}</p>
        <h2 className="section-title">{t('news.title')}</h2>
        <p className="lead" style={{ marginTop: '1rem' }}>{t('news.sub')}</p>
        <form className="news-form" onSubmit={submit}>
          <input
            type="email"
            required
            placeholder={t('news.ph')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-label={t('news.ph')}
          />
          <button className="btn btn-gold" type="submit">{t('news.btn')}</button>
        </form>
        {ok ? <p className="news-ok">{t('news.ok')}</p> : null}
      </div>
    </section>
  );
}

/* ──────────────────────── COMPOSED HOME PAGE ──────────────────────── */
export default function HomeSections({
  boutiques, testimonials,
}: { boutiques: BoutiqueDTO[]; testimonials: TestimonialDTO[] }) {
  return (
    <main id="app">
      <Hero />
      <Story />
      <Collection />
      <Configurator />
      <Craft />
      <Testimonials testimonials={testimonials} />
      <Boutiques boutiques={boutiques} />
      <Newsletter />
    </main>
  );
}
