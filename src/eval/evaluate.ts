import type { Node, RefTarget } from '../lang/index.ts';
import { Num } from '../num/index.ts';
import { EvalError } from './errors.ts';
import { applyFunction, CONSTANTS } from './functions.ts';

/**
 * Resolves a reference (`$id` / `$name`) to a value. Should throw an
 * {@link EvalError} with kind `'ref'` when the target does not exist.
 */
export type RefResolver = (target: RefTarget) => Num;

const HUNDREDTH = Num.of('0.01');

/**
 * Evaluate an AST to a {@link Num}. References are resolved through `resolve`.
 * Throws {@link EvalError} on any evaluation failure (dangling ref, unknown
 * identifier, division by zero, non-finite result, …).
 */
export function evaluate(node: Node, resolve: RefResolver): Num {
  switch (node.type) {
    case 'number':
      return Num.of(node.value);

    case 'ref':
      return resolve(node.target);

    case 'identifier': {
      const constant = CONSTANTS[node.name];
      if (!constant) {
        throw new EvalError(`Unknown identifier "${node.name}"`);
      }
      return constant();
    }

    case 'unary': {
      const operand = evaluate(node.operand, resolve);
      return node.op === '-' ? operand.neg() : operand;
    }

    case 'percent':
      return evaluate(node.operand, resolve).mul(HUNDREDTH);

    case 'binary':
      return evaluateBinary(node, resolve);

    case 'call': {
      const args = node.args.map((arg) => evaluate(arg, resolve));
      return finite(applyFunction(node.name, args), `"${node.name}"`);
    }
  }
}

function evaluateBinary(
  node: Extract<Node, { type: 'binary' }>,
  resolve: RefResolver,
): Num {
  const left = evaluate(node.left, resolve);
  const right = evaluate(node.right, resolve);
  switch (node.op) {
    case '+':
      return left.add(right);
    case '-':
      return left.sub(right);
    case '*':
      return left.mul(right);
    case '/':
      if (right.isZero()) throw new EvalError('Division by zero');
      return finite(left.div(right), 'division');
    case '%':
      if (right.isZero()) throw new EvalError('Modulo by zero');
      return finite(left.mod(right), 'modulo');
    case '^':
      return finite(left.pow(right), 'exponentiation');
  }
}

/** Guard against NaN / infinite results from an operation. */
function finite(value: Num, what: string): Num {
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
