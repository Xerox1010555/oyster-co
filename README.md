# OYSTER & CO. — Production Platform

## أولاً: التشغيل

```bash
npm install        # تثبيت الحزم
npm run setup      # prisma db push + بذرة الكتالوغ (ساعات/ثوابت/بوتيكات/حساب أدمن)
npm run build      # بناء الإنتاج
npm run start      # خادم الإنتاج على http://localhost:3000
npm run dev        # أو وضع التطوير
```

المتطلبات: Node ≥ 18.18 (مُختبَر على Node 24). قاعدة التطوير SQLite تُنشأ تلقائياً في `prisma/dev.db`.

**حساب الإدارة (من البذرة):**
- حساب الأدمن يُنشأ عند الـseed من `ADMIN_SEED_PASSWORD` (أو fallback تطويري) — لوحة `/admin` (طلبات + مواعيد + مشتركون + تغيير حالات الطلبات)

## المعمارية (Master Prompt → التنفيذ)

| الطبقة | التقنية | ملاحظات |
|---|---|---|
| Frontend | Next.js 15 App Router + React 19 + TypeScript strict | كل الأقسام Client Components داخل `ExperienceProvider` |
| التصميم | CSS مُنقول 1:1 من النسخة الأولى (tokens) | بديل خفيف ومطابق بصرياً عن Tailwind |
| خطوط | مُستضافة محلياً `public/fonts/` (15 ملف woff2: Cormorant/Inter/Cairo) | عزل كامل عن شبكات خارجية + كونسول صفر |
| 3D | Three.js r0.149 (نفس بنك v1) + GSAP 3.12.5 | محرك إجرائي في `src/lib/watch3d.js` (بناء مرة + تبديل خامات فوري) |
| DB | Prisma + SQLite (تطوير) ⇢ بدّل provider إلى postgresql في الإنتاج | مخطط في `prisma/schema.prisma` |
| Auth | جلسات موقّعة HMAC-SHA256 (scrypt لكلمات المرور) | httpOnly cookie `oc_session`، بدون اعتماديات خارجية |
| مدفوعات | Stripe Checkout عند توفر `STRIPE_SECRET_KEY` | بدونه: وضع **demo** — الطلب يؤكد فوراً بلا دفع حقيقي |
| بريد | Resend عند توفر `RESEND_API_KEY` | بدونه: لا يُرسل بريد (لوج فقط) |
| أسعار | /api/rates ⇢ open.er-api.com (ذاكرة 4س → DB → ثوابت) | العملاء: USD/EGP/AED/SAR |

### قرارات انحرافية واعية عن الـ Master Prompt
1. CSS tokens بدلاً من Tailwind v4 — للحفاظ على مطابقة بصرية 1:1 مع الملف الأصلي وتقليص مساحة المخاطرة.
2. i18n عميل (EN/AR، كوكيز `oc_lang`/`oc_cur` يقرأها الخادم) بدلاً من مسارات `[locale]` — تجربة مطابقة للنسخة الأصلية مع سباتة (persistence) تنشيطية.
3. Auth بسيط بالبريد/كلمة المرور بدلاً من Magic-Link/OAuth — يعمل بلا أي مفاتيح خارجية؛ جاهز للترقية عبر Auth.js لاحقاً.

## مناطق الواجهة
- `/` — التجربة الحيّة: Preloader، Hero، Story (مشهد مُفكّك بالتمرير)، Collection، Configurator، Craft، Testimonials، Boutiques، Newsletter — مع كونسول نظيف وسقوط آمن (no-webgl/فشل الخطوط مستحيل محلياً/تعليق Preloader 3.5ث).
- `/collection/[slug]` — صفحة موديل full-SEO + مُكوِّن فرعي (يتبدل الموديل في محرك 3D دون إعادة بناء).
- `/boutiques` — 3 بوتيكات + نموذج حجز مواعيد (= `/api/appointments`).
- `/login` ⇢ `/account/orders` — الطلبات الشخصية (سجل الأحداث OrderEvents).
- `/checkout/success?order=…` — إيصال (يعمل للضيوف برقم الطلب).
- `/admin` — محمي بدور admin: جدول طلبات (تغيير حالة عبر Server Action يُسجّل OrderEvent)، المواعيد، النشرة البريدية.

## API
`/api/health · rates · catalog/products[/slug] · cart (GET/POST) · cart/items/[id] (PATCH/DELETE) · checkout/session (GET mode, POST place) · orders · orders/[number] · webhooks/stripe · newsletter · appointments · auth/{register,login,logout,me}`

- السلة: **dedupe** مطابق لـ v1 (تكوين مطابق = سطر واحد)، تعديل كمية 1..9.
- التسعير: **الخادم هو المرجع** (`OptionPrice` في DB + ثوابت طوارئ)؛ العرض فقط للعميل.
- الويبهوك: `checkout.session.completed` ⇢ الحالة `paid` + حفظ `providerPaymentId`.

## ملاحظة قانونية (C3 — منجَزة في هذه النسخة)
تمت إعادة التسمية كاملةً في منصة الإنتاج: أسماء موديلات خيالية (Oceanos 300 · Velocita 4131 · Clairmont 41 · Meridian II)، أرقام مرجعية خاصة (OC/VL/CM/MD)، نقش القرص «OYSTER & CO. / HAUTE HORLOGERIE / GENEVA» بدل العبارات المسجّلة، حذف «PERPETUAL», «Jubilee», «Oystersteel», «Parachrom», «Cerachrom», «Pepsi» و«SWISS MADE»، وتعديل قواميس i18n (الوحده القصصية) — مع بقاء تنويه الوهمية والاستقلالية في الفوتر. المسار القديم `1/index.html` بقى كما هو كسجل أرشيفي. عند أي إطلاق تجاري حقيقي تبقى مسؤولية استشارة قانونية مختصة.

## خارطة ما بعد MVP
Auth.js (magic-link/GitHub) · اختبارات Playwright · الانتقال إلى Postgres + عدة عملات في Stripe · صور فوتوغرافية للمنتجات · تقارير مبيعات في /admin. *(البريد جاهز فعلياً: `RESEND_API_KEY` ⇢ تأكيد الطلب والموعد فوراً.)*
