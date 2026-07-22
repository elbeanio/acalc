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
    return {
      kind: 'error',
      text: result.error.kind === 'ref' ? '#ref!' : result.error.message,
      title: result.error.message,
    };
  }
  return {
    kind: 'value',
    text: result.value.toDisplay(),
    title: result.value.toString(),
  };
}
