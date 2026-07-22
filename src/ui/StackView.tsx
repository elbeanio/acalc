import { useMemo, useRef } from 'react';
import { computeStack } from '../engine/index.ts';
import type { Stack } from '../state/index.ts';
import type {
  EditorHandle,
  ReferenceOption,
} from './editor/ExpressionEditor.tsx';
import { RowItem } from './RowItem.tsx';
import { useStore } from './useStore.ts';

export function StackView({ stack }: { stack: Stack }) {
  const store = useStore();
  const results = useMemo(() => computeStack(stack.rows), [stack.rows]);

  const handles = useRef(new Map<number, EditorHandle>());

  /** Focus a row that is already mounted. */
  const focusRow = (id: number): boolean => {
    const handle = handles.current.get(id);
    if (!handle) return false;
    handle.focus();
    return true;
  };

  /**
   * Focus a row on the next frame — after React (and StrictMode's mount/remount)
   * has committed, so a just-added row's editor handle is registered.
   */
  const focusRowSoon = (id: number) => {
    requestAnimationFrame(() => handles.current.get(id)?.focus());
  };

  const addBelow = (index: number) => {
    const newId = stack.nextRowId; // insertRowAt will assign this id
    store.insertRowAt(stack.id, index + 1);
    focusRowSoon(newId);
  };

  /** Reference options for a row's `$` autocomplete: every other row's value. */
  const completionsFor = (selfId: number) => (): ReferenceOption[] =>
    stack.rows
      .filter((r) => r.id !== selfId)
      .map((r) => {
        const result = results.get(r.id);
        const detail =
          result?.status === 'ok' ? `= ${result.value.toDisplay()}` : undefined;
        const ref = r.name ? `$${r.name}` : `$${r.id}`;
        return detail === undefined ? { ref } : { ref, detail };
      });

  return (
    <div className="stack">
      {stack.rows.length === 0 ? (
        <p className="stack-empty">No rows yet.</p>
      ) : (
        stack.rows.map((row, index) => (
          <RowItem
            key={row.id}
            stackId={stack.id}
            row={row}
            result={results.get(row.id)}
            registerHandle={(handle) => {
              if (handle) handles.current.set(row.id, handle);
              else handles.current.delete(row.id);
            }}
            onEnter={() => addBelow(index)}
            onArrowUp={() => {
              const prev = stack.rows[index - 1];
              return prev ? focusRow(prev.id) : false;
            }}
            onArrowDown={() => {
              const next = stack.rows[index + 1];
              return next ? focusRow(next.id) : false;
            }}
            onBackspaceEmpty={() => {
              if (stack.rows.length <= 1) return false;
              const neighbour = stack.rows[index - 1] ?? stack.rows[index + 1];
              store.deleteRow(stack.id, row.id);
              if (neighbour) focusRowSoon(neighbour.id);
              return true;
            }}
            getCompletions={completionsFor(row.id)}
          />
        ))
      )}
      <button className="row-add" onClick={() => addBelow(stack.rows.length - 1)}>
        + Add row
      </button>
    </div>
  );
}
