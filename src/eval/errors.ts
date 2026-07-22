/** Error raised while evaluating an AST. */
export class EvalError extends Error {
  /**
   * Category of failure. `'ref'` marks a dangling reference (rendered as
   * `#ref!` in the UI); other failures are ordinary evaluation errors.
   */
  readonly kind: 'ref' | 'error';

  constructor(message: string, kind: 'ref' | 'error' = 'error') {
    super(message);
    this.name = 'EvalError';
    this.kind = kind;
  }
}
