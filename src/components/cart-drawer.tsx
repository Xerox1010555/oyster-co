'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CheckoutModal from './checkout-modal';
import { useApp } from './provider';
import { translate } from '@/lib/i18n';

/** Cart drawer (overlay + panel), server-synced cart state via useApp. */
export default function CartDrawer() {
  const {
    t, lang, cart, cartOpen, closeCart, changeQty, removeItem,
  } = useApp();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const router = useRouter();

  /* Escape closes; focus stays keyboard-navigable */
  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeCart(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cartOpen, closeCart]);

  const subtotal = cart?.subtotalCents ?? 0;

  return (
    <>
      <div
        id="cart-overlay"
        className={cartOpen ? 'open' : ''}
        onClick={closeCart}
        aria-hidden="true"
      />
      <aside id="cart-drawer" className={cartOpen ? 'open' : ''} aria-label={t('cart.title')} aria-hidden={!cartOpen}>
        <header>
          <h3>{t('cart.title')}</h3>
          <button className="ci-remove" onClick={closeCart} aria-label={t('a11y.close')}>✕</button>
        </header>
        <div className="cart-note">{t('cart.note')}</div>

        <div id="cart-items">
          {!cart || cart.isEmpty ? (
            <p className="cart-empty">{t('cart.empty')}</p>
          ) : (
            cart.items.map((item) => {
              const name = lang === 'ar' ? item.nameAr : item.nameEn;
              const cfg = `${translate(lang, `dial.${item.dialKey}`)} · ${translate(lang, `bezel.${item.bezelKey}`)} · ${translate(lang, `bracelet.${item.braceletKey}`)}`;
              return (
                <div className="cart-item" key={item.id}>
                  <div
                    className="ci-dial"
                    style={{
                      background: item.dialHex
                        ? `radial-gradient(circle at 36% 30%, ${item.modelAccent} 0%, ${item.dialHex} 38%, #0a0a0a 92%)`
                        : `radial-gradient(circle at 36% 30%, ${item.modelAccent}, #0a0a0a 78%)`,
                    }}
                    aria-hidden="true"
                  />
                  <div className="ci-info">
                    <strong>{name}</strong>
                    <span className="ci-cfg">{cfg}</span>
                    <span className="ci-price">{(item.unitPriceCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</span>
                  </div>
                  <button
                    className="ci-remove"
                    aria-label={t('cart.remove')}
                    onClick={() => removeItem(item.id)}
                  >
                    ✕
                  </button>
                  <div className="ci-qty">
                    <button aria-label={t('cart.qty.dec')} onClick={() => changeQty(item.id, -1)}>−</button>
                    <span aria-live="polite">{item.qty}</span>
                    <button aria-label={t('cart.qty.inc')} onClick={() => changeQty(item.id, +1)}>+</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-sub">
            <span>{t('cart.sub')}</span>
            <strong>{(subtotal / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</strong>
          </div>
          <button
            className="btn btn-gold btn-block"
            disabled={!cart || cart.isEmpty}
            onClick={() => {
              setCheckoutOpen(true);
              void router.prefetch('/checkout/success');
            }}
          >
            {t('cart.checkout')}
          </button>
        </div>
      </aside>

      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </>
  );
}
