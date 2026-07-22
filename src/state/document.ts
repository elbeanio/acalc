import type { Document, Row, Stack } from './types.ts';
import { StateError } from './types.ts';

/** A row name must be a valid identifier so it can be referenced as `$name`. */
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** A brand-new document with a single empty stack. */
export function createDocument(stackId: string): Document {
  return { stacks: [createStack(stackId, 'Untitled')] };
}

export function createStack(id: string, name: string): Stack {
  // Start with one empty row so a stack is immediately usable.
  return { id, name, nextRowId: 2, rows: [{ id: 1, source: '' }] };
}

export function findStack(doc: Document, stackId: string): Stack {
  const stack = doc.stacks.find((s) => s.id === stackId);
  if (!stack) throw new StateError(`No stack "${stackId}"`);
  return stack;
}

// --- row operations --------------------------------------------------------

/** Append a new empty (or seeded) row, assigning the next monotonic id. */
export function addRow(
  doc: Document,
  stackId: string,
  source = '',
): Document {
  return updateStack(doc, stackId, (stack) => ({
    ...stack,
    nextRowId: stack.nextRowId + 1,
    rows: [...stack.rows, { id: stack.nextRowId, source }],
  }));
}

/** Insert a new empty row at a specific index (for "insert above/below"). */
export function insertRowAt(
  doc: Document,
  stackId: string,
  index: number,
  source = '',
): Document {
  return updateStack(doc, stackId, (stack) => {
    const rows = [...stack.rows];
    const clamped = Math.max(0, Math.min(index, rows.length));
    rows.splice(clamped, 0, { id: stack.nextRowId, source });
    return { ...stack, nextRowId: stack.nextRowId + 1, rows };
  });
}

export function updateRowSource(
  doc: Document,
  stackId: string,
  rowId: number,
  source: string,
): Document {
  return updateStack(doc, stackId, (stack) => ({
    ...stack,
    rows: mapRow(stack.rows, rowId, (row) => ({ ...row, source })),
  }));
}

/** Set (or clear, with `undefined`) a row's name. Enforces uniqueness. */
export function renameRow(
  doc: Document,
  stackId: string,
  rowId: number,
  name: string | undefined,
): Document {
  return updateStack(doc, stackId, (stack) => {
    if (name !== undefined) {
      if (!NAME_RE.test(name)) {
        throw new StateError(
          `"${name}" is not a valid name (letters, digits, underscore; not starting with a digit)`,
        );
      }
      const clash = stack.rows.some((r) => r.id !== rowId && r.name === name);
      if (clash) throw new StateError(`The name "${name}" is already used`);
    }
    return {
      ...stack,
      rows: mapRow(stack.rows, rowId, (row) => withName(row, name)),
    };
  });
}

export function deleteRow(
  doc: Document,
  stackId: string,
  rowId: number,
): Document {
  return updateStack(doc, stackId, (stack) => ({
    ...stack,
    rows: stack.rows.filter((r) => r.id !== rowId),
  }));
}

/** Move a row to a new index within its stack. */
export function moveRow(
  doc: Document,
  stackId: string,
  rowId: number,
  toIndex: number,
): Document {
  return updateStack(doc, stackId, (stack) => {
    const from = stack.rows.findIndex((r) => r.id === rowId);
    if (from === -1) throw new StateError(`No row ${rowId}`);
    const rows = [...stack.rows];
    const [moved] = rows.splice(from, 1);
    const clamped = Math.max(0, Math.min(toIndex, rows.length));
    rows.splice(clamped, 0, moved!);
    return { ...stack, rows };
  });
}

// --- stack operations ------------------------------------------------------

export function addStack(
  doc: Document,
  stackId: string,
  name: string,
): Document {
  return { ...doc, stacks: [...doc.stacks, createStack(stackId, name)] };
}

export function renameStack(
  doc: Document,
  stackId: string,
  name: string,
): Document {
  return updateStack(doc, stackId, (stack) => ({ ...stack, name }));
}

export function deleteStack(doc: Document, stackId: string): Document {
  return { ...doc, stacks: doc.stacks.filter((s) => s.id !== stackId) };
}

// --- internal helpers ------------------------------------------------------

function updateStack(
  doc: Document,
  stackId: string,
  fn: (stack: Stack) => Stack,
): Document {
  let found = false;
  const stacks = doc.stacks.map((stack) => {
    if (stack.id !== stackId) return stack;
    found = true;
    return fn(stack);
  });
  if (!found) throw new StateError(`No stack "${stackId}"`);
  return { ...doc, stacks };
}

function mapRow(
  rows: readonly Row[],
  rowId: number,
  fn: (row: Row) => Row,
): Row[] {
  let found = false;
  const next = rows.map((row) => {
    if (row.id !== rowId) return row;
    found = true;
    return fn(row);
  });
  if (!found) throw new StateError(`No row ${rowId}`);
  return next;
}

/** Return a row with `name` set, or with the name removed when `undefined`. */
function withName(row: Row, name: string | undefined): Row {
  if (name === undefined) {
    const { name: _omit, ...rest } = row;
    return rest;
  }
  return { ...row, name };
}
