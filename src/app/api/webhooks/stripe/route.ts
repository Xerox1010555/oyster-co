import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { transitionOrder } from '@/lib/orders';

/** Stripe webhook. Active only when STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET are set. */
export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ received: false, reason: 'stripe not configured' }, { status: 503 });
  }
  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(secretKey);
    const raw = await request.text();
    const signature = request.headers.get('stripe-signature') ?? '';
    const event = await stripe.webhooks.constructEventAsync(raw, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as { metadata?: Record<string, string>; payment_intent?: string | null };
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { providerPaymentId: session.payment_intent ?? null },
        });
        await transitionOrder(orderId, 'paid', 'stripe');
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('stripe webhook error', error);
    return NextResponse.json({ error: 'invalid webhook' }, { status: 400 });
  }
}
