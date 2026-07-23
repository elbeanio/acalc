import type { RowResult } from '../engine/index.ts';
import { termsText, type Quantity, type UnitTerm } from '../units/index.ts';

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

/**
 * Clipboard text for a result: the displayed value (12 SF, same as on screen)
 * plus an ASCII-safe unit label. Non-ASCII glyphs (°C, °F, °, ·) are
 * transliterated to plain ASCII so a pasted value doesn't carry a stray degree
 * sign into Excel, email, etc.; the ASCII forms (`C`, `F`, `deg`) still
 * round-trip back into acalc as input. Full internal precision is deliberately
 * not copied — it only feeds internal references, and emitting all 40 digits
 * would leak rounding-noise tails (e.g. 68°F → 68.000…03) onto the clipboard.
 */
export function copyText(quantity: Quantity): string {
  const { value, terms } = quantity.render();
  const label = termsText(terms)
    .replace(/°C/g, 'C')
    .replace(/°F/g, 'F')
    .replace(/°/g, 'deg')
    .replace(/·/g, '*');
  return `${value.toDisplay()}${label}`;
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
