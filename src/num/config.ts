import Decimal from 'decimal.js';

/**
 * Central numeric configuration for the whole calculator.
 *
 * `decimal.js` is the only place floating-point-free arithmetic is implemented;
 * everything else in the app talks to numbers through the {@link Num} facade so
 * that this dependency stays swappable and its config lives in exactly one spot.
 */

/** Significant digits carried through every internal operation. */
export const INTERNAL_PRECISION = 40;

/** Significant digits shown to the user by default. */
export const DISPLAY_SIGNIFICANT_DIGITS = 12;

Decimal.set({
  precision: INTERNAL_PRECISION,
  // Half-up matches most people's intuition for a calculator ("round .5 away
  // from zero"). Display rounding uses the same mode via toSignificantDigits.
  rounding: Decimal.ROUND_HALF_UP,
  // Only fall back to exponential notation for genuinely extreme magnitudes so
  // everyday results render as plain decimals.
  toExpNeg: -12,
  toExpPos: 21,
});

/** The configured Decimal constructor. Internal to the num module only. */
export { Decimal };
