import { describe, it, expect } from 'vitest';
import { computeStack } from './compute.ts';
import type { Row, RowErrorKind, RowResult } from './types.ts';

const compute = (rows: Row[]) => computeStack(rows);

function val(results: Map<number, RowResult>, id: number): string {
  const r = results.get(id);
  if (r?.status !== 'ok') {
    throw new Error(`row ${id} not ok: ${JSON.stringify(r)}`);
  }
  return r.value.toDisplay();
}

function status(results: Map<number, RowResult>, id: number): string {
  return results.get(id)!.status;
}

function errKind(results: Map<number, RowResult>, id: number): RowErrorKind {
  const r = results.get(id);
  if (r?.status !== 'error') throw new Error(`row ${id} is not an error`);
  return r.error.kind;
}

describe('computeStack: references and recompute', () => {
  it('computes a simple dependent chain', () => {
    const results = compute([
      { id: 1, source: '2 + 3' },
      { id: 2, source: '$1 * 10' },
    ]);
    expect(val(results, 1)).toBe('5');
    expect(val(results, 2)).toBe('50');
  });

  it('ripples an edit to an earlier row through its dependents', () => {
    const before = compute([
      { id: 1, source: '2 + 3' },
      { id: 2, source: '$1 * 10' },
    ]);
    expect(val(before, 2)).toBe('50');

    // Same stack, row 1 edited — recompute is pure and reflects the change.
    const after = compute([
      { id: 1, source: '2 + 8' },
      { id: 2, source: '$1 * 10' },
    ]);
    expect(val(after, 1)).toBe('10');
    expect(val(after, 2)).toBe('100');
  });

  it('resolves references by name', () => {
    const results = compute([
      { id: 1, name: 'price', source: '100' },
      { id: 2, source: '$price * 1.2' },
    ]);
    expect(val(results, 2)).toBe('120');
  });

  it('handles a reference to a row that appears later (forward reference)', () => {
    const results = compute([
      { id: 1, source: '$2 + 1' },
      { id: 2, source: '10' },
    ]);
    expect(val(results, 1)).toBe('11');
    expect(val(results, 2)).toBe('10');
  });

  it('supports a realistic percent-and-total chain', () => {
    const results = compute([
      { id: 1, source: '250' },
      { id: 2, source: '$1 * 20%' },
      { id: 3, source: '$1 + $2' },
    ]);
    expect(val(results, 2)).toBe('50');
    expect(val(results, 3)).toBe('300');
  });
});

describe('computeStack: dangling references (delete policy b)', () => {
  it('flags a reference to a missing id', () => {
    const results = compute([{ id: 1, source: '$9 + 1' }]);
    expect(errKind(results, 1)).toBe('ref');
  });

  it('a deleted row leaves its dependents dangling, nothing else lost', () => {
    // Row 1 has been deleted; row 2 still references it, row 3 is independent.
    const results = compute([
      { id: 2, source: '$1 + 1' },
      { id: 3, source: '40 + 2' },
    ]);
    expect(errKind(results, 2)).toBe('ref');
    expect(val(results, 3)).toBe('42');
  });
});

describe('computeStack: error propagation', () => {
  it('reports parse errors', () => {
    expect(errKind(compute([{ id: 1, source: '1 +' }]), 1)).toBe('parse');
  });

  it('reports evaluation errors', () => {
    expect(errKind(compute([{ id: 1, source: '1 / 0' }]), 1)).toBe('eval');
  });

  it('blocks rows that depend on an errored row', () => {
    const results = compute([
      { id: 1, source: '1 / 0' },
      { id: 2, source: '$1 + 1' },
    ]);
    expect(errKind(results, 1)).toBe('eval');
    expect(errKind(results, 2)).toBe('blocked');
  });

  it('treats an empty row and its dependents appropriately', () => {
    const results = compute([
      { id: 1, source: '   ' },
      { id: 2, source: '$1 + 1' },
    ]);
    expect(status(results, 1)).toBe('empty');
    expect(errKind(results, 2)).toBe('blocked');
  });
});

describe('computeStack: cycle detection', () => {
  it('detects a two-row cycle', () => {
    const results = compute([
      { id: 1, source: '$2' },
      { id: 2, source: '$1' },
    ]);
    expect(errKind(results, 1)).toBe('cycle');
    expect(errKind(results, 2)).toBe('cycle');
  });

  it('detects a self-reference', () => {
    expect(errKind(compute([{ id: 1, source: '$1 + 1' }]), 1)).toBe('cycle');
  });

  it('blocks rows downstream of a cycle without mislabelling them', () => {
    const results = compute([
      { id: 1, source: '$2' },
      { id: 2, source: '$1' },
      { id: 3, source: '$1 + 1' },
    ]);
    expect(errKind(results, 1)).toBe('cycle');
    expect(errKind(results, 2)).toBe('cycle');
    expect(errKind(results, 3)).toBe('blocked');
  });

  it('leaves independent rows working alongside a cycle', () => {
    const results = compute([
      { id: 1, source: '$2' },
      { id: 2, source: '$1' },
      { id: 3, source: '6 * 7' },
    ]);
    expect(val(results, 3)).toBe('42');
  });
});
