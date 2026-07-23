import { useEffect, useState } from 'react';
import type { Row, RowResult } from '../engine/index.ts';
import { formatSource } from '../lang/index.ts';
import { StateError } from '../state/index.ts';
import {
  ExpressionEditor,
  type EditorHandle,
  type ReferenceOption,
} from './editor/ExpressionEditor.tsx';
import { copyText, formatResult } from './format.ts';
import { RenderedExpression } from './RenderedExpression.tsx';
import { ResultView } from './ResultView.tsx';
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
  const [copied, setCopied] = useState(false);

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

  // On blur, canonically reformat the row (folded into the preceding edit).
  const handleEditorBlur = () => {
    const formatted = formatSource(row.source);
    if (formatted !== null && formatted !== row.source) {
      store.replaceRowSource(stackId, row.id, formatted);
    }
    onBlur();
  };

  const fmt = formatResult(result);
  const copyValue = result?.status === 'ok' ? copyText(result.value) : null;

  const handleCopy = async () => {
    if (copyValue === null) return;
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — nothing to do.
    }
  };

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
          onBlur={handleEditorBlur}
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
      <span className="row-eq" aria-hidden="true">
        {fmt.kind === 'empty' ? '' : '='}
      </span>
      <ResultView result={result} />
      <div className="row-actions">
        {copyValue !== null && (
          <button
            className="row-copy"
            onClick={handleCopy}
            title="Copy value"
            aria-label={`Copy value of row ${row.id}`}
          >
            {copied ? (
              '✓'
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
            )}
          </button>
        )}
        <button
          className="row-delete"
          aria-label={`Delete row ${row.id}`}
          title="Delete row"
          onClick={() => store.deleteRow(stackId, row.id)}
        >
          ×
        </button>
      </div>
    </div>
  );
}
