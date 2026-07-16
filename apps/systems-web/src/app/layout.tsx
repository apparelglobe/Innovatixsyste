import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SITE } from '@/lib/site';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
import { organizationJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: 'Innovatix Systems — Enterprise Software, AI & Platforms',
    template: '%s',
  },
  description: SITE.description,
  applicationName: SITE.name,
  alternates: { canonical: SITE.url },
  openGraph: { siteName: SITE.name, type: 'website', url: SITE.url },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <JsonLd data={organizationJsonLd()} />
        <AnalyticsProvider />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
