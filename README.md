# innovatix-os

Turborepo monorepo for Innovatix.

- `apps/systems-web` — public Innovatix Systems website (Next.js, Vercel). Canonical: https://innovatixsystems.com
- `apps/platform-web` — authenticated internal + client app (Next.js)
- `apps/api` — shared backend/data spine (placeholder → NestJS in platform stage)
- `packages/ui` — design system (tokens + components)
- `packages/config` — shared tailwind preset + tsconfig
- `packages/analytics`, `packages/sdk`, `packages/auth` — added in later stages

Single source of truth for the hostname: `SITE_URL` env (see apps/systems-web/.env.example).
