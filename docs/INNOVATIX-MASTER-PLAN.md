# INNOVATIX SYSTEMS — Master Development Plan (Governing Source of Truth)

**Version:** 1.2 · **Status:** Approved in principle · **Commercial priority #1:** launch the public **Innovatix Systems** software-development website (SEO + lead gen + Google Ads), then build the authenticated platform alongside it without blocking the website.

**Brand architecture (approved):** two public brands under Innovatix Group — **Innovatix Systems** (`innovatixsystem.com`, software/AI/enterprise engineering — this plan) and **Innovatix Marketing** (separate domain/SEO/Ads — later track). Both share `platform-web` + `api`; separate front-ends and marketing sites.

**Website IA + service taxonomy:** defined by `INNOVATIX-SYSTEMS-BENCHMARK.md` (Step 0, complete — 30 enterprise-software firms benchmarked across 18 dimensions). Services use the **8-category** architecture: Software Engineering · AI Services · Enterprise Systems · Cloud & Infrastructure · Data & Analytics · Security · Digital Transformation · Team Services. Nav: `Services · Solutions · Industries · Technologies · Case Studies · Resources · Company · [Book a Consultation]`.

> Open this file to instantly know: what's being built, in what order, why, what's done, what's next, and what blocks launch.

---

## 0. Confirmed launch architecture

```text
innovatix-os/                       (Turborepo monorepo, shared-schema multi-tenant, Postgres RLS)
├── apps/
│   ├── systems-web/     Public Innovatix SYSTEMS software-dev website · Next.js App Router · SSG+ISR · SEO-first · CDN
│   │                    (future sibling: apps/marketing-services-web for Innovatix MARKETING, or its own repo)
│   ├── platform-web/    Authenticated app (staff + client portal) · Next.js App Router · SSR/client · role-based
│   └── api/             Shared enterprise backend + data spine · NestJS modular monolith
├── packages/
│   ├── ui/              Brand design system: tokens, typography, components, Tailwind preset  (BOTH apps)
│   ├── sdk/             Typed API client + shared DTOs/types (generated from api)
│   ├── analytics/       GA4 + event schema + attribution helpers (single source of definitions)
│   ├── auth/            token/session/RBAC utilities (platform-primary)
│   └── config/          eslint / tsconfig / tailwind / env schema
```

**CONFIRMED:** `apps/systems-web`, `apps/platform-web`, `apps/api` is the final launch architecture. No 4th app at launch. A separate `apps/admin` may be added later ONLY if a hard architectural reason emerges; internal ops live inside `platform-web` behind RBAC until then.

**Why two web apps, one API:** different runtime profiles (static/CDN vs. dynamic/authed), independent release cadence, SEO-risk isolation (a platform deploy can never break indexed pages), independent caching/performance. Shared `packages/*` keep brand, contracts, and analytics identical.

---

## 1. Deployment strategy (per app)

| App | Host | Strategy | Why |
|---|---|---|---|
| systems-web | Vercel | SSG+ISR, global CDN, per-PR previews, instant rollback, independent `/lp/*` deploys | Best Next.js CWV + fastest ad-safe launch; SEO deploys isolated |
| platform-web | AWS ECS Fargate (Render/Railway acceptable early) | Docker, authed, blue/green | Enterprise control, data residency, separate blast radius |
| api | AWS ECS + RDS Postgres (RLS) | Container, autoscaling, CI migrations | Shared spine; tiny footprint at website launch (lead intake only) |

Three independent pipelines in one GitHub Actions workflow. A marketing deploy never touches platform/api.

---

## 2. Shared packages

`@innovatix/ui` · `@innovatix/sdk` (contracts generated from api — no drift) · `@innovatix/analytics` (GA4/event/attribution definitions used by BOTH website conversion tracking and CRM attribution) · `@innovatix/auth` · `@innovatix/config`.

---

## 3. Public website RELEASE GATES (sequential; each must pass before the next)

### Gate A — Technical foundation
Repo + CI/CD pipeline · shared design system (`ui`) · env config · Vercel preview deployments · error monitoring (Sentry) · analytics framework (`analytics`) · consent/cookie management · security headers (CSP, HSTS, etc.).

### Gate B — Commercial website
Home · core service pages · core industry pages · Process · Security & Engineering Standards · About · Contact + Booking · verified case studies (Apparel Globe, MedJAAF) · forms + lead capture · mobile responsiveness · accessibility review.

### Gate C — SEO readiness
Keyword mapping · metadata · canonicals · schema (JSON-LD) · sitemap.xml · robots · internal linking · indexability checks · Core Web Vitals · Google Search Console configured · **content-quality review (see §5 QC gate)**.

### Gate D — Google Ads readiness (ads may NOT start until this passes end-to-end)
Dedicated `/lp/*` landing pages · keyword→page mapping · conversion-focused messaging · lead-form tracking · booking tracking · call tracking (where applicable) · UTM capture · GCLID capture · CRM attribution · offline-conversion import plan · thank-you/confirmed conversion event · spam protection · privacy/consent compliance · **verified end-to-end test: ad click → LP → form → Lead in CRM → conversion fired**.

> **Website online ≠ Google Ads on.** Ads start ONLY after Gate D is verified end-to-end.

---

## 4. Two launch definitions

**WEBSITE LAUNCH (first commercial release):** Gates A+B+C pass, core software-dev pages live and indexable, forms + booking work, CRM lead creation + source attribution work, mobile + performance verified, case studies published with verified claims. → begin SEO; begin Google Ads once Gate D passes.

**PLATFORM LAUNCH (second release):** a client can receive a proposal → sign a contract → pay a deposit → get portal access → track their project → receive dev reports → approve milestones → access invoices/files → open a support ticket.

The website launch is NOT blocked by unfinished platform features.

---

## 5. SEO page architecture + QUALITY-CONTROL SYSTEM

### 5.1 Architecture (reuse the proven storefront `[seoSlug]` + registry framework)
- **Templates (4):** Pillar · Service · Industry · Programmatic-solution (`/solutions/{service}-for-{industry}`).
- **URL map:** `/services/*`, `/industries/*`, `/technologies/*`, `/integrations/*`, `/solutions/{service}-for-{industry}`, `/case-studies/*`, `/blog/*`, `/resources/*`, `/lp/*`.
- **Per-page SEO contract:** primary keyword · search intent · `<title>` · meta description · one H1 · heading hierarchy · CTA · internal links · JSON-LD · canonical · OG/Twitter · ISR revalidate.

### 5.2 Programmatic QUALITY GATE — pages do NOT auto-publish
The template *supports* ~120 service×industry pages. We do **NOT** generate them all. A programmatic page may be published (indexable) ONLY when it has ALL of:

1. Distinct primary keyword + search intent
2. Unique introduction + value proposition
3. Industry-specific operational problems
4. Service-specific solution detail
5. Relevant workflows / use cases
6. Appropriate integrations
7. Security/compliance considerations (where applicable)
8. Clear deliverables
9. Relevant FAQs
10. Meaningful internal links
11. Unique title + meta description
12. Correct canonical treatment
13. Appropriate schema
14. Strong conversion path
15. Proof/case-study reference (where supportable)
16. **Editorial review sign-off before `index`**

**Enforcement:** every programmatic page has a `status: draft | review | published` and a `qcChecklist` in its registry entry. `generateStaticParams` emits `<meta robots="noindex">` and excludes from `sitemap.xml` until `status === 'published'` AND all 16 checks are true. A CI check fails the build if a page is `published` with an incomplete `qcChecklist`. **Thin page = unpublished/noindex, never live.**

### 5.3 Rollout — highest-intent first (hand-crafted, ~8–12 pages, not 120)
Batch 1 (commercial-intent heads + proven-experience combos):
1. `/services/custom-software-development`
2. `/services/erp-development`
3. `/services/crm-development`
4. `/services/warehouse-management-systems`
5. `/services/order-management-systems`
6. `/services/ai-automation`
7. `/solutions/inventory-management-for-wholesale-distribution`
8. `/solutions/order-management-for-ecommerce`
9. `/solutions/warehouse-management-for-logistics`
10. `/solutions/custom-software-for-healthcare`
11. `/industries/wholesale-distribution`
12. `/industries/ecommerce`

Later batches expand only as each page clears the QC gate with genuinely unique content.

---

## 6. Google Ads landing-page architecture
- Isolated route group `/lp/{campaign}`, minimal template: strong message-match to the ad, single conversion goal, no nav distractions, form + booking above the fold, trust proof.
- Independently deployable + A/B testable (edge/ISR) — ship LPs without touching the main site or platform.
- Indexing: ad LPs default `noindex` (avoid thin/duplicate + SEO-page cannibalization); SEO service pages `index`.
- Capture GCLID + UTM on load → hidden field → CRM. Conversion events (form, booking) → GA4 + Google Ads.

---

## 7. Website → CRM lead flow
```
Visitor → capture UTM+GCLID+referrer+landing-path (session)
 → submit lead form / book consultation
 → POST /v1/leads (spam-protected, tenant=Innovatix)
 → create Lead + LeadSource(campaign, keyword, UTM, GCLID, page)
 → fire GA4 + Google Ads conversion
 → auto-ack email (<=60s) + auto-assign + start response-SLA timer
 → (booking) create Meeting + calendar invite (Cal.com)
 → Lead → CRM pipeline (New → Contacted → Qualified → Opportunity)
 → AuditLog every step; attribution persists to Opportunity/Contract/Revenue
```

---

## 8. Minimum WEBSITE launch backlog (implementation-visibility format)

Columns: Epic · Feature · Route · Component · API dep · Content dep · SEO dep · Analytics event · Acceptance criteria · Testing · Status · Owner · Blocker · Gate.

| Epic | Feature | Route | Component | API dep | Content | SEO | Analytics event | Acceptance criteria | Testing | Status | Owner | Blocker | Gate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| W1 Foundation | Monorepo + CI + Vercel + design system + consent + security headers | — | ui/* | — | — | — | page_view | Preview deploy live; Lighthouse≥90; CSP/HSTS set; consent banner blocks non-essential until opt-in | CI green; header scan | Not started | — | Decisions #1–4 | A |
| W2 Core pages | Home | `/` | HomeHero, ServicesGrid, ProofBar, CTA | — | Home copy | title/meta/H1/JSON-LD Organization | cta_click, book_click | Renders; SEO contract complete; mobile clean | unit+E2E+Lighthouse | Not started | — | design system | B |
| W2 | 5 priority service pages | `/services/*` | ServiceTemplate | — | Per-service copy | Service schema; internal links | cta_click | QC 16/16; unique content | content-QC + Lighthouse | Not started | — | copy | B/C |
| W2 | 3 industry pages | `/industries/*` | IndustryTemplate | — | Per-industry copy | Breadcrumb+Service schema | cta_click | QC 16/16 | content-QC | Not started | — | copy | B/C |
| W2 | Process / Security / About / Contact | `/process /security /about /contact` | StaticPage, ContactForm | POST /v1/leads | Copy | canonical/meta | form_submit | Pages live; contact form posts Lead | E2E | Not started | — | W7 | B |
| W3 Case studies | Apparel Globe (verified) | `/case-studies/apparel-globe` | CaseStudyTemplate | — | Verified metrics | CaseStudy schema | cta_click | Only verified claims; QC pass | editorial review | Not started | — | metric confirmation | B |
| W3 | MedJAAF (verified-only) | `/case-studies/medjaaf` | CaseStudyTemplate | — | Verified facts | schema | cta_click | No fabricated features; HIPAA-conscious wording | editorial review | Blocked | — | needs MedJAAF facts | B |
| W4 SEO engine | 4 templates + sitemap + robots + JSON-LD + breadcrumbs + CWV budget | `/sitemap.xml /robots.txt` | seo/* | — | registries | full | — | Valid sitemap; robots correct; CWV gate in CI; noindex on draft/QC-incomplete | Lighthouse CI + link-check | Not started | — | — | C |
| W5 Conversion | Lead form + spam protection | (all pages) | LeadForm | POST /v1/leads | — | — | form_submit, form_error | Valid submit→Lead; honeypot/reCAPTCHA blocks spam (200, no leak) | unit+E2E | Not started | — | W7 | B/D |
| W5 | Book a Consultation | `/book` | BookingWidget (Cal.com) | Meeting create | — | — | book_start, book_complete | Booking creates Meeting+invite; event fires | E2E | Not started | — | Cal.com | B/D |
| W5 | Ad landing pages | `/lp/*` | LandingTemplate | POST /v1/leads | LP copy | noindex | lp_view, form_submit | Message-match; single CTA; noindex; GCLID captured | E2E ad-click sim | Not started | — | — | D |
| W6 Tracking | GA4 + Ads conversion + UTM/GCLID + attribution | (all) | analytics/* | — | — | — | all events | Test conversion fires end-to-end; GCLID/UTM persisted to Lead | manual + tag assistant | Not started | — | — | C/D |
| W7 Lead API | POST /v1/leads + Lead/LeadSource + ack + assign + SLA | (api) | api: leads | — | — | — | — | Lead+source stored; ack<=60s; dedup 24h; audit row | unit+integration+load | Not started | — | tenancy kernel | B/D |
| W8 Legal/launch | Privacy, Terms, Cookie, FAQs + mobile/a11y/perf QA | `/privacy /terms /cookie-policy /faqs` | StaticPage | — | Legal copy | meta | — | Pages live; Lighthouse≥90; a11y pass; mobile verified | Lighthouse+axe | Not started | — | legal copy | B/C/D |

## 9. Minimum PLATFORM launch backlog (epic level)

| Epic | Scope | API dep | Gate | Status |
|---|---|---|---|---|
| P1 Auth/tenancy kernel | multi-tenant + RLS, login, RBAC (staff/client), audit log | api core | — | Not started |
| P2 CRM→Sales | accounts/contacts/leads/opps/pipeline/activities (extends W7) | api | — | Not started |
| P3 Discovery→Proposal | discovery form, scope items, proposal engine + versioning + e-accept | api | — | Not started |
| P4 Contract + e-sign | MSA/SOW templates, e-sign (integrate), storage, links | api + provider | — | Not started |
| P5 Billing | deposit/milestone invoices, Stripe pay, receipts | api + Stripe | — | Not started |
| P6 Project auto-provision | signature+deposit → project/team/milestones/tasks | api | — | Not started |
| P7 Client portal | dashboard, projects, milestones, %-complete, approvals, messages, files, invoices | api | — | Not started |
| P8 Dev reporting | dev update form + GitHub ingestion + AI daily/weekly digest (grounded) | api + GitHub | — | Not started |
| P9 Support-lite | ticket intake, warranty, basic SLA | api | — | Not started |

---

## 10. Dependencies (systems-web ↔ platform-web ↔ api)

| Needs | Depends on |
|---|---|
| systems-web content/SEO pages | `ui` + `analytics` only — NO backend |
| systems-web lead form/booking | api: `POST /v1/leads` (W7) + Cal.com |
| platform-web (any authed area) | api: auth/tenancy kernel (P1) |
| Client portal (P7) | P6 ← P5 ← P4 ← P3 ← P2 |
| Dev reporting (P8) | P6 + P7 + GitHub |

**Critical:** systems-web *content* has zero backend dependency; only the lead form needs one small endpoint. The site can be ~90% built and launched before the platform meaningfully exists.

## 11. Parallel workstreams
- **Track A (no backend):** design system + all systems-web content/SEO/case-studies/blog/LPs.
- **Track B (small backend):** `POST /v1/leads` + CRM-lite + tracking wiring.
- **Track C (independent):** auth/tenancy kernel + CRM data model for platform.
A+B converge at Website Launch; C continues to Platform Launch.

## 12. Exact first frontend task (F1)
Scaffold monorepo + `ui` design system + `systems-web` shell + Home + `/services/custom-software-development`, deployed to a Vercel preview.
**Acceptance:** Vercel preview URL; Lighthouse ≥90 (perf/SEO/a11y); valid title/meta/H1/JSON-LD on both pages; mobile clean; nav/footer from `ui`; QC checklist scaffold present. This page is the template every other page clones.

## 13. Google Ads activation requirements = Gate D (§3). No spend until verified end-to-end.

## 14. Progress tracker (update daily/weekly)

| Dimension | Status | % | Next gate |
|---|---|---|---|
| Audit & Architecture | ✅ Done | 100% | Decisions #1–4 |
| Website benchmark + IA (Step 0) | ✅ Done | 100% | see INNOVATIX-SYSTEMS-BENCHMARK.md |
| Public website | ⚪ Not started | 0% | Task F1 → Gate A |
| Platform frontend | ⚪ Not started | 0% | P1 kernel |
| Backend (api) | 🟡 Lead endpoint only | 5% | POST /v1/leads |
| SEO readiness | ⚪ Not started | 0% | Gate C |
| Google Ads readiness | ⚪ Not started | 0% | Gate D (0/…) |
| Client-lifecycle readiness | ⚪ Not started | 0% | P1→P7 |

Status vocabulary: Not reviewed → Audit in progress → Ready for planning → Planned → Blocked → Ready for development → In development → In review → QA → UAT → Ready for release → Released → Verified → Deferred.

---

## 15. Open decisions (needed to start F1)
1. Fresh `innovatix-os` repo (recommended) vs. build in current workspace.
2. Confirm Vercel for systems-web.
3. Brand assets — reuse a token set or fresh Innovatix palette/logo.
4. `innovatixsystem.com` registered/available for DNS.
5. e-sign provider (platform). 6. MedJAAF repo access for verified case study.

**Recommendation:** fresh multi-tenant monorepo (shared-schema + RLS), build systems-web first (Track A/B), dogfood the platform (Track C) — "Innovatix runs Innovatix."
