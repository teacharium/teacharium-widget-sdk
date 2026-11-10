/**
 * Floating-point helpers for widgets that compare or step decimal values.
 *
 * Decimals aren't exact in binary floating point: 0.1 + 0.2 is
 * 0.30000000000000004 and |3.13 - 3.14| is 0.010000000000000231. Comparing
 * such values with === or a bare `<=` gives answers that depend on rounding,
 * so widgets should use these instead.
 */

/** Relative allowance for rounding error, scaled to the size of the values. */
const RELATIVE_EPSILON = 1e-9;

const allowanceFor = (...values: number[]) =>
  RELATIVE_EPSILON * Math.max(1, ...values.map(Math.abs));

/**
 * Whether two numbers are equal apart from floating-point rounding.
 * nearlyEqual(0.1 + 0.2, 0.3) is true; nearlyEqual(1, 1.001) is false.
 */
export function nearlyEqual(a: number, b: number): boolean {
  if (a === b) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= allowanceFor(a, b);
}

/**
 * Whether `value` is within ± `tolerance` of `target`, both bounds included.
 * isWithinTolerance(3.13, 3.14, 0.01) is true. A negative tolerance counts
 * as zero (an exact match, apart from rounding).
 */
export function isWithinTolerance(
  value: number,
  target: number,
  tolerance: number,
): boolean {
  const range = Math.max(0, tolerance);
  return Math.abs(value - target) <= range + allowanceFor(value, target, range);
}

/** Number of digits after the decimal point in `value` (0.25 -> 2, 1e-7 -> 7). */
export function decimalPlaces(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const [mantissa, exponent] = value.toExponential().split("e");
  const fractionDigits = (mantissa.split(".")[1] ?? "").length;
  return Math.max(0, fractionDigits - Number(exponent));
}

/**
 * Snap `value` to the nearest point on the grid origin + k·step, rounded to
 * the decimal places of step and origin so repeated stepping can't build up
 * rounding error. roundToStep(0.30000000000000004, 0.1) is 0.3;
 * roundToStep(7, 5, 1) is 6. A step of zero or less returns the value as is.
 */
export function roundToStep(value: number, step: number, origin = 0): number {
  if (!(step > 0) || !Number.isFinite(value)) return value;
  const steps = Math.round((value - origin) / step);
  const places = Math.max(decimalPlaces(step), decimalPlaces(origin));
  return Number((origin + steps * step).toFixed(Math.min(places, 100)));
}

/** Most decimal places any rounding or format helper will produce. */
const MAX_DECIMALS = 20;

/** Shift a number's decimal point by `places` without float multiplication. */
const shiftDecimal = (value: number, places: number): number => {
  const [mantissa, exponent] = value.toExponential().split("e");
  return Number(`${mantissa}e${Number(exponent) + places}`);
};

/**
 * Round `value` to `decimals` places, halves away from zero, as a person
 * would on paper. Unlike Math.round(v * 100) / 100, it gets roundTo(1.005, 2)
 * right (1.01) because it shifts the decimal point in the number's text, not
 * by multiplying.
 */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value;
  const places = Math.max(0, Math.min(MAX_DECIMALS, Math.trunc(decimals)));
  const sign = value < 0 ? -1 : 1;
  const shifted = Math.round(shiftDecimal(Math.abs(value), places));
  const result = sign * shiftDecimal(shifted, -places);
  return Object.is(result, -0) ? 0 : result;
}

/**
 * Convert a stored value to the value a learner sees: stored / scale, with
 * floating-point noise removed. A lesson that keeps money in cents uses
 * scale 100, so toDisplayValue(125, 100) is 1.25.
 */
export function toDisplayValue(stored: number, scale = 1): number {
  if (!(scale > 0) || scale === 1) return stored;
  return roundTo(stored / scale, 10);
}

/**
 * Convert a value a learner typed back to stored units: display × scale,
 * with floating-point noise removed. toStoredValue(1.15, 100) is 115, not
 * 114.99999999999999.
 */
export function toStoredValue(display: number, scale = 1): number {
  if (!(scale > 0) || scale === 1) return display;
  return roundTo(display * scale, 10);
}

interface NumberPattern {
  prefix: string;
  suffix: string;
  grouping: boolean;
  minIntegerDigits: number;
  minDecimals: number;
  maxDecimals: number;
}

const NUMBER_TOKEN = /[#0][#0,]*(?:\.[#0]*)?|\.[#0]+/;
const patternCache = new Map<string, NumberPattern | null>();

/** Parse a spreadsheet-style pattern such as "$#,##0.00"; null if it has no digits. */
function parseNumberPattern(pattern: string): NumberPattern | null {
  const cached = patternCache.get(pattern);
  if (cached !== undefined) return cached;

  const match = NUMBER_TOKEN.exec(pattern);
  let parsed: NumberPattern | null = null;
  if (match) {
    const [integerPart, fractionPart = ""] = match[0].split(".");
    const fixed = fractionPart.match(/^0*/)?.[0].length ?? 0;
    parsed = {
      prefix: pattern.slice(0, match.index),
      suffix: pattern.slice(match.index + match[0].length),
      grouping: integerPart.includes(","),
      minIntegerDigits: (integerPart.match(/0/g) ?? []).length,
      minDecimals: fixed,
      maxDecimals: Math.min(MAX_DECIMALS, fractionPart.length),
    };
  }
  patternCache.set(pattern, parsed);
  return parsed;
}

/**
 * Format a number for display with a spreadsheet-style pattern, after
 * dividing it by `scale`.
 *
 * Pattern characters:
 *   0  a digit that is always shown ("0.00" → 1.50)
 *   #  a digit shown only when needed ("0.##" → 1.5)
 *   ,  in the whole-number part, groups thousands ("#,##0" → 12,345)
 *   .  the decimal point
 * Any other text before or after the number is copied as-is, so "$#,##0.00"
 * and "0.0 kg" both work. A minus sign goes in front of the prefix (-$1.25).
 *
 * With no pattern the number is shown in full, minus floating-point noise
 * (0.1 + 0.2 shows as "0.3").
 *
 *   formatNumber(125, "$0.00", 100)      → "$1.25"
 *   formatNumber(1234567, "#,##0")       → "1,234,567"
 *   formatNumber(0.25, "0.#")            → "0.3"
 *   formatNumber(2500, "0.### kg", 1000) → "2.5 kg"
 */
export function formatNumber(value: number, pattern?: string, scale = 1): string {
  if (!Number.isFinite(value)) return String(value);
  const display = toDisplayValue(value, scale);
  const parsed = pattern ? parseNumberPattern(pattern) : null;
  if (!parsed) return String(roundTo(display, 10));

  const rounded = roundTo(display, parsed.maxDecimals);
  const [rawInteger, rawFraction = ""] = Math.abs(rounded)
    .toFixed(parsed.maxDecimals)
    .split(".");

  let fraction = rawFraction;
  while (fraction.length > parsed.minDecimals && fraction.endsWith("0")) {
    fraction = fraction.slice(0, -1);
  }

  let integer = rawInteger;
  if (integer === "0" && parsed.minIntegerDigits === 0 && fraction) {
    integer = "";
  }
  integer = integer.padStart(parsed.minIntegerDigits, "0");
  if (parsed.grouping) {
    integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  const sign = rounded < 0 ? "-" : "";
  const number = fraction ? `${integer}.${fraction}` : integer;
  return `${sign}${parsed.prefix}${number}${parsed.suffix}`;
}

/**
 * The pattern a stepping control should use when the author hasn't given one:
 * as many optional decimals as the step and origin need, in display units.
 * stepFormat(0.25) is "0.##", so 0.25 shows as "0.25" and 0.5 as "0.5";
 * stepFormat(5, 0, 100) is "0.##" (steps of 0.05).
 */
export function stepFormat(step: number, origin = 0, scale = 1): string {
  const places = Math.max(
    decimalPlaces(toDisplayValue(step, scale)),
    decimalPlaces(toDisplayValue(origin, scale)),
  );
  return places > 0 ? `0.${"#".repeat(Math.min(places, MAX_DECIMALS))}` : "0";
}
