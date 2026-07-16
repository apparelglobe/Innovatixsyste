# Secure client invitations & password setup

Replaces the previous temp-password onboarding. **No temporary password is ever
generated, stored, logged, or emailed.** The client sets their own password via a
one-time link.

## Flow

```
staff invites (or lead is converted)
  → ClientInvitation row created (only the token HASH is stored)
  → 256-bit URL-safe token generated (raw token only in-memory + in the emailed link)
  → recipient opens /setup-account?token=…  → GET /v1/auth/invitations/:token (inspect)
  → recipient sets a password             → POST /v1/auth/invitations/:token/accept
  → password bcrypt-hashed, ClientUser created (create-on-accept), invitation marked accepted
  → token permanently unusable → recipient signs in at /login
```

## Token & storage

- `randomBytes(32)` → base64url (≥256 bits, URL-safe).
- Persist only `sha256(token)` in `ClientInvitation.tokenHash` (UNIQUE). Raw token
  is never in the DB row or logs. Lookup is by hash on the unique index;
  `safeCompareHash` (constant-time) is available for in-memory hash comparisons.
- Single-use via an **atomic compare-and-set** on `acceptedAt` inside the accept
  transaction → concurrent accepts create exactly one user.
- Expiring (`PORTAL_INVITE_TTL_HOURS`, default 168h) and revocable. Expired /
  revoked / accepted tokens are all rejected.
- The two token-bearing public routes run at `logLevel: 'warn'` so the framework's
  info-level request lines (which contain the URL) never log the token.

## Endpoints

| Method | Path | Auth |
|---|---|---|
| POST | `/v1/admin/client-invitations` | staff `team:assign` |
| POST | `/v1/admin/client-invitations/:id/resend` | staff `team:assign` |
| POST | `/v1/admin/client-invitations/:id/revoke` | staff `team:assign` |
| GET  | `/v1/admin/projects/:id/client-invitations` | staff `project:view` |
| GET  | `/v1/auth/invitations/:token` | public (inspect) |
| POST | `/v1/auth/invitations/:token/accept` | public (set password) |

Admin `POST /admin/projects/:id/client-users` and portal `POST /portal/client-users`
now issue invitations too. **No endpoint returns a token or password.**

## Existing-user behavior

- **New email** → create the ClientUser on acceptance with the invited role/org.
- **Existing user, same org** → not duplicated; invite issue returns
  `ALREADY_ACTIVE_MEMBER` (they already have access — use role change, not re-invite).
- **Existing user, different org** → rejected safely (`EMAIL_IN_OTHER_ORG`); no
  silent reassignment. Multi-org membership is not supported yet; an audit event
  (`CLIENT_INVITATION_CROSS_ORG_REJECTED`) surfaces it to staff.

## Password policy (`lib/password.ts`)

Min length 12; denylist of known weak/demo passwords (incl. the local seed's
`portal-demo-2026`); rejects the email local-part; server-side; never logged.
No arbitrary character-class rules.

## Migration & transition

- Migration `20260716163858_add_client_invitations` — **additive only** (new
  `client_invitations` table + indexes). No changes to existing tables; no
  destructive prod assumptions.
- **Existing invited users:** the old flow created full ClientUser rows with a
  (bcrypt-hashed) password that was emailed. Those users keep working and can sign
  in / reset as before — no backfill required and none are left password-less.
- **Demo accounts:** the local Prisma seed's demo client (`portal-demo-2026`) is
  **dev-only** and never appears in production UI or transactional email. It is
  additionally in the password denylist so it can never be set as a real password.
  A repository scan test (`test/unit/no-plaintext-passwords.test.ts`) fails the
  build if a temp/demo password is reintroduced into production-facing source.

## Session on setup

No session is issued during accept; on success the client is redirected to
`/login`. A session is only ever minted after the invitation transaction commits.
