import { describe, it, expect } from 'vitest';
import { sourceToLatex } from './latex.ts';

const tex = (src: string) => sourceToLatex(src);

describe('astToLatex', () => {
  it('renders basic arithmetic with correct spacing', () => {
    expect(tex('1 + 2')).toBe('1 + 2');
    expect(tex('2 * 3')).toBe('2 \\times 3');
  });

  it('renders division as a stacked fraction', () => {
    expect(tex('1 / 3')).toBe('\\frac{1}{3}');
    expect(tex('(1 + 2) / 3')).toBe('\\frac{1 + 2}{3}'); // frac bar groups
  });

  it('renders powers as superscripts', () => {
    expect(tex('2 ^ 3')).toBe('2^{3}');
    expect(tex('(1 + 2) ^ 3')).toBe('\\left(1 + 2\\right)^{3}');
  });

  it('inserts parentheses only where precedence requires', () => {
    expect(tex('1 + 2 * 3')).toBe('1 + 2 \\times 3');
    expect(tex('(1 + 2) * 3')).toBe('\\left(1 + 2\\right) \\times 3');
    expect(tex('1 - (2 - 3)')).toBe('1 - \\left(2 - 3\\right)');
  });

  it('renders functions, sqrt and abs', () => {
    expect(tex('sin(pi)')).toBe('\\sin\\left(\\pi\\right)');
    expect(tex('sqrt(9)')).toBe('\\sqrt{9}');
    expect(tex('abs(-5)')).toBe('\\left|-5\\right|');
    expect(tex('min(1, 2)')).toBe('\\operatorname{min}\\left(1, 2\\right)');
  });

  it('renders percent and modulo', () => {
    expect(tex('10%')).toBe('10\\%');
    expect(tex('10 % 3')).toBe('10 \\bmod 3');
  });

  it('renders factorial', () => {
    expect(tex('5!')).toBe('5!');
    expect(tex('(3 + 2)!')).toBe('\\left(3 + 2\\right)!');
  });

  it('renders references as styled chips/variables, escaping names', () => {
    expect(tex('$3 + 1')).toBe('\\htmlClass{acalc-ref}{3} + 1');
    expect(tex('$net_total')).toBe('\\htmlClass{acalc-var}{\\mathit{net\\_total}}');
  });

  it('returns null for unparseable input', () => {
    expect(tex('1 +')).toBeNull();
  });
});
