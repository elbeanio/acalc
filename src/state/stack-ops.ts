import type { Row, Stack } from './types.ts';
import { StateError } from './types.ts';

/** A row name must be a valid identifier so it can be referenced as `$name`. */
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** A fresh stack with a single empty row so it's immediately usable. */
export function createStack(id: string, name: string): Stack {
  return { id, name, nextRowId: 2, rows: [{ id: 1, source: '' }] };
}

/** Append a new (or seeded) row, assigning the next monotonic id. */
export function addRow(stack: Stack, source = ''): Stack {
  return {
    ...stack,
    nextRowId: stack.nextRowId + 1,
    rows: [...stack.rows, { id: stack.nextRowId, source }],
  };
}

/** Insert a new empty row at a specific index (for "insert above/below"). */
export function insertRowAt(stack: Stack, index: number, source = ''): Stack {
  const rows = [...stack.rows];
  rows.splice(clamp(index, rows.length), 0, { id: stack.nextRowId, source });
  return { ...stack, nextRowId: stack.nextRowId + 1, rows };
}

export function updateRowSource(
  stack: Stack,
  rowId: number,
  source: string,
): Stack {
  return { ...stack, rows: mapRow(stack.rows, rowId, (row) => ({ ...row, source })) };
}

/** Set (or clear, with `undefined`) a row's name. Enforces uniqueness. */
export function renameRow(
  stack: Stack,
  rowId: number,
  name: string | undefined,
): Stack {
  if (name !== undefined) {
    if (!NAME_RE.test(name)) {
      throw new StateError(
        `"${name}" is not a valid name (letters, digits, underscore; not starting with a digit)`,
      );
    }
    if (stack.rows.some((r) => r.id !== rowId && r.name === name)) {
      throw new StateError(`The name "${name}" is already used`);
    }
  }
  return { ...stack, rows: mapRow(stack.rows, rowId, (row) => withName(row, name)) };
}

export function deleteRow(stack: Stack, rowId: number): Stack {
  return { ...stack, rows: stack.rows.filter((r) => r.id !== rowId) };
}

/** Move a row to a new index within its stack. */
export function moveRow(stack: Stack, rowId: number, toIndex: number): Stack {
  const from = stack.rows.findIndex((r) => r.id === rowId);
  if (from === -1) throw new StateError(`No row ${rowId}`);
  const rows = [...stack.rows];
  const [moved] = rows.splice(from, 1);
  rows.splice(clamp(toIndex, rows.length), 0, moved!);
  return { ...stack, rows };
}

export function renameStack(stack: Stack, name: string): Stack {
  return { ...stack, name };
}

// --- helpers ---------------------------------------------------------------

function clamp(index: number, max: number): number {
  return Math.max(0, Math.min(index, max));
}

function mapRow(rows: readonly Row[], rowId: number, fn: (row: Row) => Row): Row[] {
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
