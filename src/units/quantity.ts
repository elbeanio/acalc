import { Num } from '../num/index.ts';
import {
  DIMENSIONLESS,
  dimDiv,
  dimEqual,
  dimMul,
  dimPow,
  dimToBaseLabel,
  dimToTerms,
  isDimensionless,
  isSensibleDimension,
  type Dimension,
} from './dimensions.ts';

/** One unit in a display label, e.g. `{ symbol: 'm', exp: 2 }` → m². */
export interface UnitTerm {
  readonly symbol: string;
  readonly exp: number;
}

/** A non-decimal display base for an integer value (`to hex` / `bin` / `oct`). */
export type DisplayRadix = 'hex' | 'bin' | 'oct';

/** How to render a quantity: `shown = (base - offset) / factor`, plus units. */
export interface DisplayUnit {
  readonly terms: UnitTerm[];
  readonly factor: Num;
  readonly offset: Num;
}

/** A resolved unit atom (from the units table), e.g. km, °C, mph. */
export interface ResolvedUnit {
  readonly dimension: Dimension;
  readonly factor: Num;
  readonly offset: Num;
  readonly symbol: string;
}

/**
 * A number with a physical dimension. The value is stored in base units
 * (m, kg, s, K, byte, £); `display` remembers how to render it.
 */
export class Quantity {
  private constructor(
    readonly base: Num,
    readonly dimension: Dimension,
    readonly display: DisplayUnit | null,
    /** When set, an integer displayed in this base (hex/bin/oct). */
    readonly radix: DisplayRadix | null = null,
  ) {}

  /** Tag this value to display in the given base (null = plain decimal). */
  inRadix(radix: DisplayRadix | null): Quantity {
    return new Quantity(this.base, this.dimension, radix ? null : this.display, radix);
  }

  /** A plain (dimensionless) number. */
  static scalar(value: Num): Quantity {
    return new Quantity(value, DIMENSIONLESS, null);
  }

  /** `value` of a unit, e.g. `fromUnit(5, km)` → 5 km. Applies affine offset. */
  static fromUnit(value: Num, unit: ResolvedUnit): Quantity {
    const base = value.mul(unit.factor).add(unit.offset);
    return new Quantity(base, unit.dimension, {
      terms: [{ symbol: unit.symbol, exp: 1 }],
      factor: unit.factor,
      offset: unit.offset,
    });
  }

  isDimensionless(): boolean {
    return isDimensionless(this.dimension);
  }

  /** The scalar value if dimensionless (angle → radians), else null. */
  asScalar(): Num | null {
    return this.isDimensionless() ? this.base : null;
  }

  add(other: Quantity): Quantity {
    this.requireSameDimension(other, 'add');
    return new Quantity(
      this.base.add(other.base),
      this.dimension,
      this.display ?? other.display,
    );
  }

  sub(other: Quantity): Quantity {
    this.requireSameDimension(other, 'subtract');
    return new Quantity(
      this.base.sub(other.base),
      this.dimension,
      this.display ?? other.display,
    );
  }

  neg(): Quantity {
    return new Quantity(this.base.neg(), this.dimension, this.display);
  }

  abs(): Quantity {
    return new Quantity(this.base.abs(), this.dimension, this.display);
  }

  mul(other: Quantity): Quantity {
    return new Quantity(
      this.base.mul(other.base),
      sensible(dimMul(this.dimension, other.dimension)),
      combineMul(this, other),
    );
  }

  div(other: Quantity): Quantity {
    return new Quantity(
      this.base.div(other.base),
      sensible(dimDiv(this.dimension, other.dimension)),
      combineDiv(this, other),
    );
  }

  pow(exponent: Num): Quantity {
    const base = this.base.pow(exponent);
    if (this.isDimensionless()) return Quantity.scalar(base);
    const dimension = sensible(dimPow(this.dimension, exponent.toNumber()));
    const n = exponent.toNumber();
    const display =
      this.display && exponent.isInteger()
        ? {
            terms: this.display.terms.map((t) => ({ ...t, exp: t.exp * n })),
            factor: this.display.factor.pow(exponent),
            offset: Num.ZERO,
          }
        : null;
    return new Quantity(base, dimension, display);
  }

  /** Adopt `target`'s display unit (for `to` / `in`). Dimensions must match. */
  convertTo(target: Quantity): Quantity {
    if (!this.sameDimension(target)) {
      throw new UnitError(
        `Cannot convert ${dimToBaseLabel(this.dimension)} to ${dimToBaseLabel(target.dimension)} — different kinds of quantity`,
      );
    }
    return new Quantity(this.base, this.dimension, target.display);
  }

  sameDimension(other: Quantity): boolean {
    return dimEqual(this.dimension, other.dimension);
  }

  /** Apply a function to the *displayed* value (e.g. rounding), keeping the unit. */
  mapShown(fn: (n: Num) => Num): Quantity {
    if (this.display) {
      const shown = this.base.sub(this.display.offset).div(this.display.factor);
      const base = fn(shown).mul(this.display.factor).add(this.display.offset);
      return new Quantity(base, this.dimension, this.display);
    }
    return new Quantity(fn(this.base), this.dimension, null);
  }

  /** -1, 0, 1 comparing base values (same dimension assumed). */
  cmp(other: Quantity): -1 | 0 | 1 {
    return this.base.cmp(other.base);
  }

  isFinite(): boolean {
    return this.base.isFinite();
  }

  isNaN(): boolean {
    return this.base.isNaN();
  }

  toDisplay(significantDigits?: number): string {
    if (this.radix) return this.base.toRadix(this.radix);
    return this.format((n) => n.toDisplay(significantDigits));
  }

  toString(): string {
    if (this.radix) return this.base.toRadix(this.radix);
    return this.format((n) => n.toString());
  }

  /** The displayed value and its unit terms — for plain or KaTeX rendering. */
  render(): { value: Num; terms: UnitTerm[] } {
    if (this.display) {
      return {
        value: this.base.sub(this.display.offset).div(this.display.factor),
        terms: this.display.terms,
      };
    }
    if (this.isDimensionless()) return { value: this.base, terms: [] };
    return { value: this.base, terms: dimToTerms(this.dimension) };
  }

  private format(fmt: (n: Num) => string): string {
    const { value, terms } = this.render();
    const label = termsText(terms);
    return label ? `${fmt(value)}${label}` : fmt(value);
  }

  private requireSameDimension(other: Quantity, verb: string): void {
    if (!dimEqual(this.dimension, other.dimension)) {
      throw new UnitError(
        `Cannot ${verb} ${dimToBaseLabel(this.dimension)} and ${dimToBaseLabel(other.dimension)}`,
      );
    }
  }
}

/** Error from an invalid unit operation (mismatched dimensions, etc.). */
export class UnitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnitError';
  }
}

/** Reject nonsense dimensions like byte² or money² (see isSensibleDimension). */
function sensible(d: Dimension): Dimension {
  if (!isSensibleDimension(d)) {
    throw new UnitError(`${dimToBaseLabel(d)} isn't a meaningful quantity`);
  }
  return d;
}

function combineMul(a: Quantity, b: Quantity): DisplayUnit | null {
  if (a.isDimensionless() && !a.display) return b.display;
  if (b.isDimensionless() && !b.display) return a.display;
  if (a.display && b.display) {
    return {
      terms: mergeTerms(a.display.terms, b.display.terms),
      factor: a.display.factor.mul(b.display.factor),
      offset: Num.ZERO,
    };
  }
  return null;
}

function combineDiv(a: Quantity, b: Quantity): DisplayUnit | null {
  if (b.isDimensionless() && !b.display) return a.display;
  if (a.display && b.display) {
    return {
      terms: mergeTerms(a.display.terms, negateTerms(b.display.terms)),
      factor: a.display.factor.div(b.display.factor),
      offset: Num.ZERO,
    };
  }
  return null;
}

/** Combine term lists, summing exponents by symbol (so m·m → m²), dropping 0. */
function mergeTerms(a: UnitTerm[], b: UnitTerm[]): UnitTerm[] {
  const out: { symbol: string; exp: number }[] = [];
  const index = new Map<string, number>();
  for (const term of [...a, ...b]) {
    const at = index.get(term.symbol);
    if (at === undefined) {
      index.set(term.symbol, out.length);
      out.push({ symbol: term.symbol, exp: term.exp });
    } else {
      out[at]!.exp += term.exp;
    }
  }
  return out.filter((t) => t.exp !== 0);
}

function negateTerms(terms: UnitTerm[]): UnitTerm[] {
  return terms.map((t) => ({ symbol: t.symbol, exp: -t.exp }));
}

/** Plain-text unit label from terms, e.g. `m^2`, `km/h`. */
export function termsText(terms: UnitTerm[]): string {
  const fmt = (t: UnitTerm) =>
    Math.abs(t.exp) === 1 ? t.symbol : `${t.symbol}^${Math.abs(t.exp)}`;
  const num = terms.filter((t) => t.exp > 0).map(fmt);
  const den = terms.filter((t) => t.exp < 0).map(fmt);
  const numerator = num.join('·');
  if (den.length === 0) return numerator;
  return `${numerator || '1'}/${den.join('·')}`;
}
