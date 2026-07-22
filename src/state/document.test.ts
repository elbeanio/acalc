import { describe, it, expect } from 'vitest';
import * as ops from './document.ts';
import { StateError, type Document } from './types.ts';

const S = 'stack-1';
const base = () => ops.createDocument(S);
const rows = (doc: Document) => ops.findStack(doc, S).rows;

describe('document: creation', () => {
  it('creates one stack with a single empty row', () => {
    const doc = base();
    const stack = ops.findStack(doc, S);
    expect(stack.name).toBe('Untitled');
    expect(stack.rows).toEqual([{ id: 1, source: '' }]);
    expect(stack.nextRowId).toBe(2);
  });
});

describe('document: rows', () => {
  it('assigns monotonic ids that are never reused', () => {
    let doc = base();
    doc = ops.addRow(doc, S, '1 + 1'); // id 2
    doc = ops.deleteRow(doc, S, 2);
    doc = ops.addRow(doc, S, '2 + 2'); // id 3, not 2
    expect(rows(doc).map((r) => r.id)).toEqual([1, 3]);
    expect(ops.findStack(doc, S).nextRowId).toBe(4);
  });

  it('updates a row source immutably', () => {
    const doc = base();
    const next = ops.updateRowSource(doc, S, 1, '6 * 7');
    expect(rows(next)[0]?.source).toBe('6 * 7');
    expect(rows(doc)[0]?.source).toBe(''); // original untouched
  });

  it('names rows, validating and enforcing uniqueness', () => {
    let doc = ops.addRow(base(), S, '2'); // id 2
    doc = ops.renameRow(doc, S, 1, 'total');
    expect(rows(doc)[0]?.name).toBe('total');

    expect(() => ops.renameRow(doc, S, 2, 'total')).toThrow(StateError);
    expect(() => ops.renameRow(doc, S, 2, '2bad')).toThrow(StateError);

    const cleared = ops.renameRow(doc, S, 1, undefined);
    expect(rows(cleared)[0]?.name).toBeUndefined();
  });

  it('moves rows within a stack', () => {
    let doc = ops.addRow(ops.addRow(base(), S, 'a'), S, 'b'); // ids 1,2,3
    doc = ops.moveRow(doc, S, 3, 0);
    expect(rows(doc).map((r) => r.id)).toEqual([3, 1, 2]);
  });
});

describe('document: stacks', () => {
  it('adds, renames and deletes stacks', () => {
    let doc = ops.addStack(base(), 'stack-2', 'Budget');
    expect(doc.stacks.map((s) => s.name)).toEqual(['Untitled', 'Budget']);

    doc = ops.renameStack(doc, 'stack-2', 'Renamed');
    expect(doc.stacks[1]?.name).toBe('Renamed');

    doc = ops.deleteStack(doc, S);
    expect(doc.stacks.map((s) => s.id)).toEqual(['stack-2']);
  });

  it('throws for an unknown stack', () => {
    expect(() => ops.findStack(base(), 'nope')).toThrow(StateError);
  });
});
