import Image from 'next/image';
import { Facebook } from 'lucide-react';
import { Container } from '@innovatix/ui';
import { SERVICE_CATEGORIES } from '@/lib/nav';
import { SITE } from '@/lib/site';

export function Footer() {
  const year = 2026; // static to keep the build deterministic; update via CMS later
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 text-neutral-600">
      <Container className="grid gap-10 py-16 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="flex shrink-0 items-center">
            {/* Natural aspect ratio (480×191) preserved: fixed responsive height + w-auto. */}
            <Image
              src="/innovatix-logo.png"
              alt="Innovatix Marketing"
              width={480}
              height={191}
              sizes="(max-width: 640px) 180px, 220px"
              className="h-8 w-auto object-contain sm:h-9 md:h-10"
            />
          </div>
          <p className="mt-4 max-w-sm text-sm text-neutral-500">{SITE.tagline}</p>
          <p className="mt-4 text-sm text-neutral-500">
            <a href={`mailto:${SITE.email}`} className="hover:text-primary">{SITE.email}</a>
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            <a href={SITE.phoneHref} className="hover:text-primary">{SITE.phone}</a>
          </p>
          <address className="mt-1 text-sm not-italic text-neutral-500">{SITE.address.full}</address>
          <div className="mt-4 flex items-center gap-3">
            <a
              href={SITE.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Innovatix on Facebook"
              className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-300 text-neutral-500 transition hover:border-primary/40 hover:text-primary"
            >
              <Facebook size={18} />
            </a>
          </div>
        </div>
        {SERVICE_CATEGORIES.slice(0, 3).map((cat) => (
          <div key={cat.key}>
            <div className="text-sm font-bold text-neutral-900">{cat.label}</div>
            <ul className="mt-3 space-y-2">
              {cat.items.slice(0, 4).map((it) =>
                it.planned ? (
                  <li key={it.href} className="text-sm text-neutral-400">{it.label}</li>
                ) : (
                  <li key={it.href}>
                    <a href={it.href} className="text-sm text-neutral-500 hover:text-primary">{it.label}</a>
                  </li>
                ),
              )}
            </ul>
          </div>
        ))}
      </Container>
      <div className="border-t border-neutral-200">
        <Container className="flex flex-col items-center justify-between gap-3 py-6 text-xs text-neutral-500 sm:flex-row">
          <span>© {year} Innovatix Systems. All rights reserved.</span>
          <nav className="flex flex-wrap gap-5" aria-label="Legal">
            <a href={SITE.portalUrl} className="font-semibold text-neutral-700 hover:text-primary">Client Portal</a>
            <a href="/privacy" className="hover:text-primary">Privacy</a>
            <a href="/terms" className="hover:text-primary">Terms</a>
            <a href="/cookie-policy" className="hover:text-primary">Cookie Policy</a>
            <a href="/sitemap.xml" className="hover:text-primary">Sitemap</a>
          </nav>
        </Container>
      </div>
    </footer>
  );
}
