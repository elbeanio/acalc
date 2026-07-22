import {
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { Row, RowResult } from '../engine/index.ts';
import { StateError } from '../state/index.ts';
import { formatResult } from './format.ts';
import { useStore } from './useStore.ts';

interface RowItemProps {
  stackId: string;
  row: Row;
  result: RowResult | undefined;
  inputRef: (el: HTMLInputElement | null) => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLInputElement>) => void;
}

export function RowItem({
  stackId,
  row,
  result,
  inputRef,
  onKeyDown,
}: RowItemProps) {
  const store = useStore();
  const [nameDraft, setNameDraft] = useState(row.name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    setNameDraft(row.name ?? '');
    setNameError(null);
  }, [row.name]);

  const commitName = () => {
    const trimmed = nameDraft.trim();
    try {
      store.renameRow(stackId, row.id, trimmed === '' ? undefined : trimmed);
      setNameError(null);
    } catch (err) {
      if (err instanceof StateError) setNameError(err.message);
      else throw err;
    }
  };

  const fmt = formatResult(result);

  return (
    <div className="row">
      <input
        className="row-name"
        value={nameDraft}
        placeholder={`$${row.id}`}
        aria-label={`Name for row ${row.id}`}
        aria-invalid={nameError !== null}
        title={nameError ?? `Reference as $${row.name ?? row.id}`}
        onChange={(e) => setNameDraft(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitName();
            e.currentTarget.blur();
          }
        }}
      />
      <input
        ref={inputRef}
        className="row-source"
        value={row.source}
        placeholder="expression…"
        aria-label={`Expression for row ${row.id}`}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => store.updateRowSource(stackId, row.id, e.target.value)}
        onKeyDown={onKeyDown}
      />
      <output className={`row-result row-result--${fmt.kind}`} title={fmt.title}>
        {fmt.text}
      </output>
      <button
        className="row-delete"
        aria-label={`Delete row ${row.id}`}
        title="Delete row"
        onClick={() => store.deleteRow(stackId, row.id)}
      >
        ×
      </button>
    </div>
  );
}
