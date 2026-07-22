import { describe, it, expect } from 'vitest';
import { parse } from '../lang/index.ts';
import { Num } from '../num/index.ts';
import { evaluate } from './evaluate.ts';
import { EvalError } from './errors.ts';

/** Parse + evaluate `src`, resolving refs from the given id/name maps. */
function run(
  src: string,
  ids: Record<number, string> = {},
  names: Record<string, string> = {},
): string {
  const result = evaluate(parse(src), (target) => {
    const raw =
      target.kind === 'id' ? ids[target.id] : names[target.name];
    if (raw === undefined) {
      throw new EvalError('#ref!', 'ref');
    }
    return Num.of(raw);
  });
  return result.toDisplay();
}

describe('evaluate: arithmetic & operators', () => {
  it('respects precedence', () => {
    expect(run('1 + 2 * 3')).toBe('7');
    expect(run('(1 + 2) * 3')).toBe('9');
    expect(run('-2 ^ 2')).toBe('-4');
    expect(run('2 ^ 3 ^ 2')).toBe('512');
  });

  it('percent and modulo', () => {
    expect(run('10%')).toBe('0.1');
    expect(run('200 + 10%')).toBe('200.1');
    expect(run('50% * 200')).toBe('100');
    expect(run('10 % 3')).toBe('1');
  });

  it('decimal correctness end to end', () => {
    expect(run('0.1 + 0.2')).toBe('0.3');
  });

  it('factorial', () => {
    expect(run('5!')).toBe('120');
    expect(run('0!')).toBe('1');
    expect(run('3! + 1')).toBe('7');
    expect(run('sqrt(4)!')).toBe('2');
    expect(() => run('(-1)!')).toThrow(/non-negative integer/);
    expect(() => run('2.5!')).toThrow(/non-negative integer/);
  });
});

describe('evaluate: constants & functions', () => {
  it('constants', () => {
    expect(run('pi').startsWith('3.14159')).toBe(true);
    expect(run('e').startsWith('2.71828')).toBe(true);
  });

  it('functions', () => {
    expect(run('sqrt(9)')).toBe('3');
    expect(run('sin(0)')).toBe('0');
    expect(run('abs(-5)')).toBe('5');
    expect(run('floor(3.7)')).toBe('3');
    expect(run('ceil(3.2)')).toBe('4');
    expect(run('round(3.14159, 2)')).toBe('3.14');
    expect(run('log(1000)')).toBe('3');
    expect(run('min(3, 1, 2)')).toBe('1');
    expect(run('max(3, 1, 2)')).toBe('3');
    expect(run('2 * sqrt(16) + 1')).toBe('9');
  });
});

describe('evaluate: references', () => {
  it('resolves references by id and name', () => {
    expect(run('$1 + $2', { 1: '10', 2: '5' })).toBe('15');
    expect(run('$total * 2', {}, { total: '21' })).toBe('42');
    expect(run('$1 * 10%', { 1: '200' })).toBe('20');
  });

  it('a missing reference is a dangling-ref error', () => {
    try {
      run('$9 + 1');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(EvalError);
      expect((err as EvalError).kind).toBe('ref');
    }
  });
});

describe('evaluate: error handling', () => {
  it('division and modulo by zero', () => {
    expect(() => run('1 / 0')).toThrow(EvalError);
    expect(() => run('5 % 0')).toThrow(EvalError);
  });

  it('unknown identifier and function', () => {
    expect(() => run('foo + 1')).toThrow(/Unknown identifier/);
    expect(() => run('bar(2)')).toThrow(/Unknown function/);
  });

  it('wrong arity', () => {
    expect(() => run('sin(1, 2)')).toThrow(/expects/);
    expect(() => run('max()')).toThrow(EvalError);
  });

  it('non-finite results are rejected', () => {
    expect(() => run('sqrt(-1)')).toThrow(EvalError);
    expect(() => run('ln(-1)')).toThrow(EvalError);
  });
});
