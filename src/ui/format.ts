import type { RowResult } from '../engine/index.ts';
import type { Quantity, UnitTerm } from '../units/index.ts';

export interface FormattedResult {
  readonly text: string;
  readonly kind: 'value' | 'empty' | 'error';
  /** Tooltip: full-precision value, or the error message. */
  readonly title?: string;
}

/** Turn a computed row result into display text, a kind, and a tooltip. */
export function formatResult(result: RowResult | undefined): FormattedResult {
  if (!result || result.status === 'empty') {
    return { kind: 'empty', text: '' };
  }
  if (result.status === 'error') {
    const { error } = result;
    const text =
      error.kind === 'ref'
        ? `#ref!(${error.refs?.join(', ') ?? ''})`
        : error.message;
    return { kind: 'error', text, title: error.message };
  }
  return {
    kind: 'value',
    text: result.value.toDisplay(),
    title: result.value.toString(),
  };
}

/** LaTeX for a result value: the number plus its unit (superscripts, °, etc.). */
export function quantityToLatex(quantity: Quantity): string {
  const { value, terms } = quantity.render();
  const number = numberToLatex(value.toDisplay());
  const unit = termsToLatex(terms);
  return unit ? `${number}${unit}` : number; // tight, like the plain display
}

function numberToLatex(s: string): string {
  const m = /^(-?[\d.]+)[eE]([+-]?\d+)$/.exec(s);
  return m ? `${m[1]}\\times10^{${Number(m[2])}}` : s;
}

function termsToLatex(terms: UnitTerm[]): string {
  const num = terms.filter((t) => t.exp > 0).map(termLatex).join('\\,');
  const den = terms.filter((t) => t.exp < 0).map(termLatex).join('\\,');
  if (den === '') return num;
  return `${num || '1'}/${den}`;
}

function termLatex(term: UnitTerm): string {
  const symbol = term.symbol.startsWith('°')
    ? term.symbol.length > 1
      ? `{}^{\\circ}\\mathrm{${term.symbol.slice(1)}}`
      : '{}^{\\circ}'
    : `\\mathrm{${term.symbol}}`;
  const exp = Math.abs(term.exp);
  return exp === 1 ? symbol : `${symbol}^{${exp}}`;
}
