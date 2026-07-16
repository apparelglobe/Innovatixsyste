# Object storage (S3-compatible)

Real S3-compatible object storage behind the existing `FileStorage` boundary.
Files are **never public** — downloads go through short-lived presigned URLs (S3)
or an authenticated proxy stream (local). The DB is the source of truth for
ownership, visibility, version, and authorization.

## Provider architecture

One `FileStorage` interface (`put` / `head` / `getStream` / `getSignedUrl` /
`delete`), two implementations:
- **LocalStorage** (`local`, dev/test default) — writes under `STORAGE_LOCAL_DIR`
  outside the web root; downloads stream through the authorized endpoint.
- **S3CompatibleStorage** (`s3`, staging/prod) — AWS S3 first, also Cloudflare R2 /
  MinIO via `S3_ENDPOINT` + `S3_FORCE_PATH_STYLE`. Real **SigV4** over
  `node:https` + `node:crypto` (`storage/sigv4.ts`) — no SDK, hermetic tests.

## Environment requirements

`STORAGE_PROVIDER` · `S3_BUCKET` · `S3_REGION` · `S3_ACCESS_KEY_ID` ·
`S3_SECRET_ACCESS_KEY` · `S3_ENDPOINT` (non-AWS) · `S3_FORCE_PATH_STYLE` (MinIO/some
R2) · `S3_SIGNED_URL_TTL_SECONDS` (default 300) · `STORAGE_ALLOW_ARCHIVES` (default
false). Nothing hardcoded; production boot **fails fast** if bucket/region/keys are
missing when `STORAGE_PROVIDER=s3`.

## Object key format

```
tenant/{tenantId}/org/{clientOrgId}/project/{projectId}/file/{fileId}/v/{version}/{safeFilename}
```
Deterministic, fully scoped, unguessable (per-version `fileId`), and never
overwrites a prior version. Browser-supplied keys are never trusted; keys are not
exposed in client responses.

## File state machine (`FileState`)

```
PENDING_UPLOAD → (put + head verify) → UPLOADED/SCANNING → scan
   clean  → AVAILABLE   (the ONLY downloadable state; becomes current version)
   flagged→ QUARANTINED (object deleted, never downloadable)
   verify fail / provider error → REJECTED
   soft delete → DELETED
```
A file is client-visible only after AVAILABLE. `isCurrent` flips to the new
version only on AVAILABLE, so clients keep the prior current version until a
replacement is clean.

## Upload sequence (`POST /admin/projects/:id/files`, staff `file:write`)

validate declared MIME + size + filename + **actual signature** → create
PENDING_UPLOAD → `put` → `head` (exists + size match, else REJECTED + 502) →
SCANNING → scan (EICAR/exec/… → QUARANTINED + object delete + 400) → AVAILABLE
(+ flip previous current) → audit + notify. `?replaceId=` adds an immutable new
version.

## Download sequence

Resolve from DB → verify tenant/org/project/current/visibility/deletion + **state
= AVAILABLE** → audit `FILE_DOWNLOADED` → presigned URL (S3, `S3_SIGNED_URL_TTL_SECONDS`)
or authenticated stream (local). Client route additionally requires
`clientVisible` — internal-only, quarantined, unscanned, non-current, deleted, and
cross-org all return **404** (no reveal).

## Versioning

Each replacement is a new immutable row + new object key; prior versions stay
retrievable by staff (`GET /admin/files/:id/versions` includes `state`); clients
see only the current client-visible AVAILABLE version. Version chains are
tenant-scoped via `rootId`.

## MIME & size validation

Declared MIME allowlist (archives gated by `STORAGE_ALLOW_ARCHIVES`), size limit,
dangerous/double-extension filenames blocked (exe/sh/js/html/…), and magic-byte
signature cross-check (`contentMatchesDeclared`) so the browser Content-Type is
never trusted alone. Executable magic (MZ/ELF/Mach-O) is rejected up front.

## Deletion & retention

Soft delete (`state=DELETED`, `deletedAt`) + best-effort object delete (failures
logged, left for a bucket lifecycle policy — DB and store never silently diverge).
Audit trail preserved. Prior versions are retained (soft-deleting the current
version does not purge history). Staff-only permanent deletion is a later
workflow.

## Failure handling

`put`/`head` failure or size mismatch → REJECTED (never AVAILABLE), 502, best-effort
cleanup. Object-delete failure on soft delete → logged, DB delete stands. Signed-URL
generation and provider outages surface as errors, never as a false "available".

## Tests / results

- `test/unit/storage.test.ts` — validation, object-key, SigV4 presign
  (determinism + required params + key/secret/expiry sensitivity + Authorization
  header shape), `uriEncode`.
- `test/integration/files.test.ts` — staff upload → AVAILABLE + tenant-scoped key
  (local provider works), EICAR → QUARANTINED unavailable, exec/double-ext/bad-MIME
  rejected, version replacement → new key + prior intact, download gating
  (unscanned/quarantined/internal/cross-org/deleted), provider failure → REJECTED
  (502), size mismatch → REJECTED, object-write idempotency.
- **Results:** unit 30 / integration 78 / e2e 1 — all pass; typecheck 5/5; builds 3/3.

## S3 verification note

The S3 adapter is verified via **SigV4 unit fixtures** (deterministic presign +
signature sensitivity) rather than a live bucket — this environment has no S3
credentials or network egress to Stripe/S3. Wire test-mode keys + a bucket to run
it against a real S3/R2/MinIO endpoint.

## Client upload

Not applicable in this product today — project files are staff-authored; clients
only download client-visible files. A permitted-client-upload flow would reuse the
same state machine + validation.
