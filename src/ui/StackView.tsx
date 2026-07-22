import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { computeStack } from '../engine/index.ts';
import type { Stack } from '../state/index.ts';
import { RowItem } from './RowItem.tsx';
import { useStore } from './useStore.ts';

export function StackView({ stack }: { stack: Stack }) {
  const store = useStore();
  const results = useMemo(() => computeStack(stack.rows), [stack.rows]);

  const inputRefs = useRef(new Map<number, HTMLInputElement>());
  const [focusId, setFocusId] = useState<number | null>(null);

  // After a row is added/deleted, move focus to the requested row.
  useEffect(() => {
    if (focusId === null) return;
    inputRefs.current.get(focusId)?.focus();
    setFocusId(null);
  }, [focusId, stack.rows]);

  const addBelow = (index: number) => {
    const newId = stack.nextRowId; // insertRowAt will assign this id
    store.insertRowAt(stack.id, index + 1);
    setFocusId(newId);
  };

  const handleKeyDown =
    (index: number, rowId: number) =>
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          addBelow(index);
          break;
        case 'Backspace':
          if (e.currentTarget.value === '' && stack.rows.length > 1) {
            e.preventDefault();
            const prev = stack.rows[index - 1] ?? stack.rows[index + 1];
            store.deleteRow(stack.id, rowId);
            if (prev) setFocusId(prev.id);
          }
          break;
        case 'ArrowDown': {
          const next = stack.rows[index + 1];
          if (next) {
            e.preventDefault();
            inputRefs.current.get(next.id)?.focus();
          }
          break;
        }
        case 'ArrowUp': {
          const prev = stack.rows[index - 1];
          if (prev) {
            e.preventDefault();
            inputRefs.current.get(prev.id)?.focus();
          }
          break;
        }
      }
    };

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
            inputRef={(el) => {
              if (el) inputRefs.current.set(row.id, el);
              else inputRefs.current.delete(row.id);
            }}
            onKeyDown={handleKeyDown(index, row.id)}
          />
        ))
      )}
      <button className="row-add" onClick={() => addBelow(stack.rows.length - 1)}>
        + Add row
      </button>
    </div>
  );
}
