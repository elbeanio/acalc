import { useEffect, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { computeStack } from '../engine/index.ts';
import type { FocusRequest, Stack } from '../state/index.ts';
import type {
  EditorHandle,
  ReferenceOption,
} from './editor/ExpressionEditor.tsx';
import { RowItem } from './RowItem.tsx';
import { useStore } from './useStore.ts';

interface StackViewProps {
  stack: Stack;
  focusRequest: FocusRequest | null;
}

export function StackView({ stack, focusRequest }: StackViewProps) {
  const store = useStore();
  const results = useMemo(() => computeStack(stack.rows), [stack.rows]);

  const handles = useRef(new Map<number, EditorHandle>());

  /** Focus an already-mounted row, optionally putting the cursor at the end. */
  const focusRow = (id: number, cursorToEnd = false): boolean => {
    const handle = handles.current.get(id);
    if (!handle) return false;
    handle.focus(cursorToEnd);
    return true;
  };

  /**
   * Focus a row on the next frame — after React (and StrictMode's mount/remount)
   * has committed, so a just-added/re-added row's editor handle is registered.
   */
  const focusRowSoon = (id: number, cursorToEnd = false) => {
    requestAnimationFrame(() => handles.current.get(id)?.focus(cursorToEnd));
  };

  // After undo/redo, move focus to the changed row so typing continues there.
  useEffect(() => {
    if (focusRequest) focusRowSoon(focusRequest.rowId, true);
    // Keyed on the request token so it fires once per undo/redo, not per edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.token]);

  // Focus the first row when the app opens, so it's ready for the keyboard.
  useEffect(() => {
    const first = stack.rows[0];
    if (first) focusRowSoon(first.id, true);
    // Once, on initial mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addBelow = (index: number) => {
    const newId = stack.nextRowId; // insertRowAt will assign this id
    // flushSync so the new row is mounted and its editor handle registered
    // before we focus — synchronous, so fast typing after Enter can't race it.
    flushSync(() => store.insertRowAt(stack.id, index + 1));
    focusRow(newId);
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
              return prev ? focusRow(prev.id, true) : false;
            }}
            onArrowDown={() => {
              const next = stack.rows[index + 1];
              return next ? focusRow(next.id, true) : false;
            }}
            onMoveUp={() => {
              if (index === 0) return false;
              store.moveRow(stack.id, row.id, index - 1);
              focusRowSoon(row.id); // keep focus on the moved row
              return true;
            }}
            onMoveDown={() => {
              if (index === stack.rows.length - 1) return false;
              store.moveRow(stack.id, row.id, index + 1);
              focusRowSoon(row.id);
              return true;
            }}
            onDeleteRow={() => {
              const neighbour = stack.rows[index + 1] ?? stack.rows[index - 1];
              store.deleteRow(stack.id, row.id);
              if (neighbour) focusRowSoon(neighbour.id, true);
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
