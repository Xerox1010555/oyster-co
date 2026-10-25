import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { getOrCreateCart, serializeCart, CART_COOKIE } from '@/lib/cart';
import { getRates } from '@/lib/rates';
import { transitionOrder, nextOrderNumber } from '@/lib/orders';
import { sendMail, orderConfirmationMail } from '@/lib/mail';
import { cookies } from 'next/headers';

export async function GET() {
  return NextResponse.json({ checkout: process.env.STRIPE_SECRET_KEY ? 'stripe' : 'demo' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const user = await getSessionUser();
    const cart = await getOrCreateCart(user ? { id: user.id } : null);
    const dto = await serializeCart(cart.id);
    if (dto.isEmpty) {
      return NextResponse.json({ error: 'cart is empty' }, { status: 400 });
    }

    const store = await cookies();
    const currency = store.get('oc_cur')?.value ?? 'USD';
    const { rates } = await getRates();
    const rateUsed = rates[currency] && rates[currency] > 0 ? rates[currency] : 1;

    // Option labels for the snapshot
    const options = await prisma.option.findMany();
    const nameBy = (kind: string, key: string) => options.find((o) => o.kind === kind && o.key === key)?.nameEn ?? key;
    const nameByAr = (kind: string, key: string) => options.find((o) => o.kind === kind && o.key === key)?.nameAr ?? key;

    const number = await nextOrderNumber();
    const totalCents = dto.subtotalCents;
    const useStripe = !!process.env.STRIPE_SECRET_KEY;

    const order = await prisma.order.create({
      data: {
        number: number,
        userId: user?.id ?? null,
        email: String(body.email ?? user?.email ?? 'guest@oysterand.co').toLowerCase(),
        name: body.name ? String(body.name) : null,
        phone: body.phone ? String(body.phone) : null,
        city: body.city ? String(body.city) : null,
        address: body.address ? String(body.address) : null,
        currency: currency,
        rateUsed: rateUsed,
        totalCents: totalCents,
        status: useStripe ? 'pending' : 'confirmed',
        provider: useStripe ? 'stripe' : 'demo',
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            unitPriceCents: item.unitPriceCents,
            qty: item.qty,
            configJson: JSON.stringify({
              dialKey: item.dialKey, bezelKey: item.bezelKey, braceletKey: item.braceletKey,
              labelEn: `${item.nameEn} — ${nameBy('dial', item.dialKey)} / ${nameBy('bezel', item.bezelKey)} / ${nameBy('bracelet', item.braceletKey)}`,
              labelAr: `${item.nameAr} — ${nameByAr('dial', item.dialKey)} / ${nameByAr('bezel', item.bezelKey)} / ${nameByAr('bracelet', item.braceletKey)}`,
            }),
          })),
        },
      },
    });
    await prisma.orderEvent.create({
      data: { orderId: order.id, from: null, to: order.status, by: useStripe ? 'system' : 'demo-checkout' },
    });

    if (useStripe) {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        // Stripe settles in USD; the order keeps the display currency + rate used
        currency: 'usd',
        line_items: dto.items.map((item) => ({
          quantity: item.qty,
          price_data: {
            currency: 'usd',
            unit_amount: item.unitPriceCents,
            product_data: { name: `OYSTER & CO. ${item.nameEn} — ${item.bezelKey} / ${item.braceletKey}` },
          },
        })),
        success_url: `${site}/checkout/success?order=${number}`,
        cancel_url: `${site}/checkout/problem`,
        metadata: { orderId: order.id, number: number },
      });
      await prisma.order.update({
        where: { id: order.id },
        data: { providerSessionId: session.id },
      });
      return NextResponse.json({ checkout: 'stripe', url: session.url });
    }

    /* Demo mode: order confirmed instantly — no payment is processed */
    await prisma.cart.delete({ where: { id: cart.id } }); // clears items via cascade
    const mail = orderConfirmationMail(
      String(body.name ?? 'valued client'),
      number,
      `$${(totalCents / 100).toLocaleString('en-US')}`,
      dto.items.map((item) => `${item.qty} × ${item.nameEn} (${item.dialKey}/${item.bezelKey}/${item.braceletKey})`),
    );
    await sendMail({ to: order.email, subject: mail.subject, html: mail.html });
    const res = NextResponse.json({
      checkout: 'demo',
      url: `/checkout/success?order=${number}`,
      cart: { items: [], count: 0, subtotalCents: 0, isEmpty: true },
    });
    // Retire the cart cookie so the next visit starts a fresh cart
    res.cookies.set(CART_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  } catch (error) {
    console.error('checkout error', error);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
