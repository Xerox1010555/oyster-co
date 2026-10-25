import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { getOrCreateCart, serializeCart } from '@/lib/cart';
import { computeUnitPriceCents, makeConfigHash, FALLBACK_PREMIUMS, type PremiumMap } from '@/lib/currency';

export async function GET() {
  const user = await getSessionUser();
  const cart = await getOrCreateCart(user ? { id: user.id } : null);
  return NextResponse.json(await serializeCart(cart.id));
}

export async function POST(request: NextRequest) {
  try {
    const { slug, dialKey, bezelKey, braceletKey } = await request.json();
    if (typeof slug !== 'string' || typeof dialKey !== 'string' || typeof bezelKey !== 'string' || typeof braceletKey !== 'string') {
      return NextResponse.json({ error: 'bad request' }, { status: 400 });
    }
    const product = await prisma.product.findUnique({ where: { slug: slug } });
    if (!product) return NextResponse.json({ error: 'unknown product' }, { status: 404 });

    // Options must exist in their pools
    const [dial, bezel, bracelet] = await Promise.all([
      prisma.option.findUnique({ where: { kind_key: { kind: 'dial', key: dialKey } } }),
      prisma.option.findUnique({ where: { kind_key: { kind: 'bezel', key: bezelKey } } }),
      prisma.option.findUnique({ where: { kind_key: { kind: 'bracelet', key: braceletKey } } }),
    ]);
    if (!dial || !bezel || !bracelet) {
      return NextResponse.json({ error: 'unknown option' }, { status: 400 });
    }

    // Server-authoritative price (DB premiums → fallback constants)
    const prices = await prisma.optionPrice.findMany({ where: { productId: null } });
    const premiums: PremiumMap = {
      bracelet: { ...FALLBACK_PREMIUMS.bracelet },
      bezel: { ...FALLBACK_PREMIUMS.bezel },
    };
    for (const price of prices) {
      if (price.kind === 'bracelet') premiums.bracelet[price.key] = price.cents;
      if (price.kind === 'bezel') premiums.bezel[price.key] = price.cents;
    }
    const unitPriceCents = computeUnitPriceCents({
      basePriceCents: product.basePriceCents,
      stockDialKey: product.stockDialKey,
      dialKey, bezelKey, braceletKey, premiums,
    });

    const user = await getSessionUser();
    const cart = await getOrCreateCart(user ? { id: user.id } : null);
    const configHash = makeConfigHash(product.id, dialKey, bezelKey, braceletKey);

    // v1 semantics: identical configuration = a single line (dedupe), not double-add
    await prisma.cartItem.upsert({
      where: { cartId_configHash: { cartId: cart.id, configHash: configHash } },
      update: { qty: 1, unitPriceCents: unitPriceCents },
      create: {
        cartId: cart.id,
        productId: product.id,
        dialKey, bezelKey, braceletKey,
        qty: 1,
        unitPriceCents: unitPriceCents,
        configHash: configHash,
      },
    });

    return NextResponse.json(await serializeCart(cart.id));
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
