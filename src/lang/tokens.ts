export type TokenType =
  | 'number'
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
