import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string';
import type { Row, Stack } from './types.ts';

/**
 * Serialising a stack into a URL hash, so a calculation can be shared as a link
 * that clones in as a new stack on the other end. Everything lives in the hash
 * (`#s=…`), so nothing is ever sent to a server; lz-string keeps the link short.
 */

const SHARE_VERSION = 1;

/** A defensive ceiling on a decoded link, so a malicious hash can't hang a tab. */
const MAX_ROWS = 500;

/** The shareable slice of a stack: its name, id counter, and rows. */
export interface SharedStack {
  readonly name: string;
  readonly nextRowId: number;
  readonly rows: readonly Row[];
}

interface SharePayload extends SharedStack {
  readonly v: number;
}

/** Compress a stack into a URL-hash-safe string (the value after `#s=`). */
export function encodeStack(stack: Stack): string {
  const payload: SharePayload = {
    v: SHARE_VERSION,
    name: stack.name,
    nextRowId: stack.nextRowId,
    // Drop undefined `name` so the JSON (and the link) stays tight.
    rows: stack.rows.map((r) =>
      r.name !== undefined
        ? { id: r.id, name: r.name, source: r.source }
        : { id: r.id, source: r.source },
    ),
  };
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

/**
 * Decode a shared stack from a hash value, or `null` if it is missing, corrupt,
 * or from an incompatible version. Never throws — a bad link is just ignored.
 */
export function decodeStack(encoded: string): SharedStack | null {
  if (!encoded) return null;
  let parsed: unknown;
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isValidPayload(parsed)) return null;
  return { name: parsed.name, nextRowId: parsed.nextRowId, rows: parsed.rows };
}

function isValidPayload(p: unknown): p is SharePayload {
  if (typeof p !== 'object' || p === null) return false;
  const o = p as Record<string, unknown>;
  return (
    o.v === SHARE_VERSION &&
    typeof o.name === 'string' &&
    typeof o.nextRowId === 'number' &&
    Number.isInteger(o.nextRowId) &&
    Array.isArray(o.rows) &&
    o.rows.length > 0 &&
    o.rows.length <= MAX_ROWS &&
    o.rows.every(isValidRow)
  );
}

function isValidRow(r: unknown): r is Row {
  if (typeof r !== 'object' || r === null) return false;
  const o = r as Record<string, unknown>;
  return (
    typeof o.id === 'number' &&
    Number.isInteger(o.id) &&
    typeof o.source === 'string' &&
    (o.name === undefined || typeof o.name === 'string')
  );
}
