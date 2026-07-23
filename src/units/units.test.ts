import { describe, it, expect } from 'vitest';
import { Num } from '../num/index.ts';
import { Quantity, UnitError, lookupUnit } from './index.ts';

function unit(name: string) {
  const u = lookupUnit(name);
  if (!u) throw new Error(`no unit ${name}`);
  return u;
}
const q = (value: string, name: string) =>
  Quantity.fromUnit(Num.of(value), unit(name));
/** Build a (compound) unit quantity of magnitude 1, e.g. km/h = km ÷ h. */
const perHour = (name: string) =>
  Quantity.fromUnit(Num.ONE, unit(name)).div(Quantity.fromUnit(Num.ONE, unit('h')));

describe('Quantity display', () => {
  it('renders a value with its unit', () => {
    expect(q('5', 'km').toDisplay()).toBe('5 km');
    expect(q('30', 'cm').toDisplay()).toBe('30 cm');
  });

  it('renders currency with a prefix symbol', () => {
    expect(q('40', '£').toDisplay()).toBe('£40');
    expect(q('40', 'USD').toDisplay()).toBe('40 USD');
  });
});

describe('Quantity arithmetic', () => {
  it('adds compatible units, keeping the left unit', () => {
    expect(q('5', 'km').add(q('300', 'm')).toDisplay()).toBe('5.3 km');
  });

  it('rejects adding incompatible dimensions', () => {
    expect(() => q('5', 'km').add(q('3', 'kg'))).toThrow(UnitError);
  });

  it('keeps the unit through scalar multiplication', () => {
    expect(Quantity.scalar(Num.of('3')).mul(q('5', 'km')).toDisplay()).toBe('15 km');
    expect(q('40', '£').mul(Quantity.scalar(Num.of('1.2'))).toDisplay()).toBe('£48');
  });

  it('powers produce a ^ label', () => {
    expect(q('2', 'm').pow(Num.of('2')).toDisplay()).toBe('4 m^2');
  });
});

describe('Quantity conversion', () => {
  it('converts length', () => {
    expect(q('5', 'km').convertTo(q('1', 'm')).toDisplay()).toBe('5000 m');
    expect(q('30', 'cm').convertTo(q('1', 'inch')).toDisplay()).toBe('11.811023622 in');
  });

  it('converts speed to a compound unit', () => {
    expect(q('50', 'mph').convertTo(perHour('km')).toDisplay()).toBe('80.4672 km/h');
  });

  it('converts temperature (affine)', () => {
    expect(q('20', 'C').convertTo(q('1', 'F')).toDisplay()).toBe('68 °F');
    expect(q('100', 'C').convertTo(q('1', 'K')).toDisplay()).toBe('373.15 K');
  });

  it('rejects converting between dimensions', () => {
    expect(() => q('5', 'km').convertTo(q('1', 'kg'))).toThrow(UnitError);
  });
});

describe('angles are dimensionless', () => {
  it('90 degrees is π/2 as a scalar', () => {
    const scalar = q('90', 'deg').asScalar();
    expect(scalar).not.toBeNull();
    expect(scalar!.toDisplay()).toBe('1.57079632679');
  });
});
