import { describe, it, expect } from 'vitest';
import * as ops from './stack-ops.ts';
import { StateError } from './types.ts';

const base = () => ops.createStack('s1', 'Untitled');

describe('stack-ops: creation', () => {
  it('creates a stack with a single empty row', () => {
    const stack = base();
    expect(stack.name).toBe('Untitled');
    expect(stack.rows).toEqual([{ id: 1, source: '' }]);
    expect(stack.nextRowId).toBe(2);
  });
});

describe('stack-ops: rows', () => {
  it('assigns monotonic ids that are never reused', () => {
    let stack = ops.addRow(base(), '1 + 1'); // id 2
    stack = ops.deleteRow(stack, 2);
    stack = ops.addRow(stack, '2 + 2'); // id 3, not 2
    expect(stack.rows.map((r) => r.id)).toEqual([1, 3]);
    expect(stack.nextRowId).toBe(4);
  });

  it('inserts a row at an index', () => {
    const stack = ops.insertRowAt(ops.addRow(base(), 'a'), 1, 'b');
    expect(stack.rows.map((r) => r.source)).toEqual(['', 'b', 'a']);
  });

  it('updates a row source immutably', () => {
    const stack = base();
    const next = ops.updateRowSource(stack, 1, '6 * 7');
    expect(next.rows[0]?.source).toBe('6 * 7');
    expect(stack.rows[0]?.source).toBe(''); // original untouched
  });

  it('names rows, validating and enforcing uniqueness', () => {
    const stack = ops.renameRow(ops.addRow(base(), '2'), 1, 'total');
    expect(stack.rows[0]?.name).toBe('total');

    expect(() => ops.renameRow(stack, 2, 'total')).toThrow(StateError);
    expect(() => ops.renameRow(stack, 2, '2bad')).toThrow(StateError);

    const cleared = ops.renameRow(stack, 1, undefined);
    expect(cleared.rows[0]?.name).toBeUndefined();
  });

  it('moves rows within a stack', () => {
    let stack = ops.addRow(ops.addRow(base(), 'a'), 'b'); // ids 1,2,3
    stack = ops.moveRow(stack, 3, 0);
    expect(stack.rows.map((r) => r.id)).toEqual([3, 1, 2]);
  });

  it('renames the stack', () => {
    expect(ops.renameStack(base(), 'Budget').name).toBe('Budget');
  });
});
