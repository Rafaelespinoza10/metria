import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import {
  userKeyPrefix,
  type SaveFileInput,
  type StoragePort,
  type StoredFile,
} from './storage.port.js';

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export class LocalStorageService implements StoragePort {
  constructor(private readonly rootDir: string) {}

  /** Keys are server-generated; this guards path traversal on reads anyway. */
  private resolveSafe(key: string): string | null {
    const absolute = path.resolve(this.rootDir, key);
    if (!absolute.startsWith(path.resolve(this.rootDir) + path.sep)) return null;
    return absolute;
  }

  async save(input: SaveFileInput): Promise<StoredFile> {
    const key = `${userKeyPrefix(input.userId)}${input.folder}/${randomUUID()}.${input.extension}`;
    const absolute = this.resolveSafe(key);
    if (!absolute) throw new Error(`Invalid storage key: ${key}`);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, input.data);
    return { key, contentType: input.contentType };
  }

  async stream(key: string): Promise<{ stream: Readable; contentType: string } | null> {
    const absolute = this.resolveSafe(key);
    if (!absolute) return null;
    try {
      const stats = await stat(absolute);
      if (!stats.isFile()) return null;
    } catch {
      return null;
    }
    const extension = path.extname(absolute).slice(1).toLowerCase();
    return {
      stream: createReadStream(absolute),
      contentType: EXTENSION_CONTENT_TYPES[extension] ?? 'application/octet-stream',
    };
  }

  async delete(key: string): Promise<void> {
    const absolute = this.resolveSafe(key);
    if (!absolute) return;
    await rm(absolute, { force: true });
  }

  async deleteUserFiles(userId: string): Promise<void> {
    const absolute = this.resolveSafe(userKeyPrefix(userId));
    if (!absolute) return;
    await rm(absolute, { recursive: true, force: true });
  }
}
