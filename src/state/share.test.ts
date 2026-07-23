import { describe, it, expect } from 'vitest';
import { compressToEncodedURIComponent } from 'lz-string';
import { encodeStack, decodeStack } from './share.ts';
import type { Stack } from './types.ts';

const stack: Stack = {
  id: 'internal-id',
  name: 'Budget',
  nextRowId: 4,
  rows: [
    { id: 1, source: '3 + 3' },
    { id: 2, name: 'total', source: '$1 * 2' },
    { id: 3, source: '' },
  ],
};

const packed = (payload: unknown) =>
  compressToEncodedURIComponent(JSON.stringify(payload));

describe('share encode/decode', () => {
  it('round-trips a stack, preserving rows and ids but not the internal id', () => {
    const decoded = decodeStack(encodeStack(stack));
    expect(decoded).toEqual({
      name: 'Budget',
      nextRowId: 4,
      rows: [
        { id: 1, source: '3 + 3' },
        { id: 2, name: 'total', source: '$1 * 2' },
        { id: 3, source: '' },
      ],
    });
  });

  it('produces a URL-hash-safe string (no #, ?, / or whitespace)', () => {
    expect(encodeStack(stack)).toMatch(/^[A-Za-z0-9+\-$]+$/);
  });

  it('returns null for missing, empty, or corrupt input', () => {
    expect(decodeStack('')).toBeNull();
    expect(decodeStack('not-real-lz-data!!!')).toBeNull();
    expect(decodeStack(compressToEncodedURIComponent('{not json'))).toBeNull();
  });

  it('rejects an incompatible version', () => {
    expect(decodeStack(packed({ v: 99, name: 'x', nextRowId: 2, rows: [{ id: 1, source: '1' }] }))).toBeNull();
  });

  it('rejects malformed or empty row sets', () => {
    expect(decodeStack(packed({ v: 1, name: 'x', nextRowId: 2, rows: [] }))).toBeNull();
    expect(decodeStack(packed({ v: 1, name: 'x', nextRowId: 2, rows: [{ id: 'nope', source: '1' }] }))).toBeNull();
    expect(decodeStack(packed({ v: 1, name: 5, nextRowId: 2, rows: [{ id: 1, source: '1' }] }))).toBeNull();
  });

  it('rejects an oversized row set (defensive ceiling)', () => {
    const rows = Array.from({ length: 501 }, (_, i) => ({ id: i + 1, source: '1' }));
    expect(decodeStack(packed({ v: 1, name: 'x', nextRowId: 502, rows }))).toBeNull();
  });
});
