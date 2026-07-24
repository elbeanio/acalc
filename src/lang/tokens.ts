export type TokenType =
  | 'number'
  | 'date' // an ISO date literal, e.g. 2026-12-25
  | 'time' // a clock time literal, e.g. 9:30 or 14:00:05
  | 'ref'
  | 'ident'
  | 'plus'
  | 'minus'
  | 'star'
  | 'slash'
  | 'percent'
  | 'bang'
  | 'caret'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'dotdot' // `..` range operator, e.g. $1..$5
  | 'eof';

export interface Token {
  readonly type: TokenType;
  /**
   * For `number`: the raw literal text. For `ident`: the name. For `ref`: the
   * reference body (the part after `$`). Otherwise the operator text.
   */
  readonly value: string;
  /** Zero-based start index in the source string. */
  readonly start: number;
}
