import * as ops from './document.ts';
import {
  canRedo,
  canUndo,
  initHistory,
  pushHistory,
  redo,
  undo,
  type History,
} from './history.ts';
import {
  createInitialState,
  deserialize,
  serialize,
  SCHEMA_VERSION,
  type StorageAdapter,
} from './storage.ts';
import type { Document } from './types.ts';

/** Immutable view of the store, consumed by the UI. */
export interface StoreSnapshot {
  readonly document: Document;
  readonly activeStackId: string | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

type IdGenerator = () => string;

const defaultIdGenerator: IdGenerator = () => globalThis.crypto.randomUUID();

/**
 * Central application store. Document changes go through undoable history and
 * are persisted after every change; active-stack selection is view state, kept
 * out of history. Document mutations are pure functions from `document.ts`;
 * this class only sequences them, persists, and notifies subscribers.
 */
export class AppStore {
  private history: History<Document>;
  private activeStackId: string | null;
  private readonly listeners = new Set<() => void>();
  private snapshot: StoreSnapshot;

  constructor(
    private readonly adapter: StorageAdapter,
    private readonly genId: IdGenerator = defaultIdGenerator,
  ) {
    const loaded = deserialize(adapter.load());
    const initial = loaded ?? createInitialState(this.genId());
    this.history = initHistory(initial.document);
    this.activeStackId = initial.activeStackId;
    this.reconcileActive();
    this.snapshot = this.computeSnapshot();
    if (!loaded) this.persist();
  }

  // --- subscription (useSyncExternalStore-compatible) ---------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): StoreSnapshot => this.snapshot;

  // --- row actions ---------------------------------------------------------

  addRow(stackId: string, source = ''): void {
    this.commit(ops.addRow(this.doc, stackId, source));
  }

  insertRowAt(stackId: string, index: number, source = ''): void {
    this.commit(ops.insertRowAt(this.doc, stackId, index, source));
  }

  updateRowSource(stackId: string, rowId: number, source: string): void {
    this.commit(ops.updateRowSource(this.doc, stackId, rowId, source));
  }

  /** May throw {@link StateError} on an invalid/duplicate name. */
  renameRow(stackId: string, rowId: number, name: string | undefined): void {
    this.commit(ops.renameRow(this.doc, stackId, rowId, name));
  }

  deleteRow(stackId: string, rowId: number): void {
    this.commit(ops.deleteRow(this.doc, stackId, rowId));
  }

  moveRow(stackId: string, rowId: number, toIndex: number): void {
    this.commit(ops.moveRow(this.doc, stackId, rowId, toIndex));
  }

  // --- stack actions -------------------------------------------------------

  /** Create a new stack and make it active. Returns the new stack's id. */
  addStack(name: string): string {
    const id = this.genId();
    this.history = pushHistory(this.history, ops.addStack(this.doc, id, name));
    this.activeStackId = id;
    this.afterChange();
    return id;
  }

  renameStack(stackId: string, name: string): void {
    this.commit(ops.renameStack(this.doc, stackId, name));
  }

  /** Delete a stack; if it was the last one, a fresh empty stack replaces it. */
  deleteStack(stackId: string): void {
    let next = ops.deleteStack(this.doc, stackId);
    if (next.stacks.length === 0) {
      next = ops.createDocument(this.genId());
    }
    this.commit(next);
  }

  setActiveStack(stackId: string): void {
    if (stackId === this.activeStackId) return;
    this.activeStackId = stackId;
    this.reconcileActive();
    this.snapshot = this.computeSnapshot();
    this.persist();
    this.emit();
  }

  // --- history -------------------------------------------------------------

  undo(): void {
    this.history = undo(this.history);
    this.afterChange();
  }

  redo(): void {
    this.history = redo(this.history);
    this.afterChange();
  }

  // --- internals -----------------------------------------------------------

  private get doc(): Document {
    return this.history.present;
  }

  private commit(next: Document): void {
    this.history = pushHistory(this.history, next);
    this.afterChange();
  }

  private afterChange(): void {
    this.reconcileActive();
    this.snapshot = this.computeSnapshot();
    this.persist();
    this.emit();
  }

  /** Ensure `activeStackId` points at an existing stack. */
  private reconcileActive(): void {
    const stacks = this.doc.stacks;
    if (stacks.length === 0) {
      this.activeStackId = null;
      return;
    }
    if (!stacks.some((s) => s.id === this.activeStackId)) {
      this.activeStackId = stacks[0]!.id;
    }
  }

  private computeSnapshot(): StoreSnapshot {
    return {
      document: this.doc,
      activeStackId: this.activeStackId,
      canUndo: canUndo(this.history),
      canRedo: canRedo(this.history),
    };
  }

  private persist(): void {
    this.adapter.save(
      serialize({
        schemaVersion: SCHEMA_VERSION,
        activeStackId: this.activeStackId,
        document: this.doc,
      }),
    );
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
