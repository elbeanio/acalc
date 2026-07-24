import type { Node, RefTarget } from '../lang/index.ts';

/** A range dependency, `$from..$to` (endpoints by id or name, either order). */
export interface RangeRef {
  readonly from: RefTarget;
  readonly to: RefTarget;
}

/** Collect every reference target appearing in an AST (in encounter order). */
export function extractRefTargets(node: Node): RefTarget[] {
  const targets: RefTarget[] = [];
  walk(node, targets, []);
  return targets;
}

/** Collect every range (`$from..$to`) appearing in an AST. */
export function extractRanges(node: Node): RangeRef[] {
  const ranges: RangeRef[] = [];
  walk(node, [], ranges);
  return ranges;
}

function walk(node: Node, targets: RefTarget[], ranges: RangeRef[]): void {
  switch (node.type) {
    case 'ref':
      targets.push(node.target);
      return;
    case 'range':
      ranges.push({ from: node.from, to: node.to });
      return;
    case 'unary':
    case 'percent':
    case 'factorial':
      walk(node.operand, targets, ranges);
      return;
    case 'binary':
      walk(node.left, targets, ranges);
      walk(node.right, targets, ranges);
      return;
    case 'quantity':
    case 'convert':
      walk(node.value, targets, ranges);
      walk(node.unit, targets, ranges);
      return;
    case 'call':
      for (const arg of node.args) walk(arg, targets, ranges);
      return;
    case 'number':
    case 'identifier':
    case 'unit':
      return;
  }
}
