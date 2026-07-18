import Image from 'next/image';
import { Container } from '@innovatix/ui';
import { SERVICE_CATEGORIES } from '@/lib/nav';
import { SITE } from '@/lib/site';

export function Footer() {
  const year = 2026; // static to keep the build deterministic; update via CMS later
  return (
    <footer className="bg-ink text-neutral-300">
      <Container className="grid gap-10 py-16 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="flex items-center">
            <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1.5">
              <Image src="/innovatix-logo.png" alt="Innovatix" width={480} height={191} className="h-8 w-auto" />
            </span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-neutral-400">{SITE.tagline}</p>
          <p className="mt-4 text-sm text-neutral-400">
            <a href={`mailto:${SITE.email}`} className="hover:text-white">{SITE.email}</a>
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            <a href={SITE.phoneHref} className="hover:text-white">{SITE.phone}</a>
          </p>
        </div>
        {SERVICE_CATEGORIES.slice(0, 3).map((cat) => (
          <div key={cat.key}>
            <div className="text-sm font-bold text-white">{cat.label}</div>
            <ul className="mt-3 space-y-2">
              {cat.items.slice(0, 4).map((it) =>
                it.planned ? (
                  <li key={it.href} className="text-sm text-neutral-500">{it.label}</li>
                ) : (
                  <li key={it.href}>
                    <a href={it.href} className="text-sm text-neutral-400 hover:text-white">{it.label}</a>
                  </li>
                ),
              )}
            </ul>
          </div>
        ))}
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-3 py-6 text-xs text-neutral-500 sm:flex-row">
          <span>© {year} Innovatix Systems. All rights reserved.</span>
          <nav className="flex gap-5" aria-label="Legal">
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/terms" className="hover:text-white">Terms</a>
            <a href="/cookie-policy" className="hover:text-white">Cookie Policy</a>
          </nav>
        </Container>
      </div>
    </footer>
  );
}
