/**
 * Generic undo/redo history. Because the document is a small, immutable value,
 * undo is simply keeping snapshots of it — no command objects or inverse ops.
 */
export interface History<T> {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
}

/** Cap on retained undo steps, to bound memory. */
const MAX_HISTORY = 200;

export function initHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

/** Record a new present, discarding the redo stack. No-op if unchanged. */
export function pushHistory<T>(history: History<T>, next: T): History<T> {
  if (Object.is(next, history.present)) return history;
  const past = [...history.past, history.present];
  if (past.length > MAX_HISTORY) past.shift();
  return { past, present: next, future: [] };
}

/**
 * Replace the present without adding a past entry (and clear redo). Used to
 * coalesce a burst of edits — e.g. consecutive keystrokes — into one undo step.
 */
export function replacePresent<T>(history: History<T>, next: T): History<T> {
  return { past: history.past, present: next, future: [] };
}

export function undo<T>(history: History<T>): History<T> {
  if (history.past.length === 0) return history;
  const present = history.past[history.past.length - 1]!;
  return {
    past: history.past.slice(0, -1),
    present,
    future: [history.present, ...history.future],
  };
}

export function redo<T>(history: History<T>): History<T> {
  if (history.future.length === 0) return history;
  const present = history.future[0]!;
  return {
    past: [...history.past, history.present],
    present,
    future: history.future.slice(1),
  };
}

export const canUndo = (h: History<unknown>): boolean => h.past.length > 0;
export const canRedo = (h: History<unknown>): boolean => h.future.length > 0;
