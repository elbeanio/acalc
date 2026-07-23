import type { Node } from './ast.ts';
import { parse } from './parser.ts';

/**
 * Serialise an AST to a LaTeX string (for KaTeX rendering). This is the third
 * consumer of the AST, alongside evaluation and dependency analysis.
 *
 * Parentheses are inserted based on operator precedence so the typeset form is
 * unambiguous but not over-parenthesised.
 */
export function astToLatex(node: Node): string {
  return render(node, 0);
}

/** Parse and serialise; returns null if the source doesn't parse. */
export function sourceToLatex(source: string): string | null {
  try {
    return astToLatex(parse(source));
  } catch {
    return null;
  }
}

// Precedence levels mirror the grammar; higher binds tighter.
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
      return PREC.multiplicative; // * / %
    case 'unary':
      return PREC.unary;
    case 'percent':
    case 'factorial':
      return PREC.postfix;
    default:
      return PREC.atom;
  }
}

/** Render `node`, wrapping in parens if its precedence is below `minPrec`. */
function render(node: Node, minPrec: number): string {
  const latex = renderInner(node);
  return precedenceOf(node) < minPrec ? `\\left(${latex}\\right)` : latex;
}

const CONSTANTS: Record<string, string> = { pi: '\\pi', e: 'e' };

const NAMED_FUNCTIONS: Record<string, string> = {
  sin: '\\sin',
  cos: '\\cos',
  tan: '\\tan',
  ln: '\\ln',
  log: '\\log',
  exp: '\\exp',
};

function renderInner(node: Node): string {
  switch (node.type) {
    case 'number':
      return node.value;

    case 'identifier':
      return CONSTANTS[node.name] ?? `\\mathrm{${escapeText(node.name)}}`;

    case 'ref':
      // Drop the `$`; style references so they read as substitutions. Numeric
      // ids get a pill (so "1" isn't read as a literal); names read as an
      // italic variable. Classes are styled in CSS; needs KaTeX `trust`.
      return node.target.kind === 'id'
        ? `\\htmlClass{acalc-ref}{${node.target.id}}`
        : `\\htmlClass{acalc-var}{\\mathit{${escapeText(node.target.name)}}}`;

    case 'unary':
      return `${node.op === '-' ? '-' : '+'}${render(node.operand, PREC.unary)}`;

    case 'percent':
      return `${render(node.operand, PREC.postfix)}\\%`;

    case 'factorial':
      return `${render(node.operand, PREC.postfix)}!`;

    case 'binary':
      return renderBinary(node);

    case 'call':
      return renderCall(node);

    case 'unit':
      return `\\text{${escapeText(node.name)}}`;

    case 'quantity':
      return `${render(node.value, PREC.postfix)}\\,${renderUnitLatex(node.unit)}`;

    case 'convert':
      return `${render(node.value, 0)} \\to ${renderUnitLatex(node.unit)}`;
  }
}

function renderUnitLatex(node: Node): string {
  switch (node.type) {
    case 'unit':
      return `\\text{${escapeText(node.name)}}`;
    case 'number':
      return node.value;
    case 'unary':
      return `${node.op === '-' ? '-' : ''}${renderUnitLatex(node.operand)}`;
    case 'binary':
      if (node.op === '^') {
        return `${renderUnitLatex(node.left)}^{${renderUnitLatex(node.right)}}`;
      }
      return `${renderUnitLatex(node.left)}${node.op === '*' ? '\\cdot ' : '/'}${renderUnitLatex(node.right)}`;
    default:
      return render(node, 0);
  }
}

function renderBinary(node: Extract<Node, { type: 'binary' }>): string {
  const { op, left, right } = node;
  switch (op) {
    case '+':
      return `${render(left, PREC.additive)} + ${render(right, PREC.multiplicative)}`;
    case '-':
      return `${render(left, PREC.additive)} - ${render(right, PREC.multiplicative)}`;
    case '*':
      return `${render(left, PREC.multiplicative)} \\times ${render(right, PREC.multiplicative)}`;
    case '/':
      // The fraction bar groups its operands, so no parentheses are needed.
      return `\\frac{${render(left, 0)}}{${render(right, 0)}}`;
    case '%':
      return `${render(left, PREC.multiplicative)} \\bmod ${render(right, PREC.multiplicative)}`;
    case '^':
      // Right-associative; base needs parens if it isn't atomic.
      return `${render(left, PREC.postfix)}^{${render(right, 0)}}`;
  }
}

function renderCall(node: Extract<Node, { type: 'call' }>): string {
  const args = node.args.map((a) => render(a, 0));
  if (node.name === 'sqrt' && args.length === 1) {
    return `\\sqrt{${args[0]}}`;
  }
  if (node.name === 'abs' && args.length === 1) {
    return `\\left|${args[0]}\\right|`;
  }
  const fn = NAMED_FUNCTIONS[node.name];
  if (fn && args.length === 1) {
    return `${fn}\\left(${args[0]}\\right)`;
  }
  return `\\operatorname{${escapeText(node.name)}}\\left(${args.join(', ')}\\right)`;
}

/** Escape characters that are special inside LaTeX \text / \mathrm. */
function escapeText(s: string): string {
  return s.replace(/[\\{}$&#^_%~]/g, (ch) => `\\${ch}`);
}
