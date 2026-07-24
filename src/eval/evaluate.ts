import type { Node, RefTarget } from '../lang/index.ts';
import { Num } from '../num/index.ts';
import { Quantity, lookupUnit } from '../units/index.ts';
import { EvalError } from './errors.ts';
import { applyFunction, CONSTANTS } from './functions.ts';

/**
 * Resolves a reference (`$id` / `$name`) to a value. Should throw an
 * {@link EvalError} with kind `'ref'` when the target does not exist.
 */
export type RefResolver = (target: RefTarget) => Quantity;

/**
 * Expands a range (`$from..$to`) to the values of the existing rows it spans,
 * for aggregate functions like `sum`. Provided by the stack layer, which knows
 * which ids exist.
 */
export type RangeResolver = (from: number, to: number) => Quantity[];

const noRanges: RangeResolver = () => {
  throw new EvalError(
    'A range like $1..$5 can only be used inside a function, e.g. sum($1..$5)',
  );
};

interface Ctx {
  readonly resolve: RefResolver;
  readonly resolveRange: RangeResolver;
}

const HUNDREDTH = Quantity.scalar(Num.of('0.01'));

/**
 * Evaluate an AST to a {@link Quantity}. References are resolved through
 * `resolve`; ranges (only valid as function arguments) through `resolveRange`.
 * Throws {@link EvalError} on any evaluation failure.
 */
export function evaluate(
  node: Node,
  resolve: RefResolver,
  resolveRange: RangeResolver = noRanges,
): Quantity {
  return evalNode(node, { resolve, resolveRange });
}

function evalNode(node: Node, ctx: Ctx): Quantity {
  switch (node.type) {
    case 'number':
      return Quantity.scalar(Num.of(node.value));

    case 'ref':
      return ctx.resolve(node.target);

    case 'identifier': {
      const constant = CONSTANTS[node.name];
      if (!constant) {
        throw new EvalError(`Unknown identifier "${node.name}"`);
      }
      return constant();
    }

    case 'unit': {
      const unit = lookupUnit(node.name);
      if (!unit) throw new EvalError(`Unknown unit "${node.name}"`);
      return Quantity.fromUnit(Num.ONE, unit);
    }

    case 'unary': {
      const operand = evalNode(node.operand, ctx);
      return node.op === '-' ? operand.neg() : operand;
    }

    case 'percent':
      return evalNode(node.operand, ctx).mul(HUNDREDTH);

    case 'factorial':
      return Quantity.scalar(
        factorial(requireScalar(evalNode(node.operand, ctx), 'factorial')),
      );

    case 'quantity':
      return evaluateQuantity(node, ctx);

    case 'convert': {
      const value = evalNode(node.value, ctx);
      const target = evalNode(node.unit, ctx);
      return value.convertTo(target);
    }

    case 'binary':
      return evaluateBinary(node, ctx);

    case 'call': {
      // A range argument expands in place into the values it spans, so
      // aggregates like sum/avg are just variadic functions.
      const args = node.args.flatMap((arg) =>
        arg.type === 'range'
          ? ctx.resolveRange(arg.from, arg.to)
          : [evalNode(arg, ctx)],
      );
      return finite(applyFunction(node.name, args), `"${node.name}"`);
    }

    case 'range':
      // Only reachable when a range is used outside a call argument.
      throw new EvalError(
        'A range like $1..$5 can only be used inside a function, e.g. sum($1..$5)',
      );
  }
}

function evaluateQuantity(
  node: Extract<Node, { type: 'quantity' }>,
  ctx: Ctx,
): Quantity {
  const value = requireScalar(evalNode(node.value, ctx), 'a quantity');
  // A single unit uses fromUnit so affine units (°C/°F) apply their offset.
  if (node.unit.type === 'unit') {
    const unit = lookupUnit(node.unit.name);
    if (!unit) throw new EvalError(`Unknown unit "${node.unit.name}"`);
    return Quantity.fromUnit(value, unit);
  }
  // A compound unit (km/h, m^2) is a plain multiplication.
  return Quantity.scalar(value).mul(evalNode(node.unit, ctx));
}

function evaluateBinary(
  node: Extract<Node, { type: 'binary' }>,
  ctx: Ctx,
): Quantity {
  const left = evalNode(node.left, ctx);
  const right = evalNode(node.right, ctx);
  switch (node.op) {
    case '+':
      return left.add(right);
    case '-':
      return left.sub(right);
    case '*':
      return left.mul(right);
    case '/':
      if (right.base.isZero()) throw new EvalError('Division by zero');
      return finite(left.div(right), 'division');
    case '%': {
      const a = requireScalar(left, 'modulo');
      const b = requireScalar(right, 'modulo');
      if (b.isZero()) throw new EvalError('Modulo by zero');
      return Quantity.scalar(a.mod(b));
    }
    case '^': {
      const exponent = requireScalar(right, 'an exponent');
      return finite(left.pow(exponent), 'exponentiation');
    }
  }
}

/** The scalar value of a dimensionless quantity, or an error. */
function requireScalar(q: Quantity, what: string): Num {
  const value = q.asScalar();
  if (value === null) {
    throw new EvalError(`${what} must be a plain number, not a value with units`);
  }
  return value;
}

/** Exact integer factorial (`n!`) via BigInt. */
const FACTORIAL_LIMIT = 10000;
function factorial(value: Num): Num {
  if (!value.isInteger() || value.isNegative()) {
    throw new EvalError('Factorial requires a non-negative integer');
  }
  const n = value.toNumber();
  if (n > FACTORIAL_LIMIT) {
    throw new EvalError(`Factorial argument too large (max ${FACTORIAL_LIMIT})`);
  }
  let product = 1n;
  for (let i = 2n; i <= BigInt(n); i++) product *= i;
  return Num.of(product.toString());
}

/** Guard against NaN / infinite results. */
function finite(value: Quantity, what: string): Quantity {
  if (value.isNaN()) {
    throw new EvalError(`Invalid ${what} (not a number)`);
  }
  if (!value.isFinite()) {
    throw new EvalError(`${capitalize(what)} result is not finite`);
  }
  return value;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
