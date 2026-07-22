import {
  Decimal,
  DISPLAY_SIGNIFICANT_DIGITS,
} from './config.ts';

/**
 * Arbitrary-precision decimal number — the calculator's only number type.
 *
 * Wraps `decimal.js` so the rest of the app (parser, evaluator, UI) depends on
 * this facade rather than the library directly. Floating-point is deliberately
 * never used. Instances are immutable; every operation returns a new {@link Num}.
 *
 * Non-finite results (division by zero, `0 % 0`, etc.) are represented faithfully
 * as they come out of the arithmetic (Infinity / NaN) rather than throwing —
 * callers check {@link Num.isFinite} and raise language-level errors as needed.
 */
export class Num {
  private constructor(private readonly d: Decimal) {}

  /** Construct from a decimal string, JS number, or another Num. */
  static of(value: string | number | Num): Num {
    if (value instanceof Num) return value;
    return new Num(new Decimal(value));
  }

  // --- constants -----------------------------------------------------------

  static readonly ZERO = new Num(new Decimal(0));
  static readonly ONE = new Num(new Decimal(1));

  /** π to the configured internal precision. */
  static pi(): Num {
    return new Num(Decimal.acos(-1));
  }

  /** Euler's number e to the configured internal precision. */
  static e(): Num {
    return new Num(new Decimal(1).exp());
  }

  // --- arithmetic ----------------------------------------------------------

  add(other: Num): Num {
    return new Num(this.d.plus(other.d));
  }

  sub(other: Num): Num {
    return new Num(this.d.minus(other.d));
  }

  mul(other: Num): Num {
    return new Num(this.d.times(other.d));
  }

  div(other: Num): Num {
    return new Num(this.d.dividedBy(other.d));
  }

  /** Modulo (remainder). Follows `decimal.js`: result takes the sign of `this`. */
  mod(other: Num): Num {
    return new Num(this.d.modulo(other.d));
  }

  pow(exponent: Num): Num {
    return new Num(this.d.pow(exponent.d));
  }

  neg(): Num {
    return new Num(this.d.negated());
  }

  abs(): Num {
    return new Num(this.d.absoluteValue());
  }

  // --- transcendental & roots ---------------------------------------------

  sqrt(): Num {
    return new Num(this.d.squareRoot());
  }

  exp(): Num {
    return new Num(this.d.naturalExponential());
  }

  /** Natural logarithm (base e). */
  ln(): Num {
    return new Num(this.d.naturalLogarithm());
  }

  /** Logarithm to an arbitrary base (defaults to base 10). */
  log(base: Num | number = 10): Num {
    const b = base instanceof Num ? base.d : new Decimal(base);
    return new Num(this.d.logarithm(b));
  }

  sin(): Num {
    return new Num(this.d.sine());
  }

  cos(): Num {
    return new Num(this.d.cosine());
  }

  tan(): Num {
    return new Num(this.d.tangent());
  }

  /** Round to `decimalPlaces` decimal places (default 0). */
  round(decimalPlaces = 0): Num {
    return new Num(this.d.toDecimalPlaces(decimalPlaces));
  }

  floor(): Num {
    return new Num(this.d.floor());
  }

  ceil(): Num {
    return new Num(this.d.ceil());
  }

  /**
   * Convert to a JS number. Lossy — use only for small integer quantities like
   * argument counts or rounding precision, never for values shown to the user.
   */
  toNumber(): number {
    return this.d.toNumber();
  }

  // --- comparison ----------------------------------------------------------

  /** -1 if `this < other`, 0 if equal, 1 if `this > other`. */
  cmp(other: Num): -1 | 0 | 1 {
    return this.d.comparedTo(other.d) as -1 | 0 | 1;
  }

  eq(other: Num): boolean {
    return this.d.equals(other.d);
  }

  lt(other: Num): boolean {
    return this.d.lessThan(other.d);
  }

  gt(other: Num): boolean {
    return this.d.greaterThan(other.d);
  }

  isZero(): boolean {
    return this.d.isZero();
  }

  isNegative(): boolean {
    return this.d.isNegative();
  }

  isFinite(): boolean {
    return this.d.isFinite();
  }

  isNaN(): boolean {
    return this.d.isNaN();
  }

  isInteger(): boolean {
    return this.d.isInteger();
  }

  static min(...values: Num[]): Num {
    return new Num(Decimal.min(...values.map((v) => v.d)));
  }

  static max(...values: Num[]): Num {
    return new Num(Decimal.max(...values.map((v) => v.d)));
  }

  // --- display -------------------------------------------------------------

  /** Full-precision string — used for storage and for downstream references. */
  toString(): string {
    return this.d.toString();
  }

  /**
   * Human-facing string rounded to `significantDigits` (default 12). Trailing
   * zeros are trimmed. The full-precision value is preserved elsewhere.
   */
  toDisplay(significantDigits: number = DISPLAY_SIGNIFICANT_DIGITS): string {
    return this.d.toSignificantDigits(significantDigits).toString();
  }
}
