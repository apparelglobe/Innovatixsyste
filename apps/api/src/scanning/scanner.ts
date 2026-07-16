/**
 * Malware-scanner boundary. Upload/scan code calls the generic scanner service —
 * never ClamAV directly. Two implementations behind one interface:
 *   • StubScanner  — dev/test. EICAR test string + executable magic. No infra.
 *   • ClamAvScanner — staging/prod. Real ClamAV over the INSTREAM TCP protocol.
 */
import { config } from '../config';
import { scanFile } from '../storage/types';
import { ClamAvScanner } from './clamav';

export type ScanResultKind = 'CLEAN' | 'INFECTED' | 'ERROR' | 'TIMEOUT' | 'UNSUPPORTED' | 'SKIPPED';

export type ScanOutcome = {
  result: ScanResultKind;
  threatName?: string | null;
  provider: string;
  engine?: string | null;
  engineVersion?: string | null;
  signatureVersion?: string | null;
  errorCode?: string | null;
};

/** A terminal result never retries; ERROR/TIMEOUT are retryable. */
export function isRetryable(result: ScanResultKind): boolean {
  return result === 'ERROR' || result === 'TIMEOUT';
}

export interface MalwareScanner {
  readonly provider: string;
  scan(data: Buffer): Promise<ScanOutcome>;
}

/** Dev/test scanner: EICAR signature + executable magic (via storage scanFile). */
export class StubScanner implements MalwareScanner {
  readonly provider = 'stub';
  async scan(data: Buffer): Promise<ScanOutcome> {
    const r = await scanFile(data, '');
    const meta = { provider: 'stub', engine: 'eicar-stub', engineVersion: '1', signatureVersion: 'eicar-1' } as const;
    if (r.clean) return { result: 'CLEAN', ...meta };
    const threatName = r.reason?.startsWith('executable') ? 'Heuristics.Executable.Blocked' : 'Eicar-Test-Signature';
    return { result: 'INFECTED', threatName, ...meta };
  }
}

let cached: MalwareScanner | null = null;
let override: MalwareScanner | null = null;
export function scanner(): MalwareScanner {
  if (override) return override;
  if (cached) return cached;
  cached = config.MALWARE_SCANNER_PROVIDER === 'clamav' ? new ClamAvScanner() : new StubScanner();
  return cached;
}
/** Test seams. */
export function __setScannerForTest(s: MalwareScanner | null): void { override = s; }
export function __resetScannerCache(): void { cached = null; }
