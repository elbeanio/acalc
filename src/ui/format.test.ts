import { describe, it, expect } from 'vitest';
import { parse } from '../lang/index.ts';
import { evaluate } from '../eval/evaluate.ts';
import { copyText } from './format.ts';

const copy = (src: string) =>
  copyText(
    evaluate(parse(src), () => {
      throw new Error('no references in these tests');
    }),
  );

describe('copyText (clipboard value)', () => {
  it('copies the displayed value (12 SF), not raw internal precision', () => {
    expect(copy('1 / 2rad to deg')).toBe('28.6478897565deg');
  });

  it('does not leak rounding noise from affine conversions', () => {
    // toString() would give 68.000…03; the 12-SF display is exactly 68.
    expect(copy('20°C in °F')).toBe('68F');
  });

  it('keeps ASCII unit labels', () => {
    expect(copy('5 km')).toBe('5km');
    expect(copy('2 m * 3 m')).toBe('6m^2');
    expect(copy('60 km / 2 h')).toBe('30km/h');
  });

  it('transliterates non-ASCII glyphs to ASCII (° → deg, °C/°F → C/F)', () => {
    expect(copy('100°C')).toBe('100C');
    expect(copy('68°F')).toBe('68F');
    expect(copy('pi in deg')).toBe('180deg');
  });

  it('leaves a plain number bare so it pastes as a number', () => {
    expect(copy('1 / 2rad')).toBe('0.5');
    expect(copy('2 + 2')).toBe('4');
  });
});
