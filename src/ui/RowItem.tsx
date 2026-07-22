import { useEffect, useState } from 'react';
import type { Row, RowResult } from '../engine/index.ts';
import { StateError } from '../state/index.ts';
import {
  ExpressionEditor,
  type EditorHandle,
  type ReferenceOption,
} from './editor/ExpressionEditor.tsx';
import { formatResult } from './format.ts';
import { RenderedExpression } from './RenderedExpression.tsx';
import { useStore } from './useStore.ts';

interface RowItemProps {
  stackId: string;
  row: Row;
  result: RowResult | undefined;
  /** True when this row shows the editor; false shows the typeset view. */
  editing: boolean;
  onActivate: () => void;
  onBlur: () => void;
  registerHandle: (handle: EditorHandle | null) => void;
  onEnter: () => void;
  onArrowUp: () => boolean;
  onArrowDown: () => boolean;
  onMoveUp: () => boolean;
  onMoveDown: () => boolean;
  onDeleteRow: () => boolean;
  getCompletions: () => ReferenceOption[];
}

export function RowItem({
  stackId,
  row,
  result,
  editing,
  onActivate,
  onBlur,
  registerHandle,
  onEnter,
  onArrowUp,
  onArrowDown,
  onMoveUp,
  onMoveDown,
  onDeleteRow,
  getCompletions,
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
      {editing ? (
        <ExpressionEditor
          value={row.source}
          autoFocus
          ariaLabel={`Expression for row ${row.id}`}
          onChange={(source) => store.updateRowSource(stackId, row.id, source)}
          onEnter={onEnter}
          onArrowUp={onArrowUp}
          onArrowDown={onArrowDown}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDeleteRow={onDeleteRow}
          onBlur={onBlur}
          getCompletions={getCompletions}
          registerHandle={registerHandle}
        />
      ) : (
        <RenderedExpression
          source={row.source}
          onActivate={onActivate}
          ariaLabel={`Expression for row ${row.id}, click to edit`}
        />
      )}
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
