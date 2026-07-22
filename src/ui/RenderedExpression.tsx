import { useEffect, useMemo, useState } from 'react';
import { sourceToLatex } from '../lang/index.ts';

type KatexRender = (tex: string, options: object) => string;

// KaTeX (and its fonts/CSS) are loaded on demand, the first time any row is
// typeset, then cached module-wide so later rows render without a round trip.
let katexRender: KatexRender | null = null;
let loading: Promise<void> | null = null;

function ensureKatex(): Promise<void> {
  if (katexRender) return Promise.resolve();
  if (!loading) {
    loading = Promise.all([
      import('katex'),
      import('katex/dist/katex.min.css'),
    ]).then(([mod]) => {
      katexRender = mod.default.renderToString;
    });
  }
  return loading;
}

interface RenderedExpressionProps {
  source: string;
  onActivate: () => void;
  ariaLabel?: string;
}

/**
 * The read-only, typeset view of a row shown when it isn't being edited.
 * Clicking it switches the row into edit mode. Until KaTeX has loaded (first
 * typeset only), or for unparseable/empty rows, it falls back to plain text.
 */
export function RenderedExpression({
  source,
  onActivate,
  ariaLabel,
}: RenderedExpressionProps) {
  const [ready, setReady] = useState(katexRender !== null);

  useEffect(() => {
    if (ready) return;
    let alive = true;
    void ensureKatex().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [ready]);

  const trimmed = source.trim();
  const html = useMemo(() => {
    if (!ready || !katexRender || trimmed === '') return null;
    const latex = sourceToLatex(source);
    if (latex === null) return null;
    return katexRender(latex, {
      throwOnError: false,
      displayMode: false,
      // We generate the LaTeX ourselves; only allow our reference-chip command.
      trust: (ctx: { command: string }) => ctx.command === '\\htmlClass',
    });
  }, [ready, source, trimmed]);

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
    // Loading KaTeX, or an unparseable expression — show the raw source. The
    // error styling only applies once KaTeX is ready and it still won't parse.
    return (
      <div
        {...common}
        className={`row-rendered${ready ? ' row-rendered--raw' : ''}`}
      >
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
