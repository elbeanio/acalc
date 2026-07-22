import { useEffect, useMemo, useRef, useState } from 'react';
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

  const containerRef = useRef<HTMLDivElement>(null);
  const handles = useRef(new Map<number, EditorHandle>());

  // Exactly one row shows the CM6 editor at a time; the rest are typeset.
  const [editingRowId, setEditingRowId] = useState<number | null>(
    () => stack.rows[0]?.id ?? null,
  );

  /** Re-focus an already-mounted editor (used after a reorder). */
  const focusRowSoon = (id: number) => {
    requestAnimationFrame(() => handles.current.get(id)?.focus());
  };

  /**
   * Put a row into edit mode. The editor autofocuses itself on mount, so
   * flushSync here makes that focus land synchronously — safe before typing.
   */
  const activate = (id: number) => {
    // flushSync + the editor's mount-autofocus focus the new row synchronously,
    // so by the time the old editor's blur handler runs, focus is already
    // inside the stack and the containment check keeps it in edit mode.
    flushSync(() => setEditingRowId(id));
  };

  // On an actual tab switch, revert to the typeset view. A ref (rather than a
  // mount flag) keeps StrictMode's double-invoke from triggering a false reset.
  const prevStackId = useRef(stack.id);
  useEffect(() => {
    if (prevStackId.current !== stack.id) {
      prevStackId.current = stack.id;
      setEditingRowId(null);
    }
  }, [stack.id]);

  // After undo/redo, edit + focus the changed row so typing continues there.
  useEffect(() => {
    if (focusRequest) activate(focusRequest.rowId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.token]);

  // When an editor loses focus to outside the stack, revert the row to typeset —
  // unless a programmatic focus move is in flight.
  const handleEditorBlur = () => {
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setEditingRowId(null);
      }
    }, 0);
  };

  const addBelow = (index: number) => {
    const newId = stack.nextRowId; // insertRowAt will assign this id
    flushSync(() => {
      store.insertRowAt(stack.id, index + 1);
      setEditingRowId(newId); // its editor autofocuses on mount
    });
  };

  /** Reference options for a row's `$` autocomplete: every other row's value. */
  const completionsFor = (selfId: number) => (): ReferenceOption[] =>
    stack.rows
      .filter((r) => r.id !== selfId)
      .map((r) => {
        const res = results.get(r.id);
        const detail =
          res?.status === 'ok' ? `= ${res.value.toDisplay()}` : undefined;
        const ref = r.name ? `$${r.name}` : `$${r.id}`;
        return detail === undefined ? { ref } : { ref, detail };
      });

  return (
    <div className="stack" ref={containerRef}>
      {stack.rows.length === 0 ? (
        <p className="stack-empty">No rows yet.</p>
      ) : (
        stack.rows.map((row, index) => (
          <RowItem
            key={row.id}
            stackId={stack.id}
            row={row}
            result={results.get(row.id)}
            editing={row.id === editingRowId}
            onActivate={() => activate(row.id)}
            onBlur={handleEditorBlur}
            registerHandle={(handle) => {
              if (handle) handles.current.set(row.id, handle);
              else handles.current.delete(row.id);
            }}
            onEnter={() => addBelow(index)}
            onArrowUp={() => {
              const prev = stack.rows[index - 1];
              if (!prev) return false;
              activate(prev.id);
              return true;
            }}
            onArrowDown={() => {
              const next = stack.rows[index + 1];
              if (!next) return false;
              activate(next.id);
              return true;
            }}
            onMoveUp={() => {
              if (index === 0) return false;
              store.moveRow(stack.id, row.id, index - 1);
              focusRowSoon(row.id);
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
              if (neighbour) activate(neighbour.id);
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
