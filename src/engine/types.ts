import type { Num } from '../num/index.ts';

/**
 * A single calculation. `id` is the immutable, monotonic identifier shown as
 * `$id` and never reused or renumbered. `name` is optional and, when set, allows
 * `$name` references. `source` is the raw expression text (the source of truth).
 */
export interface Row {
  readonly id: number;
  readonly name?: string;
  readonly source: string;
}

export type RowErrorKind =
  | 'parse' // malformed expression
  | 'eval' // e.g. division by zero
  | 'ref' // dangling reference (#ref!)
  | 'cycle' // part of a circular reference
  | 'blocked'; // depends (transitively) on an errored row

export interface RowError {
  readonly kind: RowErrorKind;
  readonly message: string;
  /** Source index for parse errors, when known. */
  readonly position?: number;
  /** For dangling `ref` errors: the unresolved references, e.g. `["$2"]`. */
  readonly refs?: readonly string[];
}

/** The computed outcome for a row. */
export type RowResult =
  | { readonly status: 'ok'; readonly value: Num }
  | { readonly status: 'empty' } // blank source
  | { readonly status: 'error'; readonly error: RowError };
