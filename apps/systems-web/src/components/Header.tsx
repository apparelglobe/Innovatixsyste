'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Menu, X, ChevronDown, Phone, LayoutDashboard, ArrowRight, Sparkles } from 'lucide-react';
import { Container, Button } from '@innovatix/ui';
import { PRIMARY_NAV, SERVICE_CATEGORIES } from '@/lib/nav';
import { SITE } from '@/lib/site';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50">
      {/* Announcement bar */}
      <div className="border-b border-neutral-200 bg-neutral-50">
        <Container className="flex h-9 items-center justify-center gap-2 text-center text-xs text-neutral-600 sm:text-sm">
          <Sparkles size={14} className="shrink-0 text-primary" />
          <span className="truncate">We help enterprises build smarter, faster, and more connected systems.</span>
          <a href="/company" className="hidden shrink-0 items-center gap-0.5 font-semibold text-primary hover:underline sm:inline-flex">
            Learn more <ArrowRight size={13} />
          </a>
        </Container>
      </div>

      <div className="border-b border-neutral-200 bg-white/95 backdrop-blur-md">
        <Container className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <a href="/" className="flex shrink-0 items-center" aria-label="Innovatix home">
            <Image
              src="/innovatix-logo.png"
              alt="Innovatix Marketing"
              width={480}
              height={191}
              priority
              sizes="(max-width: 640px) 150px, 200px"
              className="h-8 w-auto object-contain sm:h-9 lg:h-10"
            />
          </a>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Primary">
            <button
              type="button"
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-btn px-2.5 py-2 text-sm font-semibold text-neutral-700 transition hover:text-primary"
              aria-expanded={megaOpen}
              onMouseEnter={() => setMegaOpen(true)}
              onClick={() => setMegaOpen((v) => !v)}
            >
              Services <ChevronDown size={15} className={megaOpen ? 'rotate-180 transition' : 'transition'} />
            </button>
            {PRIMARY_NAV.filter((n) => !('mega' in n && n.mega)).map((n) => (
              <a key={n.href} href={n.href} className="whitespace-nowrap rounded-btn px-2.5 py-2 text-sm font-semibold text-neutral-700 transition hover:text-primary">
                {n.label}
              </a>
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-2.5 xl:flex">
            <a
              href={SITE.phoneHref}
              className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-neutral-700 transition hover:text-primary 2xl:inline-flex"
              data-cta="Call" data-cta-loc="header"
            >
              <Phone size={15} className="text-primary" /> {SITE.phone}
            </a>
            <a
              href={SITE.portalUrl}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-btn border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:border-primary hover:text-primary"
              data-cta="Client Portal" data-cta-loc="header"
            >
              <LayoutDashboard size={16} className="text-primary" /> Client Portal
            </a>
            <Button href="/book" size="md" className="whitespace-nowrap" data-cta="Book a Consultation" data-cta-loc="header">
              Book a Consultation <ArrowRight size={16} />
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-btn p-2 text-neutral-700 xl:hidden"
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
            className="absolute inset-x-0 hidden border-b border-neutral-200 bg-white shadow-pop xl:block"
            onMouseEnter={() => setMegaOpen(true)}
            onMouseLeave={() => setMegaOpen(false)}
          >
            <Container className="grid grid-cols-4 gap-x-8 gap-y-6 py-8">
              {SERVICE_CATEGORIES.map((cat) => (
                <div key={cat.key}>
                  <a href={`/services/${cat.key}`} className="text-sm font-bold text-neutral-900 hover:text-primary">
                    {cat.label}
                  </a>
                  <p className="mt-0.5 text-xs text-neutral-500">{cat.blurb}</p>
                  <ul className="mt-3 space-y-1.5">
                    {cat.items.slice(0, 5).map((it) =>
                      it.planned ? (
                        <li key={it.href} className="text-sm text-neutral-400" title="Coming soon">{it.label}</li>
                      ) : (
                        <li key={it.href}>
                          <a href={it.href} className="text-sm text-neutral-600 transition hover:text-primary">{it.label}</a>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ))}
            </Container>
          </div>
        )}
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-b border-neutral-200 bg-white xl:hidden">
          <Container className="space-y-4 py-4">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500">Services</div>
              <div className="space-y-3">
                {SERVICE_CATEGORIES.map((cat) => (
                  <details key={cat.key} className="rounded-btn border border-neutral-200 bg-neutral-50 px-3 py-2">
                    <summary className="cursor-pointer text-sm font-semibold text-neutral-900">{cat.label}</summary>
                    <ul className="mt-2 space-y-1.5 pl-2">
                      {cat.items.map((it) =>
                        it.planned ? (
                          <li key={it.href} className="text-sm text-neutral-400">{it.label}</li>
                        ) : (
                          <li key={it.href}>
                            <a href={it.href} className="text-sm text-neutral-600">{it.label}</a>
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
                <a key={n.href} href={n.href} className="rounded-btn px-2 py-2 text-sm font-semibold text-neutral-700">{n.label}</a>
              ))}
            </nav>
            <Button href="/book" className="w-full" data-cta="Book a Consultation" data-cta-loc="header-mobile">Book a Consultation <ArrowRight size={16} /></Button>
            <a
              href={SITE.portalUrl}
              className="flex items-center justify-center gap-1.5 rounded-btn border border-neutral-300 py-2.5 text-sm font-semibold text-neutral-800"
              data-cta="Client Portal" data-cta-loc="header-mobile"
            >
              <LayoutDashboard size={16} className="text-primary" /> Client Portal
            </a>
            <a
              href={SITE.phoneHref}
              className="flex items-center justify-center gap-1.5 rounded-btn border border-neutral-300 py-2.5 text-sm font-semibold text-neutral-700"
              data-cta="Call" data-cta-loc="header-mobile"
            >
              <Phone size={15} className="text-primary" /> Call {SITE.phone}
            </a>
          </Container>
        </div>
      )}
    </header>
  );
}
