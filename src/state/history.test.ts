import { describe, it, expect } from 'vitest';
import {
  canRedo,
  canUndo,
  initHistory,
  pushHistory,
  redo,
  undo,
} from './history.ts';

describe('history', () => {
  it('undoes and redoes', () => {
    let h = initHistory('a');
    h = pushHistory(h, 'b');
    h = pushHistory(h, 'c');
    expect(h.present).toBe('c');
    expect(canUndo(h)).toBe(true);

    h = undo(h);
    expect(h.present).toBe('b');
    h = undo(h);
    expect(h.present).toBe('a');
    expect(canUndo(h)).toBe(false);

    h = redo(h);
    expect(h.present).toBe('b');
    expect(canRedo(h)).toBe(true);
  });

  it('is a no-op when the value is unchanged', () => {
    const h = initHistory('a');
    expect(pushHistory(h, 'a')).toBe(h);
  });

  it('clears the redo stack on a new change', () => {
    let h = initHistory('a');
    h = pushHistory(h, 'b');
    h = undo(h); // present 'a', future ['b']
    h = pushHistory(h, 'c'); // new branch
    expect(h.present).toBe('c');
    expect(canRedo(h)).toBe(false);
  });

  it('undo/redo at the boundaries are safe', () => {
    const h = initHistory('a');
    expect(undo(h)).toBe(h);
    expect(redo(h)).toBe(h);
  });
});
