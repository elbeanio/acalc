/** Error raised while tokenising or parsing an expression. */
export class ParseError extends Error {
  /** Zero-based index into the source string where the problem starts. */
  readonly position: number;

  constructor(message: string, position: number) {
    super(message);
    this.name = 'ParseError';
    this.position = position;
  }
}
