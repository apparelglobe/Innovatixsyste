/**
 * ClamAV scanner over the INSTREAM TCP protocol (clamd). No shelling out to
 * clamscan — we open a socket, stream the bytes in length-prefixed chunks, and
 * strictly parse the reply. Size-limited, timed out, and sockets are always
 * closed. Errors/timeouts never resolve to CLEAN — the caller keeps the file
 * unavailable and retries.
 *
 * INSTREAM: send `zINSTREAM\0`, then repeated `<uint32 BE length><bytes>`, then a
 * zero-length chunk to finish. Reply: `stream: OK\0` | `stream: <Threat> FOUND\0`
 * | `... ERROR\0`.
 */
import net from 'node:net';
import { config } from '../config';
import type { MalwareScanner, ScanOutcome } from './scanner';

const CHUNK = 64 * 1024;

export type ClamAvOptions = { host?: string; port?: number; timeoutMs?: number; maxBytes?: number };

export class ClamAvScanner implements MalwareScanner {
  readonly provider = 'clamav';
  private host: string;
  private port: number;
  private timeoutMs: number;
  private maxBytes: number;

  constructor(opts: ClamAvOptions = {}) {
    this.host = opts.host ?? config.CLAMAV_HOST;
    this.port = opts.port ?? config.CLAMAV_PORT;
    this.timeoutMs = opts.timeoutMs ?? config.CLAMAV_TIMEOUT_MS;
    this.maxBytes = opts.maxBytes ?? config.CLAMAV_MAX_FILE_BYTES;
  }

  async scan(data: Buffer): Promise<ScanOutcome> {
    if (data.length > this.maxBytes) {
      return { result: 'UNSUPPORTED', provider: 'clamav', errorCode: 'FILE_TOO_LARGE' };
    }
    const version = await this.version().catch(() => null);
    return this.instream(data, version);
  }

  /** Best-effort `zVERSION` → "ClamAV 1.0.1/27000/Wed ...". */
  private version(): Promise<{ engineVersion?: string; signatureVersion?: string } | null> {
    return new Promise((resolve) => {
      const socket = net.connect({ host: this.host, port: this.port });
      let buf = '';
      let settled = false;
      const done = (v: { engineVersion?: string; signatureVersion?: string } | null) => { if (settled) return; settled = true; socket.destroy(); resolve(v); };
      socket.setTimeout(Math.min(this.timeoutMs, 5000));
      socket.on('timeout', () => done(null));
      socket.on('error', () => done(null));
      socket.on('connect', () => socket.write('zVERSION\0'));
      socket.on('data', (d) => {
        buf += d.toString('utf8');
        if (buf.includes('\0')) {
          const parts = buf.replace(/\0/g, '').trim().split('/');
          done({ engineVersion: parts[0]?.trim() || undefined, signatureVersion: parts[1]?.trim() || undefined });
        }
      });
      socket.on('close', () => done(null));
    });
  }

  private instream(data: Buffer, version: { engineVersion?: string; signatureVersion?: string } | null): Promise<ScanOutcome> {
    const meta = { provider: 'clamav', engine: 'ClamAV', engineVersion: version?.engineVersion ?? null, signatureVersion: version?.signatureVersion ?? null };
    return new Promise((resolve) => {
      const socket = net.connect({ host: this.host, port: this.port });
      let buf = '';
      let settled = false;
      const done = (o: ScanOutcome) => { if (settled) return; settled = true; try { socket.destroy(); } catch { /* ignore */ } resolve(o); };

      socket.setTimeout(this.timeoutMs);
      socket.on('timeout', () => done({ result: 'TIMEOUT', errorCode: 'TIMEOUT', ...meta }));
      socket.on('error', (e) => done({ result: 'ERROR', errorCode: (e as NodeJS.ErrnoException).code || 'SOCKET_ERROR', ...meta }));

      socket.on('connect', () => {
        socket.write('zINSTREAM\0');
        for (let off = 0; off < data.length; off += CHUNK) {
          const part = data.subarray(off, off + CHUNK);
          const len = Buffer.alloc(4);
          len.writeUInt32BE(part.length, 0);
          socket.write(len);
          socket.write(part);
        }
        const end = Buffer.alloc(4); // zero-length chunk terminates the stream
        end.writeUInt32BE(0, 0);
        socket.write(end);
      });

      socket.on('data', (d) => {
        buf += d.toString('utf8');
        if (!buf.includes('\0') && !buf.includes('\n')) return; // wait for a full line
        const line = buf.replace(/\0/g, '').trim();
        const found = line.match(/stream:\s*(.+?)\s+FOUND/i);
        if (found) return done({ result: 'INFECTED', threatName: found[1].trim(), ...meta });
        if (/stream:\s*OK\b/i.test(line)) return done({ result: 'CLEAN', ...meta });
        if (/\bERROR\b/i.test(line)) return done({ result: 'ERROR', errorCode: 'SCAN_ERROR', ...meta });
        // Anything else is malformed — fail safe (never CLEAN).
        return done({ result: 'ERROR', errorCode: 'BAD_RESPONSE', ...meta });
      });

      socket.on('close', () => done({ result: 'ERROR', errorCode: 'CLOSED_NO_RESPONSE', ...meta }));
    });
  }
}
