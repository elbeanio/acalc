/** A single calculation row — the atomic source of truth. */
export interface Row {
  readonly id: number;
  readonly name?: string;
  readonly source: string;
}

/** An ordered, named list of rows with its own monotonic id counter. */
export interface Stack {
  readonly id: string;
  readonly name: string;
  /** Next row id to assign; only ever increases, ids are never reused. */
  readonly nextRowId: number;
  readonly rows: readonly Row[];
}

/** The undoable content of the app: all stacks. */
export interface Document {
  readonly stacks: readonly Stack[];
}

/** The full persisted state, including non-undoable view state. */
export interface PersistedState {
  readonly schemaVersion: number;
  /** Currently viewed stack; view state, deliberately outside undo history. */
  readonly activeStackId: string | null;
  readonly document: Document;
}

/** Error raised by an invalid state transition (e.g. a duplicate row name). */
export class StateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateError';
  }
}
