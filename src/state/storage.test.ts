import { describe, it, expect } from 'vitest';
import {
  MemoryStorageAdapter,
  SCHEMA_VERSION,
  createInitialState,
  deserialize,
  serialize,
} from './storage.ts';

describe('storage: serialization', () => {
  it('round-trips persisted state', () => {
    const state = createInitialState('stack-1');
    const restored = deserialize(serialize(state));
    expect(restored).toEqual(state);
  });

  it('returns null for absent or corrupt data', () => {
    expect(deserialize(null)).toBeNull();
    expect(deserialize('not json')).toBeNull();
    expect(deserialize('{"schemaVersion":1}')).toBeNull(); // missing document
  });

  it('rejects an unknown schema version (forces a fresh start)', () => {
    const future = serialize({
      ...createInitialState('stack-1'),
      schemaVersion: SCHEMA_VERSION + 99,
    });
    expect(deserialize(future)).toBeNull();
  });
});

describe('storage: MemoryStorageAdapter', () => {
  it('stores and retrieves the last saved value', () => {
    const adapter = new MemoryStorageAdapter();
    expect(adapter.load()).toBeNull();
    adapter.save('hello');
    expect(adapter.load()).toBe('hello');
  });
});
