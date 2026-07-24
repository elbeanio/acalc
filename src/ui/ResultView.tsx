import { useEffect, useMemo, useState } from 'react';
import type { RowResult } from '../engine/index.ts';
import { formatResult, quantityToLatex } from './format.ts';
import { ensureKatex, getKatexRender } from './katex-loader.ts';

/**
 * The result cell. Renders a value with KaTeX (proper superscripts for units
 * like m², typeset numbers), falling back to plain text for errors, empty rows,
 * or until KaTeX loads. The plain value is always on `data-value` (and the
 * aria-label) so it stays accessible and testable independent of the KaTeX DOM.
 */
export function ResultView({ result }: { result: RowResult | undefined }) {
  const fmt = formatResult(result);
  const [ready, setReady] = useState(getKatexRender() !== null);

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

  const html = useMemo(() => {
    const render = getKatexRender();
    if (!ready || !render || fmt.kind !== 'value' || result?.status !== 'ok') {
      return null;
    }
    return render(`\\displaystyle ${quantityToLatex(result.value)}`, {
      throwOnError: false,
      displayMode: false,
      output: 'html', // HTML only — no duplicate MathML text in the DOM
    });
  }, [ready, result, fmt.kind]);

  const attrs = {
    className: `row-result row-result--${fmt.kind}`,
    title: fmt.title,
    'data-value': fmt.text,
    'aria-label': fmt.text,
  };

  if (html !== null) {
    return <output {...attrs} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <output {...attrs}>{fmt.text}</output>;
}
