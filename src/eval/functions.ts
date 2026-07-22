import { Num } from '../num/index.ts';
import { EvalError } from './errors.ts';

interface FunctionDef {
  readonly minArgs: number;
  /** Maximum argument count; omit for variadic. */
  readonly maxArgs?: number;
  readonly apply: (args: Num[]) => Num;
}

/** Built-in constants resolved from bare identifiers. */
export const CONSTANTS: Record<string, () => Num> = {
  pi: () => Num.pi(),
  e: () => Num.e(),
};

/** Built-in function table. See docs/GRAMMAR.md. */
export const FUNCTIONS: Record<string, FunctionDef> = {
  sin: { minArgs: 1, maxArgs: 1, apply: ([x]) => x!.sin() },
  cos: { minArgs: 1, maxArgs: 1, apply: ([x]) => x!.cos() },
  tan: { minArgs: 1, maxArgs: 1, apply: ([x]) => x!.tan() },
  sqrt: { minArgs: 1, maxArgs: 1, apply: ([x]) => x!.sqrt() },
  exp: { minArgs: 1, maxArgs: 1, apply: ([x]) => x!.exp() },
  ln: { minArgs: 1, maxArgs: 1, apply: ([x]) => x!.ln() },
  log: {
    minArgs: 1,
    maxArgs: 2,
    apply: ([x, base]) => (base ? x!.log(base) : x!.log(10)),
  },
  abs: { minArgs: 1, maxArgs: 1, apply: ([x]) => x!.abs() },
  floor: { minArgs: 1, maxArgs: 1, apply: ([x]) => x!.floor() },
  ceil: { minArgs: 1, maxArgs: 1, apply: ([x]) => x!.ceil() },
  round: {
    minArgs: 1,
    maxArgs: 2,
    apply: ([x, dp]) => x!.round(dp ? Math.trunc(dp.toNumber()) : 0),
  },
  min: { minArgs: 1, apply: (args) => Num.min(...args) },
  max: { minArgs: 1, apply: (args) => Num.max(...args) },
};

/** Apply a function by name, validating that it exists and the arity matches. */
export function applyFunction(name: string, args: Num[]): Num {
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

function arityText(min: number, max: number | undefined): string {
  if (max === undefined) return `at least ${min} argument${plural(min)}`;
  if (min === max) return `${min} argument${plural(min)}`;
  return `${min}–${max} arguments`;
}

function plural(n: number): string {
  return n === 1 ? '' : 's';
}
