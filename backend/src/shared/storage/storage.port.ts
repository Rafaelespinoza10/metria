import type { Readable } from 'node:stream';

export interface SaveFileInput {
  userId: string;
  /** Logical folder inside the user's prefix, e.g. 'photos'. */
  folder: string;
  extension: string;
  contentType: string;
  data: Buffer;
}

export interface StoredFile {
  key: string;
  contentType: string;
}

/** File storage abstraction. Local disk today; an S3/R2 driver can replace it
 *  without touching services. Keys look like `users/<userId>/<folder>/<uuid>.<ext>`. */
export interface StoragePort {
  save(input: SaveFileInput): Promise<StoredFile>;
  /** Returns null when the key does not exist. */
  stream(key: string): Promise<{ stream: Readable; contentType: string } | null>;
  delete(key: string): Promise<void>;
  /** Removes everything under `users/<userId>/` (permanent account deletion). */
  deleteUserFiles(userId: string): Promise<void>;
}

export function userKeyPrefix(userId: string): string {
  return `users/${userId}/`;
}
