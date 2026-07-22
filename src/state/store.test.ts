import { describe, it, expect } from 'vitest';
import { AppStore } from './store.ts';
import { MemoryStorageAdapter } from './storage.ts';
import { StateError, type Stack } from './types.ts';

/** Deterministic id generator so tests are reproducible. */
function seededIds() {
  let n = 0;
  return () => `stack-${++n}`;
}

function newStore(adapter = new MemoryStorageAdapter()) {
  return { store: new AppStore(adapter, seededIds()), adapter };
}

const stackById = (store: AppStore, id: string): Stack =>
  store.getSnapshot().document.stacks.find((s) => s.id === id)!;

const activeRows = (store: AppStore) => {
  const snap = store.getSnapshot();
  return stackById(store, snap.activeStackId!).rows;
};

describe('AppStore: basics', () => {
  it('starts with one active stack containing an empty row', () => {
    const { store } = newStore();
    const snap = store.getSnapshot();
    expect(snap.document.stacks).toHaveLength(1);
    expect(snap.activeStackId).toBe('stack-1');
    expect(activeRows(store)).toEqual([{ id: 1, source: '' }]);
  });

  it('adds and edits rows', () => {
    const { store } = newStore();
    store.updateRowSource('stack-1', 1, '2 + 3');
    store.addRow('stack-1', '$1 * 10');
    expect(activeRows(store).map((r) => r.source)).toEqual(['2 + 3', '$1 * 10']);
  });

  it('notifies subscribers on change', () => {
    const { store } = newStore();
    let calls = 0;
    const unsub = store.subscribe(() => calls++);
    store.updateRowSource('stack-1', 1, '1');
    expect(calls).toBe(1);
    unsub();
    store.updateRowSource('stack-1', 1, '2');
    expect(calls).toBe(1);
  });
});

describe('AppStore: persistence', () => {
  it('restores document state from the adapter', () => {
    const adapter = new MemoryStorageAdapter();
    const { store } = newStore(adapter);
    store.updateRowSource('stack-1', 1, '42');
    store.addRow('stack-1', '$1 + 1');

    const reopened = new AppStore(adapter, seededIds());
    expect(activeRows(reopened).map((r) => r.source)).toEqual(['42', '$1 + 1']);
  });
});

describe('AppStore: per-stack undo/redo', () => {
  it('undoes and redoes edits within a stack', () => {
    const { store } = newStore();
    store.updateRowSource('stack-1', 1, 'first');
    store.updateRowSource('stack-1', 1, 'second');
    expect(store.getSnapshot().canUndo).toBe(true);

    store.undo();
    expect(activeRows(store)[0]?.source).toBe('first');
    store.undo();
    expect(activeRows(store)[0]?.source).toBe('');
    store.redo();
    expect(activeRows(store)[0]?.source).toBe('first');
  });

  it('keeps undo history independent per stack', () => {
    const { store } = newStore();
    store.updateRowSource('stack-1', 1, 'one'); // edit stack-1
    const second = store.addStack('Second'); // stack-2, now active
    store.updateRowSource(second, 1, 'two'); // edit stack-2

    // Undo on the active stack (stack-2) only affects stack-2.
    store.undo();
    expect(stackById(store, second).rows[0]?.source).toBe('');
    expect(stackById(store, 'stack-1').rows[0]?.source).toBe('one');

    // Switch to stack-1; its own history is intact.
    store.setActiveStack('stack-1');
    expect(store.getSnapshot().canUndo).toBe(true);
    store.undo();
    expect(stackById(store, 'stack-1').rows[0]?.source).toBe('');
  });

  it('does not undo stack creation (a new tab survives undo)', () => {
    const { store } = newStore();
    const second = store.addStack('Second');
    expect(store.getSnapshot().document.stacks).toHaveLength(2);

    // The new tab has an empty history, so undo is a no-op and it stays.
    store.undo();
    expect(store.getSnapshot().document.stacks).toHaveLength(2);
    expect(store.getSnapshot().activeStackId).toBe(second);
  });

  it('requests focus on the row changed by undo/redo', () => {
    const { store } = newStore();
    store.addRow('stack-1', 'x'); // row 2
    store.updateRowSource('stack-1', 2, 'edited');
    expect(store.getSnapshot().focus).toBeNull(); // edits do not request focus

    store.undo(); // reverts row 2
    const first = store.getSnapshot().focus;
    expect(first?.rowId).toBe(2);

    store.redo();
    const second = store.getSnapshot().focus;
    expect(second?.rowId).toBe(2);
    expect(second!.token).toBeGreaterThan(first!.token);
  });

  it('reflects undo availability for the active stack only', () => {
    const { store } = newStore();
    store.updateRowSource('stack-1', 1, 'edit');
    store.addStack('Second'); // active, fresh history
    expect(store.getSnapshot().canUndo).toBe(false);
    store.setActiveStack('stack-1');
    expect(store.getSnapshot().canUndo).toBe(true);
  });
});

describe('AppStore: stacks', () => {
  it('adds a stack and makes it active', () => {
    const { store } = newStore();
    const id = store.addStack('Budget');
    expect(id).toBe('stack-2');
    expect(store.getSnapshot().activeStackId).toBe('stack-2');
    expect(store.getSnapshot().document.stacks).toHaveLength(2);
  });

  it('deleting the last stack yields a fresh empty one', () => {
    const { store } = newStore();
    store.deleteStack('stack-1');
    const snap = store.getSnapshot();
    expect(snap.document.stacks).toHaveLength(1);
    expect(snap.activeStackId).toBe(snap.document.stacks[0]?.id);
    expect(snap.document.stacks[0]?.rows).toEqual([{ id: 1, source: '' }]);
  });

  it('propagates a duplicate-name error without mutating state', () => {
    const { store } = newStore();
    store.addRow('stack-1', '2'); // id 2
    store.renameRow('stack-1', 1, 'x');
    expect(() => store.renameRow('stack-1', 2, 'x')).toThrow(StateError);
    expect(activeRows(store)[1]?.name).toBeUndefined();
  });
});
