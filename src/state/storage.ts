import { createStack } from './stack-ops.ts';
import type { Document, PersistedState, Row, Stack } from './types.ts';

export const SCHEMA_VERSION = 1;

/** Persistence backend. localStorage today; swappable (e.g. Dexie) later. */
export interface StorageAdapter {
  load(): string | null;
  save(data: string): void;
}

/** Default adapter, backed by `window.localStorage`. */
export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly key = 'acalc.state.v1') {}

  load(): string | null {
    try {
      return globalThis.localStorage.getItem(this.key);
    } catch {
      return null;
    }
  }

  save(data: string): void {
    try {
      globalThis.localStorage.setItem(this.key, data);
    } catch {
      // Quota or unavailable storage — fail quietly; in-memory state stands.
    }
  }
}

/** In-memory adapter, for tests and non-persistent contexts. */
export class MemoryStorageAdapter implements StorageAdapter {
  private data: string | null = null;

  load(): string | null {
    return this.data;
  }

  save(data: string): void {
    this.data = data;
  }
}

export function createInitialState(stackId: string): PersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    activeStackId: stackId,
    document: { stacks: [createStack(stackId, 'Untitled')] },
  };
}

export function serialize(state: PersistedState): string {
  return JSON.stringify(state);
}

/**
 * Parse and validate persisted JSON, applying migrations. Returns `null` when
 * the data is absent, corrupt, or from an unknown/newer schema — the caller
 * then starts fresh rather than crashing.
 */
export function deserialize(raw: string | null): PersistedState | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return migrate(parsed);
}

function migrate(data: unknown): PersistedState | null {
  if (!isRecord(data)) return null;
  // Only v1 exists today; future versions add cases that upgrade `data` here.
  if (data.schemaVersion !== SCHEMA_VERSION) return null;
  return isPersistedState(data) ? data : null;
}

// --- validation ------------------------------------------------------------

function isPersistedState(v: unknown): v is PersistedState {
  return (
    isRecord(v) &&
    (v.activeStackId === null || typeof v.activeStackId === 'string') &&
    isDocument(v.document)
  );
}

function isDocument(v: unknown): v is Document {
  return isRecord(v) && Array.isArray(v.stacks) && v.stacks.every(isStack);
}

function isStack(v: unknown): v is Stack {
  return (
    isRecord(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.nextRowId === 'number' &&
    Array.isArray(v.rows) &&
    v.rows.every(isRow)
  );
}

function isRow(v: unknown): v is Row {
  return (
    isRecord(v) &&
    typeof v.id === 'number' &&
    typeof v.source === 'string' &&
    (v.name === undefined || typeof v.name === 'string')
  );
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
