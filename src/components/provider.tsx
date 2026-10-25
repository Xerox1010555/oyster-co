'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { DICT, translate, type Lang } from '@/lib/i18n';
import { FALLBACK_RATES, fmt as fmtMoney, computeUnitPriceCents, type Rates, type PremiumMap } from '@/lib/currency';

/* ── Shared client types ─────────────────────────────────────────── */
export type ProductDTO = {
  id: string; slug: string;
  nameEn: string; nameAr: string; refCode: string;
  basePriceCents: number; caseMm: string; waterM: string; calibre: string;
  descEn: string; descAr: string;
  stockDialKey: string; stockBezelKey: string; stockBraceletKey: string;
  modelAccent: string;
};
export type OptionDTO = { key: string; nameEn: string; nameAr: string; colorHex?: string | null };
export type CatalogDTO = {
  products: ProductDTO[];
  options: { dial: OptionDTO[]; bezel: OptionDTO[]; bracelet: OptionDTO[] };
};

export type CartLine = {
  id: string; slug: string; nameEn: string; nameAr: string;
  dialKey: string; bezelKey: string; braceletKey: string; dialHex: string | null;
  modelAccent: string; qty: number; unitPriceCents: number; lineTotalCents: number;
};
export type CartDTO = { items: CartLine[]; count: number; subtotalCents: number; isEmpty: boolean };
export type ConfigKind = 'dial' | 'bezel' | 'bracelet' | 'model';

type ExperienceCtx = {
  lang: Lang; setLang: (l: Lang) => void;
  theme: 'dark' | 'light'; setTheme: (t: 'dark' | 'light') => void;
  currency: string; setCurrency: (c: string) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
  fmt: (usd: number) => string;
  config: { model: string; dial: string; bezel: string; bracelet: string };
  setConfigKind: (kind: ConfigKind, key: string, product?: ProductDTO) => void;
  catalog: CatalogDTO;
  premiums: PremiumMap;
  cart: CartDTO | null;
  cartOpen: boolean; openCart: () => void; closeCart: () => void;
  addToCart: (product: ProductDTO, config?: { dialKey?: string; bezelKey?: string; braceletKey?: string }) => Promise<void>;
  changeQty: (itemId: string, delta: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  toast: (msg: string) => void;
  clearCartLocal: () => void;
};

const Ctx = createContext<ExperienceCtx | null>(null);
const PREFS_KEY = 'oyster-co-prefs';
const RATES_KEY = 'oyster-co-rates';
const RATES_TTL = 4 * 60 * 60 * 1000;

export function ExperienceProvider({
  children, catalog, premiums, initialCurrency = 'USD',
}: {
  children: React.ReactNode;
  catalog: CatalogDTO;
  premiums: PremiumMap;
  initialCurrency?: string;
}) {
  const first = catalog.products[0];
  const [lang, setLangState] = useState<Lang>('en');
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  const [currency, setCurrencyState] = useState<string>(initialCurrency);
  const [rates, setRates] = useState<Rates>(FALLBACK_RATES);
  const [cart, setCart] = useState<CartDTO | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [config, setConfigState] = useState({
    model: first?.slug ?? 'submariner',
    dial: first?.stockDialKey ?? 'black',
    bezel: first?.stockBezelKey ?? 'ceramic',
    bracelet: first?.stockBraceletKey ?? 'steel',
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Restore saved preferences (lang/theme/currency) ──────────── */
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
      if (prefs) {
        if (prefs.lang === 'en' || prefs.lang === 'ar') setLangState(prefs.lang);
        if (prefs.theme === 'dark' || prefs.theme === 'light') setThemeState(prefs.theme);
        if (['USD', 'EGP', 'AED', 'SAR'].includes(prefs.currency)) setCurrencyState(prefs.currency);
      }
    } catch { /* private mode etc. */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = DICT[lang]['meta.title'];
    document.documentElement.dataset.theme = theme;
  }, [lang, theme]);

  const persist = useCallback((next: { lang: Lang; theme: string; currency: string }) => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      // Server-side pages read the language/currency preference from cookies
      document.cookie = `oc_lang=${next.lang};path=/;max-age=${180 * 24 * 3600};samesite=lax`;
      document.cookie = `oc_cur=${next.currency};path=/;max-age=${180 * 24 * 3600};samesite=lax`;
    } catch { /* ignore */ }
  }, []);

  const setLang = useCallback((l: Lang) => { setLangState(l); persist({ lang: l, theme, currency }); }, [persist, theme, currency]);
  const setTheme = useCallback((t: 'dark' | 'light') => { setThemeState(t); persist({ lang, theme: t, currency }); }, [persist, lang, currency]);
  const setCurrency = useCallback((c: string) => { setCurrencyState(c); persist({ lang, theme, currency: c }); }, [persist, lang, theme]);

  /* ── Live rates (cached; network → stale cache) ───────────────── */
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const cached = JSON.parse(localStorage.getItem(RATES_KEY) || 'null');
        if (cached?.rates && Date.now() - cached.t < RATES_TTL) {
          setRates({ ...FALLBACK_RATES, ...cached.rates });
        }
        const res = await fetch('/api/rates');
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data?.rates) {
            setRates({ ...FALLBACK_RATES, ...data.rates });
            try { localStorage.setItem(RATES_KEY, JSON.stringify({ t: Date.now(), rates: data.rates })); } catch { /* ignore */ }
          }
        }
      } catch { /* offline-safe */ }
    }
    boot();
    return () => { cancelled = true; };
  }, []);

  /* ── Cart boot from server ────────────────────────────────────── */
  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch('/api/cart', { cache: 'no-store' });
      if (res.ok) setCart(await res.json());
    } catch { /* offline-safe */ }
  }, []);
  useEffect(() => { refreshCart(); }, [refreshCart]);

  /* ── Config selection with model-default snap (v1 semantics) ──── */
  const setConfigKind = useCallback((kind: ConfigKind, key: string, product?: ProductDTO) => {
    setConfigState(prev => {
      if (kind === 'model' && product) {
        return { model: product.slug, dial: product.stockDialKey, bezel: product.stockBezelKey, bracelet: product.stockBraceletKey };
      }
      return { ...prev, [kind]: key };
    });
  }, []);

  const fmt = useCallback((usd: number) => fmtMoney(usd, currency, rates), [currency, rates]);

  /* ── Toast ─────────────────────────────────────────────────────── */
  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2400);
  }, []);

  /* ── Cart mutations (server-authoritative) ────────────────────── */
  const addToCart = useCallback(async (product: ProductDTO, custom?: { dialKey?: string; bezelKey?: string; braceletKey?: string }) => {
    const body = {
      slug: product.slug,
      dialKey: custom?.dialKey ?? config.dial,
      bezelKey: custom?.bezelKey ?? config.bezel,
      braceletKey: custom?.braceletKey ?? config.bracelet,
    };
    try {
      const res = await fetch('/api/cart', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = (await res.json()) as CartDTO;
        setCart(data);
        toast(translate(lang, 'toast.add'));
      }
    } catch { toast('Error'); }
  }, [config, lang, toast]);

  const changeQty = useCallback(async (itemId: string, delta: number) => {
    const current = cart?.items.find(item => item.id === itemId);
    if (!current) return;
    if (current.qty + delta <= 0) return removeItem(itemId);
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta }),
      });
      if (res.ok) setCart(await res.json());
    } catch { /* noop */ }
  }, [cart]);

  const removeItem = useCallback(async (itemId: string) => {
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, { method: 'DELETE' });
      if (res.ok) { setCart(await res.json()); toast(translate(lang, 'toast.removed')); }
    } catch { /* noop */ }
  }, [lang, toast]);

  const clearCartLocal = useCallback(() => setCart({ items: [], count: 0, subtotalCents: 0, isEmpty: true }), []);

  const value: ExperienceCtx = useMemo(() => ({
    lang, setLang, theme, setTheme, currency, setCurrency,
    t: (key: string) => translate(lang, key),
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    fmt,
    config, setConfigKind,
    catalog, premiums,
    cart, cartOpen, openCart: () => setCartOpen(true), closeCart: () => setCartOpen(false),
    addToCart, changeQty, removeItem, toast, clearCartLocal,
  }), [lang, setLang, theme, setTheme, currency, setCurrency, fmt, config, setConfigKind, catalog, premiums, cart, cartOpen, addToCart, changeQty, removeItem, toast, clearCartLocal]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div id="toast" role="status" aria-live="polite" className={toastMsg ? 'show' : ''}>{toastMsg ?? ''}</div>
    </Ctx.Provider>
  );
}

export function useApp(): ExperienceCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside <ExperienceProvider>');
  return ctx;
}
