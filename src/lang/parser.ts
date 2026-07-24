import { lookupUnit } from '../units/index.ts';
import type { Node, Radix, RefTarget } from './ast.ts';
import { ParseError } from './errors.ts';
import { tokenize } from './lexer.ts';
import type { Token, TokenType } from './tokens.ts';

/** Token types that can begin an operand (used to disambiguate `%`). */
const OPERAND_START: ReadonlySet<TokenType> = new Set<TokenType>([
  'number',
  'ref',
  'ident',
  'lparen',
]);

const CONVERSION_KEYWORDS = new Set(['to', 'in']);

/** Base keywords following `to`/`in`, mapping aliases to a canonical radix. */
const RADIX_KEYWORDS: Record<string, Radix> = {
  hex: 'hex',
  hexadecimal: 'hex',
  bin: 'bin',
  binary: 'bin',
  oct: 'oct',
  octal: 'oct',
  dec: 'dec',
  decimal: 'dec',
};

/**
 * Parse an expression string into an AST following `docs/GRAMMAR.md`.
 * Throws {@link ParseError} on malformed input.
 */
export function parse(source: string): Node {
  return new Parser(tokenize(source)).parseProgram();
}

class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  parseProgram(): Node {
    if (this.peek().type === 'eof') {
      throw new ParseError('Empty expression', 0);
    }
    const node = this.parseExpression();
    const tok = this.peek();
    if (tok.type !== 'eof') {
      throw new ParseError(`Unexpected "${tok.value}"`, tok.start);
    }
    return node;
  }

  // expression = additive ( ("to"|"in") unitExpr )*   (conversion, lowest)
  private parseExpression(): Node {
    let node = this.parseAdditive();
    for (;;) {
      const tok = this.peek();
      if (tok.type === 'ident' && CONVERSION_KEYWORDS.has(tok.value)) {
        this.advance();
        const radix = this.radixKeyword();
        node = radix
          ? { type: 'base', value: node, radix }
          : { type: 'convert', value: node, unit: this.parseUnitExpr() };
      } else {
        return node;
      }
    }
  }

  /** If the cursor sits on a base keyword (hex/binary/…), consume it. */
  private radixKeyword(): Radix | null {
    const tok = this.peek();
    if (tok.type !== 'ident') return null;
    const radix = RADIX_KEYWORDS[tok.value];
    if (!radix) return null;
    this.advance();
    return radix;
  }

  private parseAdditive(): Node {
    let left = this.parseMultiplicative();
    for (;;) {
      const t = this.peek().type;
      if (t === 'plus' || t === 'minus') {
        this.advance();
        const right = this.parseMultiplicative();
        left = { type: 'binary', op: t === 'plus' ? '+' : '-', left, right };
      } else {
        return left;
      }
    }
  }

  private parseMultiplicative(): Node {
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek().type;
      if (t === 'star' || t === 'slash') {
        this.advance();
        const right = this.parseUnary();
        left = { type: 'binary', op: t === 'star' ? '*' : '/', left, right };
      } else if (t === 'percent' && this.isInfixPercent()) {
        this.advance();
        const right = this.parseUnary();
        left = { type: 'binary', op: '%', left, right };
      } else {
        return left;
      }
    }
  }

  private parseUnary(): Node {
    const t = this.peek().type;
    if (t === 'minus' || t === 'plus') {
      this.advance();
      const operand = this.parseUnary();
      return { type: 'unary', op: t === 'minus' ? '-' : '+', operand };
    }
    return this.parseQuantity();
  }

  // quantity = single ( single )*   — juxtaposed quantities sum, e.g. `2h 30min`,
  // `5ft 3inch`. A mismatch of dimensions (`2h 30m`) is an evaluation error.
  private parseQuantity(): Node {
    let node = this.parseSingleQuantity();
    while (this.startsQuantity()) {
      const right = this.parseSingleQuantity();
      node = { type: 'binary', op: '+', left: node, right };
    }
    return node;
  }

  // single = power (unitExpr)?   — one value with an optional unit
  private parseSingleQuantity(): Node {
    const value = this.parsePower();
    if (this.nextIsUnit()) {
      return { type: 'quantity', value, unit: this.parseUnitExpr() };
    }
    return value;
  }

  /** True when a `number unit …` (another quantity) follows, to be summed in. */
  private startsQuantity(): boolean {
    if (this.peek().type !== 'number') return false;
    const after = this.tokens[this.pos + 1];
    return (
      after !== undefined &&
      after.type === 'ident' &&
      !CONVERSION_KEYWORDS.has(after.value) &&
      lookupUnit(after.value) !== null
    );
  }

  private parsePower(): Node {
    const base = this.parsePostfix();
    if (this.peek().type === 'caret') {
      this.advance();
      // A bare unary (no unit juxtaposition), so `2^40 bytes` is `(2^40) bytes`,
      // not `2^(40 bytes)`.
      const exponent = this.parseBareUnary();
      return { type: 'binary', op: '^', left: base, right: exponent };
    }
    return base;
  }

  // Like parseUnary but without unit juxtaposition (for `^` exponents).
  private parseBareUnary(): Node {
    const t = this.peek().type;
    if (t === 'minus' || t === 'plus') {
      this.advance();
      const operand = this.parseBareUnary();
      return { type: 'unary', op: t === 'minus' ? '-' : '+', operand };
    }
    return this.parsePower();
  }

  private parsePostfix(): Node {
    let node = this.parsePrimary();
    for (;;) {
      const t = this.peek().type;
      if (t === 'percent' && !this.isInfixPercent()) {
        this.advance();
        node = { type: 'percent', operand: node };
      } else if (t === 'bang') {
        this.advance();
        node = { type: 'factorial', operand: node };
      } else {
        return node;
      }
    }
  }

  private parsePrimary(): Node {
    const tok = this.peek();
    switch (tok.type) {
      case 'number':
        this.advance();
        return { type: 'number', value: tok.value };
      case 'date':
        this.advance();
        return { type: 'date', value: tok.value };
      case 'time':
        this.advance();
        return { type: 'time', value: tok.value };
      case 'ref':
        this.advance();
        return { type: 'ref', target: toRefTarget(tok.value) };
      case 'ident': {
        const name = tok.value;
        this.advance();
        if (this.peek().type === 'lparen') {
          return { type: 'call', name, args: this.parseArguments() };
        }
        if (lookupUnit(name)) return { type: 'unit', name };
        return { type: 'identifier', name };
      }
      case 'lparen': {
        this.advance();
        const inner = this.parseExpression();
        this.expect('rparen', ')');
        return inner;
      }
      default:
        throw new ParseError(
          tok.type === 'eof'
            ? 'Unexpected end of expression'
            : `Unexpected "${tok.value}"`,
          tok.start,
        );
    }
  }

  // unitExpr = unitFactor ( ("*"|"/") unitFactor )*   (only when a unit follows)
  private parseUnitExpr(): Node {
    let node = this.parseUnitFactor();
    for (;;) {
      const t = this.peek().type;
      if ((t === 'star' || t === 'slash') && this.unitFollowsOperator()) {
        this.advance();
        const right = this.parseUnitFactor();
        node = { type: 'binary', op: t === 'star' ? '*' : '/', left: node, right };
      } else {
        return node;
      }
    }
  }

  private parseUnitFactor(): Node {
    const tok = this.peek();
    let atom: Node;
    if (tok.type === 'lparen') {
      this.advance();
      atom = this.parseUnitExpr();
      this.expect('rparen', ')');
    } else if (tok.type === 'ident' && lookupUnit(tok.value)) {
      this.advance();
      atom = { type: 'unit', name: tok.value };
    } else {
      throw new ParseError(`Expected a unit, got "${tok.value}"`, tok.start);
    }
    if (this.peek().type === 'caret') {
      this.advance();
      atom = { type: 'binary', op: '^', left: atom, right: this.parseUnitPower() };
    }
    return atom;
  }

  private parseUnitPower(): Node {
    let negate = false;
    if (this.peek().type === 'minus') {
      this.advance();
      negate = true;
    } else if (this.peek().type === 'plus') {
      this.advance();
    }
    const tok = this.peek();
    if (tok.type !== 'number') {
      throw new ParseError(`Expected a unit exponent`, tok.start);
    }
    this.advance();
    const number: Node = { type: 'number', value: tok.value };
    return negate ? { type: 'unary', op: '-', operand: number } : number;
  }

  // "(" ( argument ("," argument)* )? ")"
  private parseArguments(): Node[] {
    this.expect('lparen', '(');
    const args: Node[] = [];
    if (this.peek().type !== 'rparen') {
      args.push(this.parseArgument());
      while (this.peek().type === 'comma') {
        this.advance();
        args.push(this.parseArgument());
      }
    }
    this.expect('rparen', ')');
    return args;
  }

  // argument = expression | ref ".." ref   (a range like $1..$5, ids only)
  private parseArgument(): Node {
    const expr = this.parseExpression();
    if (this.peek().type !== 'dotdot') return expr;
    const at = this.peek().start;
    this.advance();
    const upper = this.parseExpression();
    const from = asIdRef(expr);
    const to = asIdRef(upper);
    if (from === null || to === null) {
      throw new ParseError('A range must be between two row ids, e.g. $1..$5', at);
    }
    return { type: 'range', from, to };
  }

  /** True when the next token begins a unit (for juxtaposition). */
  private nextIsUnit(): boolean {
    const tok = this.peek();
    if (tok.type !== 'ident') return false;
    if (CONVERSION_KEYWORDS.has(tok.value)) return false;
    if (this.tokens[this.pos + 1]?.type === 'lparen') return false; // function call
    return lookupUnit(tok.value) !== null;
  }

  /** True when a unit follows the operator at the cursor (for `*`/`/` in units). */
  private unitFollowsOperator(): boolean {
    const next = this.tokens[this.pos + 1];
    if (!next) return false;
    if (next.type === 'lparen') return true;
    return next.type === 'ident' && lookupUnit(next.value) !== null;
  }

  /** True when the `%` at the cursor is infix modulo (an operand follows it). */
  private isInfixPercent(): boolean {
    const next = this.tokens[this.pos + 1];
    return next !== undefined && OPERAND_START.has(next.type);
  }

  private peek(): Token {
    return this.tokens[this.pos]!;
  }

  private advance(): Token {
    return this.tokens[this.pos++]!;
  }

  private expect(type: TokenType, display: string): void {
    const tok = this.peek();
    if (tok.type !== type) {
      throw new ParseError(`Expected "${display}"`, tok.start);
    }
    this.advance();
  }
}

/** The row id if `node` is a `$id` reference, else null (names have no order). */
function asIdRef(node: Node): number | null {
  return node.type === 'ref' && node.target.kind === 'id' ? node.target.id : null;
}

function toRefTarget(body: string): RefTarget {
  if (/^\d+$/.test(body)) {
    return { kind: 'id', id: Number(body) };
  }
  return { kind: 'name', name: body };
}
