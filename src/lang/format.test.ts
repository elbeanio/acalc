import { describe, it, expect } from 'vitest';
import { formatSource } from './format.ts';

const fmt = (src: string) => formatSource(src);

describe('formatSource (canonical reformatting)', () => {
  it('adds consistent spacing around operators', () => {
    expect(fmt('4*(4+4)')).toBe('4 * (4 + 4)');
    expect(fmt('1+2*3')).toBe('1 + 2 * 3');
    expect(fmt('$1*$cats')).toBe('$1 * $cats');
  });

  it('keeps unary, percent and calls tight', () => {
    expect(fmt('-2^2')).toBe('-2 ^ 2');
    expect(fmt('10%')).toBe('10%');
    expect(fmt('10%3')).toBe('10 % 3');
    expect(fmt('min(1,2,3)')).toBe('min(1, 2, 3)');
  });

  it('preserves meaning with minimal parentheses', () => {
    expect(fmt('1-2-3')).toBe('1 - 2 - 3');
    expect(fmt('1-(2-3)')).toBe('1 - (2 - 3)');
    expect(fmt('1/2*3')).toBe('1 / 2 * 3');
    expect(fmt('1/(2*3)')).toBe('1 / (2 * 3)'); // division isn't associative
    expect(fmt('2^3^2')).toBe('2 ^ 3 ^ 2'); // right-associative, no parens
  });

  it('is idempotent', () => {
    const once = fmt('4*(4+4)')!;
    expect(fmt(once)).toBe(once);
  });

  it('returns null for unparseable input', () => {
    expect(fmt('1 +')).toBeNull();
  });
});
