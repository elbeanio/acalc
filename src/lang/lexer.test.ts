import { describe, it, expect } from 'vitest';
import { tokenize } from './lexer.ts';
import { ParseError } from './errors.ts';

const types = (src: string) => tokenize(src).map((t) => t.type);

describe('lexer', () => {
  it('tokenises numbers including decimals, leading-dot and exponents', () => {
    expect(tokenize('42')[0]).toMatchObject({ type: 'number', value: '42' });
    expect(tokenize('3.14')[0]).toMatchObject({ value: '3.14' });
    expect(tokenize('.5')[0]).toMatchObject({ value: '.5' });
    expect(tokenize('1.5e-3')[0]).toMatchObject({ value: '1.5e-3' });
  });

  it('tokenises radix literals (hex / binary / octal)', () => {
    expect(tokenize('0xFF')[0]).toMatchObject({ type: 'number', value: '0xFF' });
    expect(tokenize('0b1010')[0]).toMatchObject({ type: 'number', value: '0b1010' });
    expect(tokenize('0o777')[0]).toMatchObject({ type: 'number', value: '0o777' });
    // A plain 0 / decimal is unaffected.
    expect(tokenize('0.5')[0]).toMatchObject({ value: '0.5' });
    expect(types('0 + 1')).toEqual(['number', 'plus', 'number', 'eof']);
  });

  it('tokenises the range operator `..`', () => {
    expect(types('$1..$5')).toEqual(['ref', 'dotdot', 'ref', 'eof']);
  });

  it('tokenises references by id and by name', () => {
    expect(tokenize('$3')[0]).toMatchObject({ type: 'ref', value: '3' });
    expect(tokenize('$total')[0]).toMatchObject({ type: 'ref', value: 'total' });
  });

  it('tokenises identifiers and operators', () => {
    expect(types('sin(x) + 2')).toEqual([
      'ident',
      'lparen',
      'ident',
      'rparen',
      'plus',
      'number',
      'eof',
    ]);
  });

  it('accepts unicode operator aliases', () => {
    expect(types('2 × 3 ÷ 4 − 1')).toEqual([
      'number',
      'star',
      'number',
      'slash',
      'number',
      'minus',
      'number',
      'eof',
    ]);
  });

  it('tokenises postfix factorial', () => {
    expect(types('5!')).toEqual(['number', 'bang', 'eof']);
  });

  it('records token start positions', () => {
    const [a, b] = tokenize('12 + 3');
    expect(a?.start).toBe(0);
    expect(b?.start).toBe(3);
  });

  it('rejects a bare "$"', () => {
    expect(() => tokenize('$ + 1')).toThrow(ParseError);
  });

  it('rejects unexpected characters', () => {
    expect(() => tokenize('2 & 3')).toThrow(ParseError);
  });
});
