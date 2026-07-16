/**
 * Local filesystem storage adapter (development). Writes under STORAGE_LOCAL_DIR
 * outside the web root — never served statically. Keys are sanitized to prevent
 * path traversal.
 */
import { createReadStream } from 'node:fs';
import { mkdir, writeFile, unlink, stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import type { FileStorage } from './types';
import { config } from '../config';

function safeKeyPath(root: string, key: string): string {
  const clean = key.replace(/\.\.+/g, '').replace(/^[/\\]+/, '');
  const full = path.resolve(root, clean);
  if (!full.startsWith(path.resolve(root))) throw new Error('invalid storage key');
  return full;
}

export class LocalStorage implements FileStorage {
  readonly provider = 'local' as const;
  private root = path.resolve(process.cwd(), config.STORAGE_LOCAL_DIR);

  async put(key: string, data: Buffer): Promise<void> {
    const full = safeKeyPath(this.root, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }
  async head(key: string): Promise<{ exists: boolean; size?: number }> {
    try {
      const s = await stat(safeKeyPath(this.root, key));
      return { exists: true, size: s.size };
    } catch {
      return { exists: false };
    }
  }
  async getBytes(key: string): Promise<Buffer | null> {
    try {
      return await readFile(safeKeyPath(this.root, key));
    } catch {
      return null;
    }
  }
  async getStream(key: string): Promise<Readable> {
    return createReadStream(safeKeyPath(this.root, key));
  }
  async getSignedUrl(): Promise<string | null> {
    return null; // local adapter streams through the authorized endpoint instead
  }
  async delete(key: string): Promise<void> {
    await unlink(safeKeyPath(this.root, key)).catch(() => undefined);
  }
}
