import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scryptSync, randomBytes } from 'node:crypto';

const data = JSON.parse(readFileSync(join(process.cwd(), 'src/data/catalog.json'), 'utf8'));
const prisma = new PrismaClient();

// Same KDF as lib/auth (single source of hashing format)
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

async function main() {
  console.log('Seeding…');

  for (const d of data.dials) {
    await prisma.option.upsert({
      where: { kind_key: { kind: 'dial', key: d.key } },
      update: { nameEn: d.nameEn, nameAr: d.nameAr, colorHex: d.colorHex ?? null, sort: d.sort ?? 0 },
      create: { kind: 'dial', key: d.key, nameEn: d.nameEn, nameAr: d.nameAr, colorHex: d.colorHex ?? null, sort: d.sort ?? 0 },
    });
  }
  for (const [i, b] of data.bezels.entries()) {
    await prisma.option.upsert({
      where: { kind_key: { kind: 'bezel', key: b.key } },
      update: { nameEn: b.nameEn, nameAr: b.nameAr, sort: i },
      create: { kind: 'bezel', key: b.key, nameEn: b.nameEn, nameAr: b.nameAr, sort: i },
    });
  }
  for (const [i, br] of data.bracelets.entries()) {
    await prisma.option.upsert({
      where: { kind_key: { kind: 'bracelet', key: br.key } },
      update: { nameEn: br.nameEn, nameAr: br.nameAr, sort: i },
      create: { kind: 'bracelet', key: br.key, nameEn: br.nameEn, nameAr: br.nameAr, sort: i },
    });
  }

  for (const [kind, entries] of Object.entries(data.premiums)) {
    if (kind === 'dialNonStock') continue;
    for (const [key, cents] of Object.entries(entries)) {
      const exists = await prisma.optionPrice.findFirst({ where: { kind, key, productId: null } });
      if (!exists) await prisma.optionPrice.create({ data: { kind, key, cents } });
    }
  }

  for (const [i, p] of data.products.entries()) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        nameEn: p.nameEn, nameAr: p.nameAr, refCode: p.refCode,
        basePriceCents: p.basePriceCents, caseMm: p.caseMm, waterM: p.waterM,
        calibre: p.calibre, descEn: p.descEn, descAr: p.descAr, modelAccent: p.modelAccent,
      },
      create: { ...p, family: 'icon', publishState: 'published', sort: i },
    });
    const dialPremium = await prisma.optionPrice.findFirst({ where: { kind: 'dial', key: '_non_stock', productId: product.id } });
    if (!dialPremium) {
      await prisma.optionPrice.create({ data: { kind: 'dial', key: '_non_stock', cents: data.premiums.dialNonStock, productId: product.id } });
    }
  }

  for (const b of data.boutiques) {
    const exists = await prisma.boutique.findFirst({ where: { cityEn: b.cityEn } });
    if (!exists) await prisma.boutique.create({ data: b });
  }

  for (const [i, t] of data.testimonials.entries()) {
    const exists = await prisma.testimonial.findFirst({ where: { author: t.author } });
    if (!exists) await prisma.testimonial.create({ data: { ...t, sort: i } });
  }

  for (const [code, rate] of Object.entries(data.fallbackRates)) {
    await prisma.rate.upsert({
      where: { code },
      update: { rate },
      create: { code, rate },
    });
  }

  const adminEmail = data.adminSeed.email;
  const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        role: 'admin',
        passwordHash: hashPassword(process.env.ADMIN_SEED_PASSWORD || 'dev-only-change-me'),
      },
    });
    console.log('Admin user created:', adminEmail, '(password from ADMIN_SEED_PASSWORD env or dev fallback)');
  }

  console.log('Seed complete ✓');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
