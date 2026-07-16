# Innovatix — Complete Build Plan (Governing Spec)

> Authoritative build directive (owner-provided). Supersedes/expands INNOVATIX-MASTER-PLAN.md.
> **Everything is custom-built.** Not built inside Apparel Globe or MedJAAF repos.

## Operational directives
- **Ports:** backend (`apps/api`) → **:4040**; frontend (`apps/systems-web`) → **:4030**. (platform-web stays :3001.)
- **Build order:** the **development front end (Innovatix Systems website) FIRST**, then the **marketing front end** (`apps/marketing-services-web`, a separate site — Launch 5).
- Canonical host `SITE_URL=https://innovatixsystems.com` (never hardcoded; only `src/lib/site.ts`).

## Two brands (separate public sites)
- **Innovatix Systems** (innovatixsystems.com) — custom software, enterprise systems, AI, cloud/DevOps, data, security, digital transformation, dedicated teams. **First commercial priority.**
- **Innovatix Marketing** (separate domain, later) — SEO, Google/Microsoft/Meta/LinkedIn Ads, content, email, automation, CRO, landing pages, analytics/attribution.

## Systems website — 8 service categories
A Software Engineering · B AI Services · C Enterprise Systems · D Cloud & Infrastructure · E Data & Analytics · F Security Engineering · G Digital Transformation · H Team Services.

## Priority service pages (build these first — credible, demonstrable)
1 Custom Software Development · 2 Enterprise Software Development · 3 AI Automation · 4 ERP Development · 5 Warehouse Management Systems · 6 Inventory Management Systems · 7 Order Management Systems · 8 Customer Portal Development · 9 Vendor Portal Development · 10 API Development & Integrations · 11 Cloud & DevOps · 12 Software Modernization · 13 Dedicated Development Teams.

## Sitemap (nav): Home · Services · Solutions · Industries · Technologies · Integrations · Case Studies · Resources/Blog · Company (Process/Security/About/Contact/Pricing/FAQs/Careers) · Book a Consultation. Google Ads LPs at `/lp/{campaign}` (noindex).

## Homepage section order
Hero → primary CTA → proof → service categories → quantified metrics → industries → enterprise systems → tech → case studies → delivery process → **client-portal/reporting differentiator** → security/engineering standards → insights → final consultation CTA.
Core differentiator: **"Innovatix clients do not disappear into a development black box"** — live project status, milestones, daily/weekly updates, approvals, contracts, invoices, files, messages, support.

## SEO system (§8) — 4 templates: pillar, service, industry, service×industry (e.g. `/solutions/erp-development-for-manufacturing`).
QC states: draft → review → published. Only `published` + all 16 QC checks true → indexed + in sitemap. Others noindex/excluded. (Framework already implemented: `src/lib/services.ts` QC gate + `nav.ts` `planned` flags.)

## Google Ads system (§9) — dedicated LP per campaign; keyword-matched headline, proof, short lead form, single CTA, minimal nav, mobile-first, noindex.
Capture on EVERY lead: utm_source/medium/campaign/term/content, gclid, referrer, landing page, first-touch, last-touch. Attribution: ad click → lead → opportunity → proposal → contract → revenue. Measure revenue by source/keyword.

## Website → CRM lead flow (§10)
Visitor → capture UTM/GCLID/referrer → submit form / book → `POST /v1/leads` (api :4040) → CRM lead + source → ack email → assign → response timer → consultation → opportunity. Include dedupe, spam protection, audit logging.

## Build stages (systems-web)
- **A Technical foundation:** monorepo, 3 apps, shared packages, env validation, CI, Vercel preview, error monitoring, security headers, consent framework, analytics scaffold.
- **B Design + core website:** design system, header/mega-menu/mobile nav/footer, homepage, services index, priority service pages, priority industry pages, process/security/about/contact/booking, case-study framework.
- **C SEO readiness:** keyword mapping, titles/meta/canonical/OG/schema/breadcrumbs/internal links, sitemap/robots, indexability + content-quality review, Core Web Vitals, Search Console prep.
- **D Google Ads readiness:** dedicated LPs, keyword→page map, lead+booking conversion events, UTM/GCLID, CRM attribution, spam protection, consent, end-to-end conversion testing, offline conversion import plan. **Ads begin only after D passes.**

## CLAIMS INTEGRITY (hard rule, matches owner's plan)
- Do NOT advertise certifications not earned. Do NOT describe platform integrations as formal partnerships.
- Case studies (Apparel Globe flagship, MedJAAF security-first): **only verified metrics/features.** No HIPAA/compliance/certification/partnership claims without documentary evidence.
- Service-capability copy (what we do, process, deliverables, FAQs) is fine to author; **proof/metrics must come from the owner** and be verified before publish.

## Later (platform-web / api) — Launches 2–5
CRM/leads/opportunities · discovery/requirements · proposal engine · contracts + e-sign (integrate provider) · billing/Stripe · project auto-provisioning · development-reporting engine (AI summarizes verified data only — "no source, no claim"; human approval initially) · weighted progress calc · change requests · QA/UAT/deploy · support/CS · executive dashboards · enterprise foundations (multi-tenant, RLS, RBAC, audit, etc.). Build vs integrate list per §29. Full lifecycle → **"Innovatix runs on Innovatix."**

## Domains (§30): innovatixsystems.com canonical; 301 www + innovatixsystem(.com/www) → apex, preserve path+query.
