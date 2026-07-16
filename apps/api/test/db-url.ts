/**
 * Resolve + guard the TEST database URL. Shared by test/_setup.ts. The same
 * logic is duplicated (intentionally, ~8 lines) in scripts/test-db.mjs because
 * that runs under plain node, not tsx.
 *
 * FAILS CLOSED: throws unless the resolved database NAME contains "test", so a
 * test run can never point at the development or production database.
 */
export function databaseName(url: string): string {
  const m = url.match(/\/([^/?]+)(\?|$)/);
  return m ? m[1] : '';
}

export function resolveTestDatabaseUrl(explicit?: string, devUrl?: string): string {
  let url = explicit;
  if (!url && devUrl) {
    // Swap the dev database name to "<name>_test".
    url = devUrl.replace(/\/([^/?]+)(\?|$)/, (_all, name, tail) => `/${name}_test${tail}`);
  }
  if (!url) {
    throw new Error(
      '[test-setup] No test database configured. Set DATABASE_URL_TEST (name must contain "test") or DATABASE_URL.',
    );
  }
  const name = databaseName(url);
  if (!/test/i.test(name)) {
    throw new Error(
      `[test-setup] Refusing to run: resolved test database "${name}" does not contain "test". ` +
        'Point DATABASE_URL_TEST at a dedicated test database (e.g. innovatix_test).',
    );
  }
  return url;
}
