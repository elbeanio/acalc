import type { Node, RefTarget } from '../lang/index.ts';

/** Collect every reference target appearing in an AST (in encounter order). */
export function extractRefTargets(node: Node): RefTarget[] {
  const targets: RefTarget[] = [];
  walk(node, targets);
  return targets;
}

function walk(node: Node, out: RefTarget[]): void {
  switch (node.type) {
    case 'ref':
      out.push(node.target);
      return;
    case 'unary':
    case 'percent':
    case 'factorial':
      walk(node.operand, out);
      return;
    case 'binary':
      walk(node.left, out);
      walk(node.right, out);
      return;
    case 'call':
      for (const arg of node.args) walk(arg, out);
      return;
    case 'number':
    case 'identifier':
      return;
  }
}
