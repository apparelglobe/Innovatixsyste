'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Container, Button } from '@innovatix/ui';
import { PRIMARY_NAV, SERVICE_CATEGORIES } from '@/lib/nav';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-base/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4">
        {/* Wordmark */}
        <a href="/" className="flex items-center gap-2.5" aria-label="Innovatix Systems home">
          <Image src="/logo-mark-ui.png" alt="" width={40} height={40} priority className="h-9 w-9 object-contain" />
          <span className="text-lg font-extrabold tracking-tight text-white">
            Innovatix<span className="text-primary-light"> Systems</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          <div className="relative">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-btn px-3 py-2 text-sm font-semibold text-neutral-300 transition hover:text-white"
              aria-expanded={megaOpen}
              onMouseEnter={() => setMegaOpen(true)}
              onClick={() => setMegaOpen((v) => !v)}
            >
              Services <ChevronDown size={15} className={megaOpen ? 'rotate-180 transition' : 'transition'} />
            </button>
          </div>
          {PRIMARY_NAV.filter((n) => !('mega' in n && n.mega)).map((n) => (
            <a key={n.href} href={n.href} className="rounded-btn px-3 py-2 text-sm font-semibold text-neutral-300 transition hover:text-white">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Button href="/book" size="md" data-cta="Book a Consultation" data-cta-loc="header">Book a Consultation</Button>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-btn p-2 text-neutral-300 lg:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </Container>

      {/* Desktop mega-menu panel */}
      {megaOpen && (
        <div
          className="absolute inset-x-0 hidden border-b border-line bg-elevated shadow-pop lg:block"
          onMouseEnter={() => setMegaOpen(true)}
          onMouseLeave={() => setMegaOpen(false)}
        >
          <Container className="grid grid-cols-4 gap-x-8 gap-y-6 py-8">
            {SERVICE_CATEGORIES.map((cat) => (
              <div key={cat.key}>
                <a href={`/services/${cat.key}`} className="text-sm font-bold text-white hover:text-primary-light">
                  {cat.label}
                </a>
                <p className="mt-0.5 text-xs text-neutral-500">{cat.blurb}</p>
                <ul className="mt-3 space-y-1.5">
                  {cat.items.slice(0, 5).map((it) =>
                    it.planned ? (
                      <li key={it.href} className="text-sm text-neutral-500" title="Coming soon">{it.label}</li>
                    ) : (
                      <li key={it.href}>
                        <a href={it.href} className="text-sm text-neutral-300 transition hover:text-primary-light">{it.label}</a>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ))}
          </Container>
        </div>
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-line bg-base lg:hidden">
          <Container className="space-y-4 py-4">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500">Services</div>
              <div className="space-y-3">
                {SERVICE_CATEGORIES.map((cat) => (
                  <details key={cat.key} className="rounded-btn border border-line bg-surface px-3 py-2">
                    <summary className="cursor-pointer text-sm font-semibold text-white">{cat.label}</summary>
                    <ul className="mt-2 space-y-1.5 pl-2">
                      {cat.items.map((it) =>
                        it.planned ? (
                          <li key={it.href} className="text-sm text-neutral-500">{it.label}</li>
                        ) : (
                          <li key={it.href}>
                            <a href={it.href} className="text-sm text-neutral-300">{it.label}</a>
                          </li>
                        ),
                      )}
                    </ul>
                  </details>
                ))}
              </div>
            </div>
            <nav className="grid gap-1" aria-label="Mobile">
              {PRIMARY_NAV.filter((n) => !('mega' in n && n.mega)).map((n) => (
                <a key={n.href} href={n.href} className="rounded-btn px-2 py-2 text-sm font-semibold text-neutral-300">{n.label}</a>
              ))}
            </nav>
            <Button href="/book" className="w-full" data-cta="Book a Consultation" data-cta-loc="header-mobile">Book a Consultation</Button>
          </Container>
        </div>
      )}
    </header>
  );
}
