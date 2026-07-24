import type { Node } from './ast.ts';
import { parse } from './parser.ts';

/**
 * Serialise an AST back to canonical source text: single spaces around binary
 * operators, tight unary/percent/calls, and minimal parentheses. Used to
 * reformat a row on blur so calculations read consistently.
 */
export function astToSource(node: Node): string {
  return render(node, 0);
}

/** Parse and reformat; returns null if the source doesn't parse. */
export function formatSource(source: string): string | null {
  try {
    return astToSource(parse(source));
  } catch {
    return null;
  }
}

const PREC = {
  additive: 1,
  multiplicative: 2,
  unary: 3,
  power: 4,
  postfix: 5,
  atom: 6,
} as const;

function precedenceOf(node: Node): number {
  switch (node.type) {
    case 'binary':
      if (node.op === '+' || node.op === '-') return PREC.additive;
      if (node.op === '^') return PREC.power;
      return PREC.multiplicative;
    case 'unary':
      return PREC.unary;
    case 'percent':
    case 'factorial':
      return PREC.postfix;
    default:
      return PREC.atom;
  }
}

/** Min-precedence for [left, right] operands, encoding associativity. */
function operandPrecedences(op: string): [number, number] {
  switch (op) {
    case '+':
      return [PREC.additive, PREC.additive]; // associative
    case '-':
      return [PREC.additive, PREC.multiplicative]; // right must wrap same-prec
    case '*':
      return [PREC.multiplicative, PREC.multiplicative]; // associative
    case '/':
    case '%':
      return [PREC.multiplicative, PREC.unary]; // right must wrap same-prec
    case '^':
      return [PREC.postfix, PREC.unary]; // right-assoc; base wraps if not atomic
    default:
      return [0, 0];
  }
}

function render(node: Node, minPrec: number): string {
  const source = renderInner(node);
  return precedenceOf(node) < minPrec ? `(${source})` : source;
}

function renderInner(node: Node): string {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'date':
      return node.value;
    case 'time':
      return node.value;
    case 'identifier':
      return node.name;
    case 'ref':
      return node.target.kind === 'id'
        ? `$${node.target.id}`
        : `$${node.target.name}`;
    case 'unary':
      return `${node.op}${render(node.operand, PREC.unary)}`;
    case 'percent':
      return `${render(node.operand, PREC.postfix)}%`;
    case 'factorial':
      return `${render(node.operand, PREC.postfix)}!`;
    case 'binary': {
      const [leftMin, rightMin] = operandPrecedences(node.op);
      return `${render(node.left, leftMin)} ${node.op} ${render(node.right, rightMin)}`;
    }
    case 'call':
      return `${node.name}(${node.args.map((a) => render(a, 0)).join(', ')})`;
    case 'range':
      return `$${node.from}..$${node.to}`;
    case 'unit':
      return node.name;
    case 'quantity': {
      // Keep a space if the value ends in a letter (e.g. `pi rad`), else they'd
      // glue into one identifier ("pirad"); numbers/parens can sit tight (`5km`).
      const value = render(node.value, PREC.postfix);
      const sep = /[A-Za-z_]$/.test(value) ? ' ' : '';
      return `${value}${sep}${renderUnit(node.unit)}`;
    }
    case 'convert':
      return `${render(node.value, 0)} to ${renderUnit(node.unit)}`;
    case 'base':
      return `${render(node.value, 0)} to ${node.radix}`;
  }
}

/** Render a unit expression compactly, e.g. `km/h`, `m^2`. */
function renderUnit(node: Node): string {
  switch (node.type) {
    case 'unit':
      return node.name;
    case 'number':
      return node.value;
    case 'unary':
      return `${node.op}${renderUnit(node.operand)}`;
    case 'binary':
      return `${renderUnit(node.left)}${node.op}${renderUnit(node.right)}`;
    default:
      return render(node, 0);
  }
}
