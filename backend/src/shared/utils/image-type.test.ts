import { describe, expect, it } from 'vitest';
import { sniffImageType } from './image-type.js';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from('WEBPVP8 ', 'ascii'),
]);

describe('sniffImageType', () => {
  it('detects JPEG, PNG, and WebP from magic bytes', () => {
    expect(sniffImageType(JPEG)).toBe('image/jpeg');
    expect(sniffImageType(PNG)).toBe('image/png');
    expect(sniffImageType(WEBP)).toBe('image/webp');
  });

  it('rejects non-image bytes regardless of any declared type', () => {
    expect(sniffImageType(Buffer.from('plain text file'))).toBeNull();
    expect(sniffImageType(Buffer.from('<svg xmlns="…"></svg>'))).toBeNull();
    expect(sniffImageType(Buffer.from('GIF89a'))).toBeNull();
    expect(sniffImageType(Buffer.alloc(0))).toBeNull();
  });

  it('rejects truncated magic sequences', () => {
    expect(sniffImageType(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(sniffImageType(PNG.subarray(0, 7))).toBeNull();
    expect(sniffImageType(Buffer.from('RIFFxxxxWEB', 'ascii'))).toBeNull();
  });
});
