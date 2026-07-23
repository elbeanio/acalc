import { describe, it, expect } from 'vitest';
import { parse } from '../lang/index.ts';
import { evaluate } from './evaluate.ts';

const run = (src: string) =>
  evaluate(parse(src), () => {
    throw new Error('no references in these tests');
  }).toDisplay();

describe('units: quantities and arithmetic', () => {
  it('a value with a unit', () => {
    expect(run('5 km')).toBe('5 km');
    expect(run('30 cm')).toBe('30 cm');
    expect(run('100°C')).toBe('100 °C');
  });

  it('adds compatible units, keeping the left unit', () => {
    expect(run('5 km + 300 m')).toBe('5.3 km');
    expect(run('1 h + 30 min')).toBe('1.5 h');
  });

  it('scalar multiplication keeps the unit', () => {
    expect(run('2 * 5 km')).toBe('10 km');
    expect(run('£40 * 1.2')).toBe('£48');
  });

  it('compound units', () => {
    expect(run('10 m / s')).toBe('10 m/s');
    expect(run('5 km/h')).toBe('5 km/h');
  });

  it('powers of units', () => {
    expect(run('(2 m)^2')).toBe('4 m^2');
    expect(run('sqrt(16 m^2)')).toBe('4 m');
  });

  it('rejects incompatible dimensions', () => {
    expect(() => run('5 km + 3 kg')).toThrow(/Cannot add/);
  });
});

describe('units: conversion (to / in)', () => {
  it('length', () => {
    expect(run('5 km in m')).toBe('5000 m');
    expect(run('30 cm in inches')).toBe('11.811023622 in');
    expect(run('1 mile to km')).toBe('1.609344 km');
  });

  it('speed to a compound unit', () => {
    expect(run('50 mph in km/h')).toBe('80.4672 km/h');
  });

  it('time', () => {
    expect(run('1 hour in minutes')).toBe('60 min');
    expect(run('1 day to hours')).toBe('24 h');
  });

  it('temperature (affine)', () => {
    expect(run('20°C in °F')).toBe('68 °F');
    expect(run('100 C to K')).toBe('373.15 K');
  });

  it('digital storage', () => {
    expect(run('1 GB in MB')).toBe('1000 MB');
    expect(run('1 GiB in MB')).toBe('1073.741824 MB');
  });

  it('currency (static rates)', () => {
    expect(run('100 USD in GBP')).toBe('£79');
  });

  it('rejects converting between dimensions', () => {
    expect(() => run('5 km in kg')).toThrow(/Cannot convert/);
  });
});

describe('units: angles', () => {
  it('degrees work in trig', () => {
    expect(run('sin(90 deg)')).toBe('1');
    expect(run('cos(180 deg)')).toBe('-1');
  });

  it('convert radians to degrees', () => {
    expect(run('pi in deg')).toBe('180 °');
  });
});
