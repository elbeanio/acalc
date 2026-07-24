/** A reference target: either a row id (`$3`) or a row name (`$total`). */
export type RefTarget =
  | { readonly kind: 'id'; readonly id: number }
  | { readonly kind: 'name'; readonly name: string };

export type BinaryOp = '+' | '-' | '*' | '/' | '%' | '^';

/** Abstract syntax tree for a single expression. */
export type Node =
  | { readonly type: 'number'; readonly value: string }
  | { readonly type: 'date'; readonly value: string } // ISO date literal, 2026-12-25
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
  | { readonly type: 'factorial'; readonly operand: Node } // postfix !
  | { readonly type: 'call'; readonly name: string; readonly args: Node[] }
  | { readonly type: 'range'; readonly from: number; readonly to: number } // $1..$5 (row ids)
  | { readonly type: 'unit'; readonly name: string } // a bare unit, e.g. km
  | { readonly type: 'quantity'; readonly value: Node; readonly unit: Node } // 5 km
  | { readonly type: 'convert'; readonly value: Node; readonly unit: Node } // x to km
  | { readonly type: 'base'; readonly value: Node; readonly radix: Radix }; // x to hex

/** A display base for a number, via `to hex` / `to bin` / `to oct` / `to dec`. */
export type Radix = 'hex' | 'bin' | 'oct' | 'dec';
