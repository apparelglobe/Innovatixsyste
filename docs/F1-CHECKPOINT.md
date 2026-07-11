# F1 Checkpoint — systems-web foundation

- Repo: ~/Desktop/innovatix-os · branch `main` · commit `d5ae934`
- Build: 3/3 apps (systems-web, platform-web, api) — pass. systems-web fully static, 87.2 kB First Load JS.
- Next.js: 14.2.35 (security-patched).
- Verified (rendered HTML): home + service page HTTP 200; 1× H1 each; canonical + og:url on https://innovatixsystems.com; JSON-LD (Organization/Service/Breadcrumb/FAQ) valid; robots index,follow on published page; sitemap = 2 indexable pages only (QC gate working).
- SITE_URL single source; turbo passes it through build env (canonical bug found + fixed).

## Gate A/B status
- [x] Repo + Turborepo + 3 apps + shared packages build independently
- [x] Design system (tokens + primitives)
- [x] Security headers (HSTS + CSP baseline) + www->apex 301
- [x] CI workflow (typecheck + build)
- [x] Homepage + first service page (responsive, real content)
- [x] Metadata + canonicals + JSON-LD + QC registry + sitemap/robots
- [ ] Vercel project + preview (needs account) — NEXT
- [ ] Sentry error monitoring, consent/cookie banner — Gate A remainder
- [ ] Lighthouse-in-CI + real device screenshots (via Vercel preview)

## Next ticket
Connect the GitHub repo + Vercel project (systems-web), set SITE_URL, deploy preview; then Gate A remainder (Sentry + consent + GA4 scaffold).
