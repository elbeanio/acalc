import { Num } from '../num/index.ts';
import {
  DIMENSIONLESS,
  dimDiv,
  dimEqual,
  dimMul,
  dimPow,
  dimToBaseLabel,
  isDimensionless,
  type Dimension,
} from './dimensions.ts';

/** How to render a quantity: `shown = (base - offset) / factor`, with a label. */
export interface DisplayUnit {
  readonly label: string;
  readonly factor: Num;
  readonly offset: Num;
  /** Currency symbols render before the number ($48), everything else after. */
  readonly prefix: boolean;
}

/** A resolved unit atom (from the units table), e.g. km, °C, mph. */
export interface ResolvedUnit {
  readonly dimension: Dimension;
  readonly factor: Num;
  readonly offset: Num;
  readonly symbol: string;
  readonly prefix?: boolean;
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
  ) {}

  /** A plain (dimensionless) number. */
  static scalar(value: Num): Quantity {
    return new Quantity(value, DIMENSIONLESS, null);
  }

  /** `value` of a unit, e.g. `fromUnit(5, km)` → 5 km. Applies affine offset. */
  static fromUnit(value: Num, unit: ResolvedUnit): Quantity {
    const base = value.mul(unit.factor).add(unit.offset);
    return new Quantity(base, unit.dimension, {
      label: unit.symbol,
      factor: unit.factor,
      offset: unit.offset,
      prefix: unit.prefix ?? false,
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
      dimMul(this.dimension, other.dimension),
      combineMul(this, other),
    );
  }

  div(other: Quantity): Quantity {
    return new Quantity(
      this.base.div(other.base),
      dimDiv(this.dimension, other.dimension),
      combineDiv(this, other),
    );
  }

  pow(exponent: Num): Quantity {
    const base = this.base.pow(exponent);
    if (this.isDimensionless()) return Quantity.scalar(base);
    const dimension = dimPow(this.dimension, exponent.toNumber());
    const display =
      this.display && exponent.isInteger()
        ? {
            label: `${this.display.label}^${exponent.toString()}`,
            factor: this.display.factor.pow(exponent),
            offset: Num.ZERO,
            prefix: false,
          }
        : null;
    return new Quantity(base, dimension, display);
  }

  /** Adopt `target`'s display unit (for `to` / `in`). Dimensions must match. */
  convertTo(target: Quantity): Quantity {
    this.requireSameDimension(target, 'convert');
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
    return this.format((n) => n.toDisplay(significantDigits));
  }

  toString(): string {
    return this.format((n) => n.toString());
  }

  private format(fmt: (n: Num) => string): string {
    if (this.display) {
      const shown = this.base.sub(this.display.offset).div(this.display.factor);
      const text = fmt(shown);
      return this.display.prefix
        ? `${this.display.label}${text}`
        : `${text} ${this.display.label}`;
    }
    if (this.isDimensionless()) return fmt(this.base);
    return `${fmt(this.base)} ${dimToBaseLabel(this.dimension)}`;
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

function combineMul(a: Quantity, b: Quantity): DisplayUnit | null {
  if (a.isDimensionless() && !a.display) return b.display;
  if (b.isDimensionless() && !b.display) return a.display;
  if (a.display && b.display) {
    return {
      label: joinMul(a.display.label, b.display.label),
      factor: a.display.factor.mul(b.display.factor),
      offset: Num.ZERO,
      prefix: false,
    };
  }
  return null;
}

function combineDiv(a: Quantity, b: Quantity): DisplayUnit | null {
  if (b.isDimensionless() && !b.display) return a.display;
  if (a.display && b.display) {
    return {
      label: `${a.display.label}/${b.display.label}`,
      factor: a.display.factor.div(b.display.factor),
      offset: Num.ZERO,
      prefix: false,
    };
  }
  return null;
}

function joinMul(a: string, b: string): string {
  if (a === '') return b;
  if (b === '') return a;
  return `${a}·${b}`;
}
