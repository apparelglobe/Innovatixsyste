/**
 * Test bootstrap — imported as the FIRST import of every integration/E2E test
 * file, BEFORE anything that pulls in ../src/config or ../src/db. It:
 *   1. resolves a dedicated TEST database URL,
 *   2. FAILS CLOSED unless that database name contains "test", and
 *   3. rewrites process.env.DATABASE_URL so the app connects to the test DB —
 *      never the development or production database by accident.
 *
 * Configure with DATABASE_URL_TEST (recommended). If unset, the dev
 * DATABASE_URL's database name is swapped to "<name>_test".
 */
import 'dotenv/config';
import { resolveTestDatabaseUrl } from './db-url';

const testUrl = resolveTestDatabaseUrl(process.env.DATABASE_URL_TEST, process.env.DATABASE_URL);

process.env.DATABASE_URL = testUrl;
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';
