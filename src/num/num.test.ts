import { describe, it, expect } from 'vitest';
import { Num } from './num.ts';

describe('Num arithmetic (decimal-correct, no floating point)', () => {
  it('adds without floating-point error', () => {
    // The canonical reason this app exists: 0.1 + 0.2 must be exactly 0.3.
    expect(Num.of('0.1').add(Num.of('0.2')).toString()).toBe('0.3');
  });

  it('subtracts, multiplies and divides exactly where the result is exact', () => {
    expect(Num.of('0.3').sub(Num.of('0.1')).toString()).toBe('0.2');
    expect(Num.of('1.1').mul(Num.of('3')).toString()).toBe('3.3');
    expect(Num.of('6').div(Num.of('2')).toString()).toBe('3');
  });

  it('carries high internal precision for repeating decimals', () => {
    expect(Num.of('1').div(Num.of('3')).toDisplay(12)).toBe('0.333333333333');
  });

  it('computes integer and fractional powers', () => {
    expect(Num.of('2').pow(Num.of('10')).toString()).toBe('1024');
    expect(Num.of('2').pow(Num.of('0.5')).toDisplay(12)).toBe(
      Num.of('2').sqrt().toDisplay(12),
    );
  });

  it('implements modulo', () => {
    expect(Num.of('10').mod(Num.of('3')).toString()).toBe('1');
    expect(Num.of('10').mod(Num.of('2')).toString()).toBe('0');
  });

  it('negates and takes absolute value', () => {
    expect(Num.of('5').neg().toString()).toBe('-5');
    expect(Num.of('-5').abs().toString()).toBe('5');
  });
});

describe('Num transcendental functions', () => {
  it('roots and squares round-trip', () => {
    expect(Num.of('2').sqrt().toDisplay(12)).toBe('1.41421356237');
    expect(Num.of('2').sqrt().pow(Num.of('2')).toDisplay(12)).toBe('2');
  });

  it('exp / ln are inverses', () => {
    expect(Num.of('0').exp().toString()).toBe('1');
    expect(Num.of('1').exp().ln().toDisplay(12)).toBe('1');
  });

  it('log defaults to base 10', () => {
    expect(Num.of('1000').log().toDisplay(12)).toBe('3');
    expect(Num.of('8').log(2).toDisplay(12)).toBe('3');
  });

  it('trig functions at known angles', () => {
    expect(Num.of('0').sin().toString()).toBe('0');
    expect(Num.of('0').cos().toString()).toBe('1');
    expect(Num.pi().div(Num.of('2')).sin().toDisplay(12)).toBe('1');
  });

  it('exposes pi and e to precision', () => {
    expect(Num.pi().toDisplay(6)).toBe('3.14159');
    expect(Num.e().toDisplay(6)).toBe('2.71828');
  });
});

describe('Num comparison and predicates', () => {
  it('compares values', () => {
    expect(Num.of('1').cmp(Num.of('2'))).toBe(-1);
    expect(Num.of('2').cmp(Num.of('2'))).toBe(0);
    expect(Num.of('3').cmp(Num.of('2'))).toBe(1);
    expect(Num.of('2').eq(Num.of('2.0'))).toBe(true);
    expect(Num.of('1').lt(Num.of('2'))).toBe(true);
    expect(Num.of('3').gt(Num.of('2'))).toBe(true);
  });

  it('reports zero / sign / integer-ness', () => {
    expect(Num.ZERO.isZero()).toBe(true);
    expect(Num.of('-1').isNegative()).toBe(true);
    expect(Num.of('4').isInteger()).toBe(true);
    expect(Num.of('4.5').isInteger()).toBe(false);
  });

  it('min and max', () => {
    expect(Num.min(Num.of('3'), Num.of('1'), Num.of('2')).toString()).toBe('1');
    expect(Num.max(Num.of('3'), Num.of('1'), Num.of('2')).toString()).toBe('3');
  });
});

describe('Num non-finite handling', () => {
  it('division by zero is non-finite rather than throwing', () => {
    const result = Num.of('1').div(Num.ZERO);
    expect(result.isFinite()).toBe(false);
    expect(result.isNaN()).toBe(false);
  });

  it('zero divided by zero is NaN', () => {
    expect(Num.ZERO.div(Num.ZERO).isNaN()).toBe(true);
  });
});

describe('Num display formatting', () => {
  it('trims trailing zeros', () => {
    expect(Num.of('1.5000').toDisplay()).toBe('1.5');
    expect(Num.of('42').toDisplay()).toBe('42');
  });

  it('rounds to 12 significant figures by default', () => {
    expect(Num.of('2').div(Num.of('3')).toDisplay()).toBe('0.666666666667');
  });
});
