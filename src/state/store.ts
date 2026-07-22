import {
  canRedo,
  canUndo,
  initHistory,
  pushHistory,
  redo,
  undo,
  type History,
} from './history.ts';
import * as ops from './stack-ops.ts';
import {
  createInitialState,
  deserialize,
  serialize,
  SCHEMA_VERSION,
  type StorageAdapter,
} from './storage.ts';
import type { Document, Stack } from './types.ts';
import { StateError } from './types.ts';

/** Immutable view of the store, consumed by the UI. */
export interface StoreSnapshot {
  readonly document: Document;
  readonly activeStackId: string | null;
  /** Undo/redo availability for the *active* stack. */
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

type IdGenerator = () => string;

const defaultIdGenerator: IdGenerator = () => globalThis.crypto.randomUUID();

/**
 * Central application store.
 *
 * Undo history is **per stack**: each tab keeps its own past/future, so undoing
 * on one tab never touches another, and creating or switching tabs is not part
 * of any tab's history. Content edits (rows, stack name) are undoable; stack
 * creation/deletion and active-stack selection are structural/view state.
 *
 * Row/stack transforms are the pure functions in `stack-ops.ts`; this class
 * sequences them through history, persists on change, and notifies subscribers.
 * Undo history is session-scoped (not persisted across reloads).
 */
export class AppStore {
  private order: string[];
  private readonly histories = new Map<string, History<Stack>>();
  private activeStackId: string | null;
  private readonly listeners = new Set<() => void>();
  private snapshot: StoreSnapshot;

  constructor(
    private readonly adapter: StorageAdapter,
    private readonly genId: IdGenerator = defaultIdGenerator,
  ) {
    const loaded = deserialize(adapter.load());
    const initial = loaded ?? createInitialState(this.genId());
    this.order = initial.document.stacks.map((s) => s.id);
    for (const stack of initial.document.stacks) {
      this.histories.set(stack.id, initHistory(stack));
    }
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

  // --- row actions (undoable, per stack) ----------------------------------

  addRow(stackId: string, source = ''): void {
    this.mutate(stackId, (s) => ops.addRow(s, source));
  }

  insertRowAt(stackId: string, index: number, source = ''): void {
    this.mutate(stackId, (s) => ops.insertRowAt(s, index, source));
  }

  updateRowSource(stackId: string, rowId: number, source: string): void {
    this.mutate(stackId, (s) => ops.updateRowSource(s, rowId, source));
  }

  /** May throw {@link StateError} on an invalid/duplicate name. */
  renameRow(stackId: string, rowId: number, name: string | undefined): void {
    this.mutate(stackId, (s) => ops.renameRow(s, rowId, name));
  }

  deleteRow(stackId: string, rowId: number): void {
    this.mutate(stackId, (s) => ops.deleteRow(s, rowId));
  }

  moveRow(stackId: string, rowId: number, toIndex: number): void {
    this.mutate(stackId, (s) => ops.moveRow(s, rowId, toIndex));
  }

  /** Renaming a stack is part of that stack's undo history. */
  renameStack(stackId: string, name: string): void {
    this.mutate(stackId, (s) => ops.renameStack(s, name));
  }

  // --- stack lifecycle (structural, not undoable) -------------------------

  /** Create a new stack and make it active. Returns the new stack's id. */
  addStack(name: string): string {
    const id = this.genId();
    this.histories.set(id, initHistory(ops.createStack(id, name)));
    this.order.push(id);
    this.activeStackId = id;
    this.afterChange();
    return id;
  }

  /** Delete a stack; if it was the last one, a fresh empty stack replaces it. */
  deleteStack(stackId: string): void {
    this.histories.delete(stackId);
    this.order = this.order.filter((id) => id !== stackId);
    if (this.order.length === 0) {
      const id = this.genId();
      this.histories.set(id, initHistory(ops.createStack(id, 'Untitled')));
      this.order.push(id);
    }
    this.afterChange();
  }

  setActiveStack(stackId: string): void {
    if (stackId === this.activeStackId) return;
    this.activeStackId = stackId;
    this.reconcileActive();
    this.snapshot = this.computeSnapshot();
    this.persist();
    this.emit();
  }

  // --- history (acts on the active stack) ---------------------------------

  undo(): void {
    this.applyHistory(undo);
  }

  redo(): void {
    this.applyHistory(redo);
  }

  // --- internals -----------------------------------------------------------

  private mutate(stackId: string, fn: (stack: Stack) => Stack): void {
    const history = this.histories.get(stackId);
    if (!history) throw new StateError(`No stack "${stackId}"`);
    this.histories.set(stackId, pushHistory(history, fn(history.present)));
    this.afterChange();
  }

  private applyHistory(
    op: (h: History<Stack>) => History<Stack>,
  ): void {
    if (!this.activeStackId) return;
    const history = this.histories.get(this.activeStackId);
    if (!history) return;
    this.histories.set(this.activeStackId, op(history));
    this.afterChange();
  }

  private get document(): Document {
    return { stacks: this.order.map((id) => this.histories.get(id)!.present) };
  }

  private afterChange(): void {
    this.reconcileActive();
    this.snapshot = this.computeSnapshot();
    this.persist();
    this.emit();
  }

  /** Ensure `activeStackId` points at an existing stack. */
  private reconcileActive(): void {
    if (this.order.length === 0) {
      this.activeStackId = null;
      return;
    }
    if (!this.order.includes(this.activeStackId!)) {
      this.activeStackId = this.order[0]!;
    }
  }

  private computeSnapshot(): StoreSnapshot {
    const active = this.activeStackId
      ? this.histories.get(this.activeStackId)
      : undefined;
    return {
      document: this.document,
      activeStackId: this.activeStackId,
      canUndo: active ? canUndo(active) : false,
      canRedo: active ? canRedo(active) : false,
    };
  }

  private persist(): void {
    this.adapter.save(
      serialize({
        schemaVersion: SCHEMA_VERSION,
        activeStackId: this.activeStackId,
        document: this.document,
      }),
    );
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
