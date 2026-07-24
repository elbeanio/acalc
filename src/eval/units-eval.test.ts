import { describe, it, expect } from 'vitest';
import { parse } from '../lang/index.ts';
import { evaluate } from './evaluate.ts';

const run = (src: string) =>
  evaluate(parse(src), () => {
    throw new Error('no references in these tests');
  }).toDisplay();

describe('units: quantities and arithmetic', () => {
  it('a value with a unit', () => {
    expect(run('5 km')).toBe('5km');
    expect(run('30 cm')).toBe('30cm');
    expect(run('100°C')).toBe('100°C');
  });

  it('adds compatible units, keeping the left unit', () => {
    expect(run('5 km + 300 m')).toBe('5.3km');
    expect(run('1 h + 30 min')).toBe('1.5 hours');
  });

  it('scalar multiplication keeps the unit', () => {
    expect(run('2 * 5 km')).toBe('10km');
    expect(run('40 GBP * 1.2')).toBe('48GBP');
  });

  it('compound units', () => {
    expect(run('10 m / s')).toBe('10m/s');
    expect(run('5 km/h')).toBe('5km/h');
  });

  it('powers of units', () => {
    expect(run('(2 m)^2')).toBe('4m^2');
    expect(run('sqrt(16 m^2)')).toBe('4m');
  });

  it('collapses like units into powers (m·m → m^2)', () => {
    expect(run('2 m * 3 m')).toBe('6m^2');
    expect(run('60 km / 2 h')).toBe('30km/h');
  });

  it('a unit attaches after a power or a constant', () => {
    expect(run('2^10 bytes')).toBe('1024B');
    expect(run('pi rad')).toBe('3.14159265359rad');
  });

  it('rejects incompatible dimensions', () => {
    expect(() => run('5 km + 3 kg')).toThrow(/Cannot add/);
  });
});

describe('compound quantities (juxtaposition sums)', () => {
  it('adds juxtaposed same-dimension quantities', () => {
    expect(run('2h 30min')).toBe('2.5 hours');
    expect(run('5ft 3inch')).toBe('5.25ft');
    expect(run('1kg 200g')).toBe('1.2kg');
  });

  it('errors on mismatched dimensions (m is metres, not minutes)', () => {
    expect(() => run('2h 30m')).toThrow(/add/i);
  });
});

describe('number bases', () => {
  it('parses radix literals', () => {
    expect(run('0xFF')).toBe('255');
    expect(run('0b1010')).toBe('10');
    expect(run('0o777')).toBe('511');
    expect(run('0xFF + 1')).toBe('256');
  });

  it('displays a value in a base via to / in', () => {
    expect(run('255 to hex')).toBe('0xff');
    expect(run('255 in hex')).toBe('0xff');
    expect(run('10 to binary')).toBe('0b1010');
    expect(run('511 to oct')).toBe('0o777');
    expect(run('0xFF to bin')).toBe('0b11111111');
    expect(run('0xFF to dec')).toBe('255'); // back to plain decimal
  });

  it('base conversion needs a whole, unitless number', () => {
    expect(() => run('1.5 to hex')).toThrow(/whole number/);
    expect(() => run('5 km to hex')).toThrow(/plain number/);
  });
});

describe('aggregate functions', () => {
  it('sum, product, avg, mean, count over plain args', () => {
    expect(run('sum(1, 2, 3)')).toBe('6');
    expect(run('product(2, 3, 4)')).toBe('24');
    expect(run('avg(2, 4, 6)')).toBe('4');
    expect(run('mean(10, 20)')).toBe('15');
    expect(run('count(5, 5, 5)')).toBe('3');
  });

  it('aggregates carry a shared unit', () => {
    expect(run('sum(5 km, 300 m)')).toBe('5.3km');
    expect(run('avg(10 kg, 20 kg)')).toBe('15kg');
  });

  it('rejects aggregating incompatible units', () => {
    expect(() => run('sum(5 km, 3 kg)')).toThrow();
  });
});

describe('units: conversion (to / in)', () => {
  it('length', () => {
    expect(run('5 km in m')).toBe('5000m');
    expect(run('30 cm in inches')).toBe('11.811023622in');
    expect(run('1 mile to km')).toBe('1.609344km');
  });

  it('speed to a compound unit', () => {
    expect(run('50 mph in km/h')).toBe('80.4672km/h');
  });

  it('time', () => {
    expect(run('1 hour in minutes')).toBe('60 minutes');
    expect(run('1 day to hours')).toBe('24 hours');
  });

  it('temperature (affine), with lowercase aliases', () => {
    expect(run('20°C in °F')).toBe('68°F');
    expect(run('20c in f')).toBe('68°F');
    expect(run('20c in k')).toBe('293.15K');
    expect(run('100 C to K')).toBe('373.15K');
  });

  it('rejects adding two absolute temperatures, but allows intervals', () => {
    expect(() => run('20°C + 5°C')).toThrow(/add two temperatures/);
    expect(() => run('20c + 5c')).toThrow(/add two temperatures/);
    expect(run('20°C + 5K')).toBe('25°C'); // adding a kelvin interval is fine
    expect(run('5K + 3K')).toBe('8K');
  });

  it('digital storage', () => {
    expect(run('1 GB in MB')).toBe('1000MB');
    expect(run('1 GiB in MB')).toBe('1073.741824MB');
  });

  it('currency (static rates), postfix codes only', () => {
    expect(run('100 USD in GBP')).toBe('79GBP');
    expect(run('40 EUR')).toBe('40EUR');
  });

  it('rejects converting between dimensions', () => {
    expect(() => run('5 km in kg')).toThrow(/Cannot convert/);
    expect(() => run('(20 km * 40 miles) in feet')).toThrow(/Cannot convert/);
  });
});

describe('units: amounts do not square', () => {
  it('rejects a square gigabyte / square money / square temperature', () => {
    expect(() => run('2 GB * 3 GB')).toThrow(/meaningful/);
    expect(() => run('5 GBP * 2 GBP')).toThrow(/meaningful/);
    expect(() => run('20c * 20c')).toThrow(/meaningful/);
  });

  it('but rates and scaling are fine', () => {
    expect(run('100 MB / s')).toBe('100MB/s');
    expect(run('20 GB / 4')).toBe('5GB');
  });
});

describe('units: angles', () => {
  it('degrees work in trig', () => {
    expect(run('sin(90 deg)')).toBe('1');
    expect(run('cos(180 deg)')).toBe('-1');
  });

  it('convert radians to degrees', () => {
    expect(run('pi in deg')).toBe('180°');
  });
});
