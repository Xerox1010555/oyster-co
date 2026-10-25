import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { ExperienceProvider } from '@/components/provider';
import Preloader from '@/components/preloader';
import Cursor from '@/components/cursor';
import WatchStage from '@/components/watch-stage';
import Nav from '@/components/nav';
import CartDrawer from '@/components/cart-drawer';
import Footer from '@/components/footer';
import { getCatalog, getPremiums } from '@/lib/catalog-server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'OYSTER & CO. — Haute Horlogerie',
  description:
    'An independent Geneva maison. Four icons of horology — configure your dial, bezel and bracelet in live 3D and reserve through our concierge.',
  openGraph: {
    title: 'OYSTER & CO. — Haute Horlogerie',
    description: 'Four icons of horology, rendered live in 3D. Configure and reserve through the concierge.',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
};

const FAVICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0a0a0a"/><path d="M10 20 h44 M14 24 h36 M18 30 l14 -6 14 6 v6 H18 z M20 42 a5 5 0 1 1 0 .1 M38 42 a5 5 0 1 1 0 .1" stroke="#c9a961" fill="none" stroke-width="2.4"/></svg>',
  );

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [catalog, premiums] = await Promise.all([getCatalog(), getPremiums()]);

  return (
    <html lang="en" data-theme="dark">
      <body>
        <link rel="stylesheet" href="/fonts/fonts.css" />
        <link rel="icon" href={FAVICON} />
        <noscript>
          <div style={{ padding: '20vh 5vw', textAlign: 'center', color: '#f5f1e8', background: '#0a0a0a', minHeight: '100vh' }}>
            <h1 style={{ fontFamily: 'Georgia, serif', letterSpacing: '.3em' }}>OYSTER &amp; CO.</h1>
            <p style={{ marginTop: '1rem', opacity: 0.7 }}>
              The 3D experience needs JavaScript. Please enable it to explore the maison.
            </p>
          </div>
        </noscript>
        <ExperienceProvider catalog={catalog} premiums={premiums}>
          <Preloader />
          <Cursor />
          <WatchStage />
          <Nav />
          {children}
          <CartDrawer />
          <Footer />
        </ExperienceProvider>
      </body>
    </html>
  );
}
