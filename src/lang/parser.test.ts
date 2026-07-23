import { describe, it, expect } from 'vitest';
import { parse } from './parser.ts';
import type { Node } from './ast.ts';
import { ParseError } from './errors.ts';

/** Compact s-expression rendering of an AST for structural assertions. */
function sexpr(node: Node): string {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'identifier':
      return node.name;
    case 'ref':
      return node.target.kind === 'id'
        ? `$${node.target.id}`
        : `$${node.target.name}`;
    case 'unary':
      return `(${node.op} ${sexpr(node.operand)})`;
    case 'binary':
      return `(${node.op === '%' ? 'mod' : node.op} ${sexpr(node.left)} ${sexpr(node.right)})`;
    case 'percent':
      return `(pct ${sexpr(node.operand)})`;
    case 'factorial':
      return `(fact ${sexpr(node.operand)})`;
    case 'call':
      return `(${node.name}${node.args.map((a) => ' ' + sexpr(a)).join('')})`;
    case 'unit':
      return node.name;
    case 'quantity':
      return `(qty ${sexpr(node.value)} ${sexpr(node.unit)})`;
    case 'convert':
      return `(conv ${sexpr(node.value)} ${sexpr(node.unit)})`;
  }
}

const sx = (src: string) => sexpr(parse(src));

describe('parser precedence & associativity', () => {
  it('multiplication binds tighter than addition', () => {
    expect(sx('1 + 2 * 3')).toBe('(+ 1 (* 2 3))');
    expect(sx('2 * 3 + 1')).toBe('(+ (* 2 3) 1)');
  });

  it('additive and multiplicative are left-associative', () => {
    expect(sx('1 - 2 - 3')).toBe('(- (- 1 2) 3)');
    expect(sx('8 / 4 / 2')).toBe('(/ (/ 8 4) 2)');
  });

  it('power is right-associative and binds tighter than unary minus', () => {
    expect(sx('2 ^ 3 ^ 2')).toBe('(^ 2 (^ 3 2))');
    expect(sx('-2 ^ 2')).toBe('(- (^ 2 2))');
    expect(sx('2 ^ -3')).toBe('(^ 2 (- 3))');
  });

  it('handles chained unary operators', () => {
    expect(sx('--5')).toBe('(- (- 5))');
    expect(sx('-+-5')).toBe('(- (+ (- 5)))');
  });

  it('respects parentheses', () => {
    expect(sx('(1 + 2) * 3')).toBe('(* (+ 1 2) 3)');
  });
});

describe('parser: the two meanings of %', () => {
  it('postfix percent', () => {
    expect(sx('10%')).toBe('(pct 10)');
    expect(sx('200 + 10%')).toBe('(+ 200 (pct 10))');
  });

  it('infix modulo when an operand follows', () => {
    expect(sx('10 % 3')).toBe('(mod 10 3)');
    expect(sx('2 * 3 % 4')).toBe('(mod (* 2 3) 4)');
  });

  it('a leading-minus right operand reads as percent-then-subtract', () => {
    expect(sx('10 % -3')).toBe('(- (pct 10) 3)');
    expect(sx('10 % (-3)')).toBe('(mod 10 (- 3))');
  });
});

describe('parser: factorial', () => {
  it('parses postfix factorial', () => {
    expect(sx('5!')).toBe('(fact 5)');
    expect(sx('(3 + 2)!')).toBe('(fact (+ 3 2))');
    expect(sx('5!%')).toBe('(pct (fact 5))');
    expect(sx('2 * 3!')).toBe('(* 2 (fact 3))');
  });
});

describe('parser: references, identifiers, calls', () => {
  it('parses references by id and name', () => {
    expect(sx('$3 + $total')).toBe('(+ $3 $total)');
  });

  it('parses constants and function calls', () => {
    expect(sx('sin(pi)')).toBe('(sin pi)');
    expect(sx('min(1, 2, 3)')).toBe('(min 1 2 3)');
    expect(sx('max()')).toBe('(max)');
    expect(sx('2 * sqrt(9)')).toBe('(* 2 (sqrt 9))');
  });
});

describe('parser: units', () => {
  it('juxtaposition and compound units', () => {
    expect(sx('5 km')).toBe('(qty 5 km)');
    expect(sx('10 m/s')).toBe('(qty 10 (/ m s))');
    expect(sx('20°C')).toBe('(qty 20 °C)');
    expect(sx('2 m^2')).toBe('(qty 2 (^ m 2))');
  });

  it('conversion with to / in', () => {
    expect(sx('50 mph in km/h')).toBe('(conv (qty 50 mph) (/ km h))');
    expect(sx('5 km to m')).toBe('(conv (qty 5 km) m)');
  });

  it('currency is postfix (no prefix — $ is the ref sigil)', () => {
    expect(sx('40 GBP')).toBe('(qty 40 GBP)');
    expect(sx('40£')).toBe('(qty 40 £)');
  });

  it('a number times a bare unit still parses', () => {
    expect(sx('5 km / 2')).toBe('(/ (qty 5 km) 2)');
  });

  it('a unit after a power attaches to the whole power', () => {
    expect(sx('2^40 bytes')).toBe('(qty (^ 2 40) bytes)');
  });
});

describe('parser error handling', () => {
  it('rejects empty input', () => {
    expect(() => parse('')).toThrow(ParseError);
    expect(() => parse('   ')).toThrow(ParseError);
  });

  it('rejects incomplete expressions', () => {
    expect(() => parse('1 +')).toThrow(ParseError);
    expect(() => parse('sin(')).toThrow(ParseError);
  });

  it('rejects unbalanced parentheses', () => {
    expect(() => parse('(1 + 2')).toThrow(ParseError);
  });

  it('rejects trailing tokens', () => {
    expect(() => parse('1 2')).toThrow(ParseError);
  });

  it('reports the error position', () => {
    try {
      parse('1 + @');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError);
      expect((err as ParseError).position).toBe(4);
    }
  });
});
