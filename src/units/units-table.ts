import { Num } from '../num/index.ts';
import { dim, type Dimension } from './dimensions.ts';
import type { ResolvedUnit } from './quantity.ts';

// Base dimensions
const LENGTH = dim({ length: 1 });
const MASS = dim({ mass: 1 });
const TIME = dim({ time: 1 });
const TEMP = dim({ temperature: 1 });
const INFO = dim({ information: 1 });
const CURRENCY = dim({ currency: 1 });
const AREA = dim({ length: 2 });
const VOLUME = dim({ length: 3 });
const SPEED = dim({ length: 1, time: -1 });
const NONE = dim({}); // dimensionless (angles)

const PI = Num.pi();
const ZERO = Num.of('0');
// °F offset in kelvin: 273.15 − 32·(5/9)
const F_OFFSET = Num.of('273.15').sub(Num.of('32').mul(Num.of('5').div(Num.of('9'))));

interface UnitDef {
  names: string[];
  dimension: Dimension;
  factor: Num | string;
  offset?: Num | string;
  symbol?: string;
}

const DEFS: UnitDef[] = [
  // Length (base: m)
  { names: ['m', 'metre', 'meter', 'metres', 'meters'], dimension: LENGTH, factor: '1' },
  { names: ['km', 'kilometre', 'kilometer', 'kilometres', 'kilometers'], dimension: LENGTH, factor: '1000' },
  { names: ['cm', 'centimetre', 'centimeter'], dimension: LENGTH, factor: '0.01' },
  { names: ['mm', 'millimetre', 'millimeter'], dimension: LENGTH, factor: '0.001' },
  { names: ['um', 'µm', 'micron'], dimension: LENGTH, factor: '0.000001' },
  { names: ['nm'], dimension: LENGTH, factor: '0.000000001' },
  { names: ['mi', 'mile', 'miles'], dimension: LENGTH, factor: '1609.344' },
  { names: ['yd', 'yard', 'yards'], dimension: LENGTH, factor: '0.9144' },
  { names: ['ft', 'foot', 'feet'], dimension: LENGTH, factor: '0.3048' },
  { names: ['inch', 'inches'], dimension: LENGTH, factor: '0.0254', symbol: 'in' },
  { names: ['nmi'], dimension: LENGTH, factor: '1852' },

  // Mass (base: kg)
  { names: ['kg', 'kilo', 'kilos', 'kilogram', 'kilograms'], dimension: MASS, factor: '1' },
  { names: ['g', 'gram', 'grams'], dimension: MASS, factor: '0.001' },
  { names: ['mg', 'milligram', 'milligrams'], dimension: MASS, factor: '0.000001' },
  { names: ['t', 'tonne', 'tonnes'], dimension: MASS, factor: '1000' },
  { names: ['lb', 'lbs', 'pound', 'pounds'], dimension: MASS, factor: '0.45359237' },
  { names: ['oz', 'ounce', 'ounces'], dimension: MASS, factor: '0.028349523125' },
  { names: ['st', 'stone', 'stones'], dimension: MASS, factor: '6.35029318' },

  // Time (base: s)
  { names: ['s', 'sec', 'secs', 'second', 'seconds'], dimension: TIME, factor: '1' },
  { names: ['ms', 'millisecond', 'milliseconds'], dimension: TIME, factor: '0.001' },
  { names: ['min', 'mins', 'minute', 'minutes'], dimension: TIME, factor: '60' },
  { names: ['h', 'hr', 'hrs', 'hour', 'hours'], dimension: TIME, factor: '3600' },
  { names: ['day', 'days'], dimension: TIME, factor: '86400' },
  { names: ['week', 'weeks'], dimension: TIME, factor: '604800' },
  { names: ['month', 'months'], dimension: TIME, factor: '2629800' },
  { names: ['year', 'years', 'yr', 'yrs'], dimension: TIME, factor: '31557600' },

  // Temperature (base: K) — affine. Lowercase aliases so "20c in f" works.
  { names: ['K', 'k', 'kelvin'], dimension: TEMP, factor: '1' },
  { names: ['C', '°C', 'c', 'celsius', 'centigrade'], dimension: TEMP, factor: '1', offset: '273.15', symbol: '°C' },
  { names: ['F', '°F', 'f', 'fahrenheit'], dimension: TEMP, factor: Num.of('5').div(Num.of('9')), offset: F_OFFSET, symbol: '°F' },

  // Angle (dimensionless)
  { names: ['rad', 'radian', 'radians'], dimension: NONE, factor: '1' },
  { names: ['deg', '°', 'degree', 'degrees'], dimension: NONE, factor: PI.div(Num.of('180')), symbol: '°' },
  { names: ['grad', 'gradian', 'gradians'], dimension: NONE, factor: PI.div(Num.of('200')) },
  { names: ['turn', 'turns', 'rev'], dimension: NONE, factor: PI.mul(Num.of('2')) },

  // Digital storage (base: byte)
  { names: ['B', 'byte', 'bytes'], dimension: INFO, factor: '1' },
  { names: ['bit', 'bits'], dimension: INFO, factor: '0.125' },
  { names: ['kB', 'KB', 'kilobyte', 'kilobytes'], dimension: INFO, factor: '1000' },
  { names: ['MB', 'megabyte', 'megabytes'], dimension: INFO, factor: '1000000' },
  { names: ['GB', 'gigabyte', 'gigabytes'], dimension: INFO, factor: '1000000000' },
  { names: ['TB', 'terabyte', 'terabytes'], dimension: INFO, factor: '1000000000000' },
  { names: ['PB'], dimension: INFO, factor: '1000000000000000' },
  { names: ['KiB', 'kibibyte'], dimension: INFO, factor: '1024' },
  { names: ['MiB', 'mebibyte'], dimension: INFO, factor: '1048576' },
  { names: ['GiB', 'gibibyte'], dimension: INFO, factor: '1073741824' },
  { names: ['TiB', 'tebibyte'], dimension: INFO, factor: '1099511627776' },

  // Currency (base: GBP) — STATIC approximate rates (GBP per unit). Postfix
  // codes; symbols (£/€/¥) are accepted as input but display as the ISO code.
  { names: ['GBP', '£', 'gbp'], dimension: CURRENCY, factor: '1', symbol: 'GBP' },
  { names: ['USD', 'usd'], dimension: CURRENCY, factor: '0.79', symbol: 'USD' },
  { names: ['EUR', '€', 'eur'], dimension: CURRENCY, factor: '0.85', symbol: 'EUR' },
  { names: ['JPY', '¥', 'jpy'], dimension: CURRENCY, factor: '0.0053', symbol: 'JPY' },
  { names: ['CHF', 'chf'], dimension: CURRENCY, factor: '0.88', symbol: 'CHF' },
  { names: ['AUD', 'aud'], dimension: CURRENCY, factor: '0.52', symbol: 'AUD' },
  { names: ['CAD', 'cad'], dimension: CURRENCY, factor: '0.58', symbol: 'CAD' },

  // Derived single-symbol units
  { names: ['mph'], dimension: SPEED, factor: Num.of('1609.344').div(Num.of('3600')), symbol: 'mph' },
  { names: ['kn', 'knot', 'knots'], dimension: SPEED, factor: Num.of('1852').div(Num.of('3600')), symbol: 'kn' },
  { names: ['L', 'l', 'litre', 'litres', 'liter', 'liters'], dimension: VOLUME, factor: '0.001', symbol: 'L' },
  { names: ['mL', 'ml'], dimension: VOLUME, factor: '0.000001', symbol: 'mL' },
  { names: ['ha', 'hectare', 'hectares'], dimension: AREA, factor: '10000', symbol: 'ha' },
  { names: ['acre', 'acres'], dimension: AREA, factor: '4046.8564224' },
];

const REGISTRY = new Map<string, ResolvedUnit>();
for (const def of DEFS) {
  const unit: ResolvedUnit = {
    dimension: def.dimension,
    factor: def.factor instanceof Num ? def.factor : Num.of(def.factor),
    offset: def.offset === undefined ? ZERO : def.offset instanceof Num ? def.offset : Num.of(def.offset),
    symbol: def.symbol ?? def.names[0]!,
  };
  for (const name of def.names) REGISTRY.set(name, unit);
}

/** Look up a unit by name/symbol, or null if unknown. */
export function lookupUnit(name: string): ResolvedUnit | null {
  return REGISTRY.get(name) ?? null;
}
