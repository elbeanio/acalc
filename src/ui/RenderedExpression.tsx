import { useMemo } from 'react';
import katex from 'katex';
import { sourceToLatex } from '../lang/index.ts';

interface RenderedExpressionProps {
  source: string;
  onActivate: () => void;
  ariaLabel?: string;
}

/**
 * The read-only, typeset view of a row shown when it isn't being edited.
 * Clicking it switches the row into edit mode. Empty or unparseable rows fall
 * back to a placeholder / the raw text.
 */
export function RenderedExpression({
  source,
  onActivate,
  ariaLabel,
}: RenderedExpressionProps) {
  const trimmed = source.trim();

  const html = useMemo(() => {
    if (trimmed === '') return null;
    const latex = sourceToLatex(source);
    if (latex === null) return null;
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
    });
  }, [source, trimmed]);

  const common = {
    role: 'button' as const,
    tabIndex: -1,
    title: 'Click to edit',
    onClick: onActivate,
    'aria-label': ariaLabel,
  };

  if (trimmed === '') {
    return (
      <div {...common} className="row-rendered row-rendered--empty">
        empty
      </div>
    );
  }
  if (html === null) {
    // Unparseable — show the raw source so the user sees what they typed.
    return (
      <div {...common} className="row-rendered row-rendered--raw">
        {source}
      </div>
    );
  }
  return (
    <div
      {...common}
      className="row-rendered"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
