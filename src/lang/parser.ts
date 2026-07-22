import type { Node, RefTarget } from './ast.ts';
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

  // additive = multiplicative ( ("+"|"-") multiplicative )*
  private parseExpression(): Node {
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

  // multiplicative = unary ( ("*"|"/"|"%"mod) unary )*
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

  // unary = ("-"|"+") unary | power
  private parseUnary(): Node {
    const t = this.peek().type;
    if (t === 'minus' || t === 'plus') {
      this.advance();
      const operand = this.parseUnary();
      return { type: 'unary', op: t === 'minus' ? '-' : '+', operand };
    }
    return this.parsePower();
  }

  // power = postfix ("^" unary)?   (right-associative via unary exponent)
  private parsePower(): Node {
    const base = this.parsePostfix();
    if (this.peek().type === 'caret') {
      this.advance();
      const exponent = this.parseUnary();
      return { type: 'binary', op: '^', left: base, right: exponent };
    }
    return base;
  }

  // postfix = primary "%"*   (percent only; mod is handled in multiplicative)
  private parsePostfix(): Node {
    let node = this.parsePrimary();
    while (this.peek().type === 'percent' && !this.isInfixPercent()) {
      this.advance();
      node = { type: 'percent', operand: node };
    }
    return node;
  }

  private parsePrimary(): Node {
    const tok = this.peek();
    switch (tok.type) {
      case 'number':
        this.advance();
        return { type: 'number', value: tok.value };
      case 'ref':
        this.advance();
        return { type: 'ref', target: toRefTarget(tok.value) };
      case 'ident': {
        this.advance();
        if (this.peek().type === 'lparen') {
          return { type: 'call', name: tok.value, args: this.parseArguments() };
        }
        return { type: 'identifier', name: tok.value };
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

  // "(" ( expression ("," expression)* )? ")"
  private parseArguments(): Node[] {
    this.expect('lparen', '(');
    const args: Node[] = [];
    if (this.peek().type !== 'rparen') {
      args.push(this.parseExpression());
      while (this.peek().type === 'comma') {
        this.advance();
        args.push(this.parseExpression());
      }
    }
    this.expect('rparen', ')');
    return args;
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

function toRefTarget(body: string): RefTarget {
  if (/^\d+$/.test(body)) {
    return { kind: 'id', id: Number(body) };
  }
  return { kind: 'name', name: body };
}
