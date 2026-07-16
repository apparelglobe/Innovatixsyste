/**
 * S3-compatible object storage (AWS S3 first; works with Cloudflare R2 / MinIO
 * via S3_ENDPOINT + S3_FORCE_PATH_STYLE). Real SigV4 requests over node:https —
 * no SDK. Objects are private; downloads are short-lived presigned GET URLs.
 */
import https from 'node:https';
import http from 'node:http';
import type { Readable } from 'node:stream';
import type { FileStorage } from './types';
import { config } from '../config';
import { presignGetUrl, signRequest, uriEncode, sha256, EMPTY_SHA256 } from './sigv4';

type Target = { protocol: 'https' | 'http'; host: string; canonicalUri: string; port?: number };

export class S3CompatibleStorage implements FileStorage {
  readonly provider = 's3' as const;

  private resolve(key: string): Target {
    const region = config.S3_REGION;
    const bucket = config.S3_BUCKET;
    const encodedKey = uriEncode(key, false); // keep slashes as path separators

    if (config.S3_ENDPOINT) {
      // Custom endpoint (R2 / MinIO). Path-style bucket unless the endpoint already
      // embeds it; we default to path-style, which every S3-compatible store accepts.
      const u = new URL(config.S3_ENDPOINT);
      return {
        protocol: u.protocol === 'http:' ? 'http' : 'https',
        host: u.host,
        port: u.port ? Number(u.port) : undefined,
        canonicalUri: `${u.pathname.replace(/\/$/, '')}/${bucket}/${encodedKey}`.replace(/\/{2,}/g, '/'),
      };
    }
    if (config.S3_FORCE_PATH_STYLE) {
      return { protocol: 'https', host: `s3.${region}.amazonaws.com`, canonicalUri: `/${bucket}/${encodedKey}` };
    }
    return { protocol: 'https', host: `${bucket}.s3.${region}.amazonaws.com`, canonicalUri: `/${encodedKey}` };
  }

  private request(t: Target, method: 'PUT' | 'HEAD' | 'DELETE', headers: Record<string, string>, body?: Buffer): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
    const mod = t.protocol === 'http' ? http : https;
    return new Promise((resolve, reject) => {
      const req = mod.request(
        { protocol: `${t.protocol}:`, host: t.host.split(':')[0], port: t.port ?? (t.protocol === 'http' ? 80 : 443), path: t.canonicalUri, method, headers, timeout: 20000 },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c as Buffer));
          res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }));
        },
      );
      req.on('error', reject);
      req.on('timeout', () => req.destroy(new Error('s3 request timeout')));
      if (body) req.write(body);
      req.end();
    });
  }

  private creds() {
    return { accessKeyId: config.S3_ACCESS_KEY_ID, secretAccessKey: config.S3_SECRET_ACCESS_KEY, region: config.S3_REGION };
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    const t = this.resolve(key);
    const signed = signRequest({ ...this.creds(), method: 'PUT', host: t.host, canonicalUri: t.canonicalUri, payloadHash: sha256(data) });
    const res = await this.request(t, 'PUT', { ...signed, 'content-type': contentType, 'content-length': String(data.length) }, data);
    if (res.status >= 300) throw new Error(`s3_put_failed:${res.status}:${res.body.toString('utf8').slice(0, 200)}`);
  }

  async head(key: string): Promise<{ exists: boolean; size?: number }> {
    const t = this.resolve(key);
    const signed = signRequest({ ...this.creds(), method: 'HEAD', host: t.host, canonicalUri: t.canonicalUri, payloadHash: EMPTY_SHA256 });
    const res = await this.request(t, 'HEAD', signed);
    if (res.status === 404) return { exists: false };
    if (res.status >= 300) throw new Error(`s3_head_failed:${res.status}`);
    const len = res.headers['content-length'];
    return { exists: true, size: len ? Number(len) : undefined };
  }

  async getStream(): Promise<Readable | null> {
    return null; // S3 downloads use a presigned URL, not a proxied stream
  }

  async getSignedUrl(key: string, expiresSeconds: number): Promise<string | null> {
    const t = this.resolve(key);
    return presignGetUrl({ ...this.creds(), protocol: t.protocol, host: t.host, canonicalUri: t.canonicalUri, expiresSeconds });
  }

  async delete(key: string): Promise<void> {
    const t = this.resolve(key);
    const signed = signRequest({ ...this.creds(), method: 'DELETE', host: t.host, canonicalUri: t.canonicalUri, payloadHash: EMPTY_SHA256 });
    const res = await this.request(t, 'DELETE', signed);
    if (res.status >= 300 && res.status !== 404) throw new Error(`s3_delete_failed:${res.status}`);
  }
}
