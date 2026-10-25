import Link from 'next/link';
import { cookies } from 'next/headers';

export default async function CheckoutProblemPage() {
  const store = await cookies();
  const ar = store.get('oc_lang')?.value === 'ar';

  return (
    <main className="page-shell">
      <div className="success-wrap">
        <h1 className="page-title">{ar ? 'لم تكتمل العملية' : 'Checkout not completed'}</h1>
        <p className="page-sub" style={{ margin: '0 auto' }}>
          {ar ? 'لم تُنفذ أي دفعة. سلتك كما توقفتها — يمكنك المحاولة مرة أخرى في أي وقت.' :
            'No payment was processed. Your selections are still in the cart — you can try again at any time.'}
        </p>
        <p style={{ marginTop: '3rem', display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-gold">{ar ? 'واصل التجول' : 'Continue exploring'}</Link>
        </p>
      </div>
    </main>
  );
}
