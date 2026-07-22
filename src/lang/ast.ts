/** A reference target: either a row id (`$3`) or a row name (`$total`). */
export type RefTarget =
  | { readonly kind: 'id'; readonly id: number }
  | { readonly kind: 'name'; readonly name: string };

export type BinaryOp = '+' | '-' | '*' | '/' | '%' | '^';

/** Abstract syntax tree for a single expression. */
export type Node =
  | { readonly type: 'number'; readonly value: string }
  | { readonly type: 'ref'; readonly target: RefTarget }
  | { readonly type: 'identifier'; readonly name: string }
  | { readonly type: 'unary'; readonly op: '-' | '+'; readonly operand: Node }
  | {
      readonly type: 'binary';
      readonly op: BinaryOp; // '%' means modulo here
      readonly left: Node;
      readonly right: Node;
    }
  | { readonly type: 'percent'; readonly operand: Node } // postfix %
  | { readonly type: 'call'; readonly name: string; readonly args: Node[] };
