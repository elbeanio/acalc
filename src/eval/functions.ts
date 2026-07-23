import { Num } from '../num/index.ts';
import { Quantity } from '../units/index.ts';
import { EvalError } from './errors.ts';

interface FunctionDef {
  readonly minArgs: number;
  /** Maximum argument count; omit for variadic. */
  readonly maxArgs?: number;
  readonly apply: (args: Quantity[]) => Quantity;
}

/** The scalar value of a dimensionless argument, or an error for a unit value. */
function scalar(q: Quantity, fn: string): Num {
  const value = q.asScalar();
  if (value === null) {
    throw new EvalError(`"${fn}" needs a plain number, not a value with units`);
  }
  return value;
}

const HALF = Num.of('0.5');

/** Built-in constants resolved from bare identifiers. */
export const CONSTANTS: Record<string, () => Quantity> = {
  pi: () => Quantity.scalar(Num.pi()),
  e: () => Quantity.scalar(Num.e()),
};

/** Built-in function table. See docs/GRAMMAR.md. */
export const FUNCTIONS: Record<string, FunctionDef> = {
  sin: { minArgs: 1, maxArgs: 1, apply: ([x]) => Quantity.scalar(scalar(x!, 'sin').sin()) },
  cos: { minArgs: 1, maxArgs: 1, apply: ([x]) => Quantity.scalar(scalar(x!, 'cos').cos()) },
  tan: { minArgs: 1, maxArgs: 1, apply: ([x]) => Quantity.scalar(scalar(x!, 'tan').tan()) },
  // sqrt works on units too (e.g. sqrt(16 m^2) = 4 m).
  sqrt: { minArgs: 1, maxArgs: 1, apply: ([x]) => x!.pow(HALF) },
  cbrt: { minArgs: 1, maxArgs: 1, apply: ([x]) => Quantity.scalar(nthRoot(scalar(x!, 'cbrt'), Num.of('3'))) },
  root: {
    minArgs: 2,
    maxArgs: 2,
    apply: ([x, n]) => Quantity.scalar(nthRoot(scalar(x!, 'root'), scalar(n!, 'root'))),
  },
  exp: { minArgs: 1, maxArgs: 1, apply: ([x]) => Quantity.scalar(scalar(x!, 'exp').exp()) },
  ln: { minArgs: 1, maxArgs: 1, apply: ([x]) => Quantity.scalar(scalar(x!, 'ln').ln()) },
  log: {
    minArgs: 1,
    maxArgs: 2,
    apply: ([x, base]) =>
      Quantity.scalar(
        base ? scalar(x!, 'log').log(scalar(base, 'log')) : scalar(x!, 'log').log(10),
      ),
  },
  abs: { minArgs: 1, maxArgs: 1, apply: ([x]) => x!.abs() },
  floor: { minArgs: 1, maxArgs: 1, apply: ([x]) => x!.mapShown((n) => n.floor()) },
  ceil: { minArgs: 1, maxArgs: 1, apply: ([x]) => x!.mapShown((n) => n.ceil()) },
  round: {
    minArgs: 1,
    maxArgs: 2,
    apply: ([x, dp]) => {
      const places = dp ? Math.trunc(scalar(dp, 'round').toNumber()) : 0;
      return x!.mapShown((n) => n.round(places));
    },
  },
  min: { minArgs: 1, apply: (args) => extreme(args, 'min') },
  max: { minArgs: 1, apply: (args) => extreme(args, 'max') },
};

/** Apply a function by name, validating that it exists and the arity matches. */
export function applyFunction(name: string, args: Quantity[]): Quantity {
  const def = FUNCTIONS[name];
  if (!def) {
    throw new EvalError(`Unknown function "${name}"`);
  }
  if (
    args.length < def.minArgs ||
    (def.maxArgs !== undefined && args.length > def.maxArgs)
  ) {
    throw new EvalError(
      `"${name}" expects ${arityText(def.minArgs, def.maxArgs)}, got ${args.length}`,
    );
  }
  return def.apply(args);
}

/** Smallest / largest of same-dimension quantities. */
function extreme(args: Quantity[], which: 'min' | 'max'): Quantity {
  return args.reduce((best, q) => {
    if (!best.sameDimension(q)) {
      throw new EvalError(`"${which}" needs values with the same units`);
    }
    const cmp = q.cmp(best);
    const take = which === 'min' ? cmp < 0 : cmp > 0;
    return take ? q : best;
  });
}

/** nth root of x, i.e. x^(1/n). Handles the real root of a negative base. */
function nthRoot(x: Num, n: Num): Num {
  const reciprocal = Num.ONE.div(n);
  if (x.isNegative()) {
    const oddInteger = n.isInteger() && !n.mod(Num.of('2')).isZero();
    if (!oddInteger) {
      throw new EvalError('Even or non-integer root of a negative number');
    }
    return x.abs().pow(reciprocal).neg();
  }
  return x.pow(reciprocal);
}

function arityText(min: number, max: number | undefined): string {
  if (max === undefined) return `at least ${min} argument${plural(min)}`;
  if (min === max) return `${min} argument${plural(min)}`;
  return `${min}–${max} arguments`;
}

function plural(n: number): string {
  return n === 1 ? '' : 's';
}
