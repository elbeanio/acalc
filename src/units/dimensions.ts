/**
 * Physical dimension as a vector of base-dimension exponents. Angle is treated
 * as dimensionless (rad = 1), so it isn't a base axis here.
 */
export interface Dimension {
  readonly length: number;
  readonly mass: number;
  readonly time: number;
  readonly temperature: number;
  readonly information: number;
  readonly currency: number;
}

const AXES = [
  'length',
  'mass',
  'time',
  'temperature',
  'information',
  'currency',
] as const;

/** Base-unit symbol per axis, for rendering derived dimensions. */
const BASE_SYMBOL: Record<keyof Dimension, string> = {
  length: 'm',
  mass: 'kg',
  time: 's',
  temperature: 'K',
  information: 'B',
  currency: '£',
};

export const DIMENSIONLESS: Dimension = {
  length: 0,
  mass: 0,
  time: 0,
  temperature: 0,
  information: 0,
  currency: 0,
};

export function dim(partial: Partial<Dimension>): Dimension {
  return { ...DIMENSIONLESS, ...partial };
}

export function dimEqual(a: Dimension, b: Dimension): boolean {
  return AXES.every((axis) => a[axis] === b[axis]);
}

export function isDimensionless(d: Dimension): boolean {
  return dimEqual(d, DIMENSIONLESS);
}

/** Combine dimensions for multiplication (exponents add). */
export function dimMul(a: Dimension, b: Dimension): Dimension {
  return mapAxes((axis) => a[axis] + b[axis]);
}

/** Combine dimensions for division (exponents subtract). */
export function dimDiv(a: Dimension, b: Dimension): Dimension {
  return mapAxes((axis) => a[axis] - b[axis]);
}

/** Raise a dimension to a power (exponents scale). */
export function dimPow(a: Dimension, n: number): Dimension {
  return mapAxes((axis) => a[axis] * n);
}

/**
 * Currency, information and temperature are "amounts" — you can scale, add and
 * form rates (£/month, MB/s), but a squared one (byte², money²) is nonsense.
 * So their exponents must stay within ±1.
 */
export function isSensibleDimension(d: Dimension): boolean {
  return (
    Math.abs(d.currency) <= 1 &&
    Math.abs(d.information) <= 1 &&
    Math.abs(d.temperature) <= 1
  );
}

/** Render a dimension as a base-unit label, e.g. `m/s`, `m^2`, `kg·m/s^2`. */
export function dimToBaseLabel(d: Dimension): string {
  const num: string[] = [];
  const den: string[] = [];
  for (const axis of AXES) {
    const exp = d[axis];
    if (exp === 0) continue;
    const symbol = BASE_SYMBOL[axis];
    const mag = Math.abs(exp);
    const term = mag === 1 ? symbol : `${symbol}^${mag}`;
    (exp > 0 ? num : den).push(term);
  }
  const numerator = num.length > 0 ? num.join('·') : '1';
  return den.length > 0 ? `${numerator}/${den.join('·')}` : numerator;
}

function mapAxes(fn: (axis: keyof Dimension) => number): Dimension {
  return {
    length: fn('length'),
    mass: fn('mass'),
    time: fn('time'),
    temperature: fn('temperature'),
    information: fn('information'),
    currency: fn('currency'),
  };
}
