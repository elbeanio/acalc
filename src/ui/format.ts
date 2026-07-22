import type { RowResult } from '../engine/index.ts';

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
