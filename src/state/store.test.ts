import { describe, it, expect } from 'vitest';
import { AppStore } from './store.ts';
import { MemoryStorageAdapter } from './storage.ts';
import { StateError } from './types.ts';

/** Deterministic id generator so tests are reproducible. */
function seededIds() {
  let n = 0;
  return () => `stack-${++n}`;
}

function newStore(adapter = new MemoryStorageAdapter()) {
  return { store: new AppStore(adapter, seededIds()), adapter };
}

function activeRows(store: AppStore) {
  const snap = store.getSnapshot();
  const stack = snap.document.stacks.find((s) => s.id === snap.activeStackId);
  return stack!.rows;
}

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
    expect(calls).toBe(1); // no longer subscribed
  });
});

describe('AppStore: persistence', () => {
  it('restores state from the adapter', () => {
    const adapter = new MemoryStorageAdapter();
    const { store } = newStore(adapter);
    store.updateRowSource('stack-1', 1, '42');
    store.addRow('stack-1', '$1 + 1');

    // A fresh store over the same adapter sees the saved rows.
    const reopened = new AppStore(adapter, seededIds());
    expect(activeRows(reopened).map((r) => r.source)).toEqual(['42', '$1 + 1']);
  });
});

describe('AppStore: undo / redo', () => {
  it('undoes and redoes document edits', () => {
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

  it('does not revert active-stack selection on undo', () => {
    const { store } = newStore();
    store.updateRowSource('stack-1', 1, 'edit'); // undoable
    const second = store.addStack('Second'); // stack-2, becomes active
    expect(store.getSnapshot().activeStackId).toBe(second);

    store.undo(); // undoes the addStack
    // active-stack is view state; reconciled to an existing stack, not thrown away
    expect(store.getSnapshot().activeStackId).toBe('stack-1');
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
