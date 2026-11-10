import { describe, expect, it } from "vitest";
import {
  decimalPlaces,
  formatNumber,
  isWithinTolerance,
  nearlyEqual,
  roundTo,
  roundToStep,
  stepFormat,
  toDisplayValue,
  toStoredValue,
} from "./numeric";

describe("nearlyEqual", () => {
  it("ignores floating-point rounding", () => {
    expect(nearlyEqual(0.1 + 0.2, 0.3)).toBe(true);
    expect(nearlyEqual(1e6 + 0.1 + 0.2, 1e6 + 0.3)).toBe(true);
  });

  it("still tells different values apart", () => {
    expect(nearlyEqual(1, 1.001)).toBe(false);
    expect(nearlyEqual(0, 1e-6)).toBe(false);
    expect(nearlyEqual(NaN, NaN)).toBe(false);
    expect(nearlyEqual(Infinity, Infinity)).toBe(true);
  });
});

describe("isWithinTolerance", () => {
  it("accepts both bounds of the range", () => {
    // |3.13 - 3.14| is 0.010000000000000231 in floating point
    expect(isWithinTolerance(3.13, 3.14, 0.01)).toBe(true);
    expect(isWithinTolerance(3.15, 3.14, 0.01)).toBe(true);
  });

  it("rejects answers outside the range", () => {
    expect(isWithinTolerance(3.12, 3.14, 0.01)).toBe(false);
    expect(isWithinTolerance(3.16, 3.14, 0.01)).toBe(false);
    expect(isWithinTolerance(3.1301, 3.1402, 0.01)).toBe(false);
  });

  it("needs an exact match when the tolerance is zero or negative", () => {
    expect(isWithinTolerance(0.1 + 0.2, 0.3, 0)).toBe(true);
    expect(isWithinTolerance(4.001, 4, 0)).toBe(false);
    expect(isWithinTolerance(5, 5, -1)).toBe(true);
    expect(isWithinTolerance(6, 5, -1)).toBe(false);
  });

  it("works for large values", () => {
    expect(isWithinTolerance(1000000.5, 1000000, 0.5)).toBe(true);
    expect(isWithinTolerance(1000000.6, 1000000, 0.5)).toBe(false);
  });
});

describe("decimalPlaces", () => {
  it("counts digits after the decimal point", () => {
    expect(decimalPlaces(5)).toBe(0);
    expect(decimalPlaces(0.25)).toBe(2);
    expect(decimalPlaces(-1.5)).toBe(1);
    expect(decimalPlaces(1e-7)).toBe(7);
    expect(decimalPlaces(1.5e3)).toBe(0);
  });
});

describe("roundToStep", () => {
  it("removes rounding error from repeated steps", () => {
    let value = 0;
    for (let i = 0; i < 3; i++) value = roundToStep(value + 0.1, 0.1);
    expect(value).toBe(0.3);
    expect(roundToStep(0.30000000000000004, 0.1)).toBe(0.3);
  });

  it("snaps to the nearest step from the origin", () => {
    expect(roundToStep(7, 5, 1)).toBe(6);
    expect(roundToStep(0.37, 0.25)).toBe(0.25);
    expect(roundToStep(0.38, 0.25)).toBe(0.5);
    expect(roundToStep(1.04, 0.1, 0.05)).toBe(1.05);
  });

  it("leaves the value alone for a step of zero or less", () => {
    expect(roundToStep(0.123, 0)).toBe(0.123);
    expect(roundToStep(0.123, -1)).toBe(0.123);
  });
});

describe("roundTo", () => {
  it("rounds decimal halves the way people expect", () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(0.125, 2)).toBe(0.13);
    expect(roundTo(-1.005, 2)).toBe(-1.01);
    expect(roundTo(2.5, 0)).toBe(3);
    expect(roundTo(-2.5, 0)).toBe(-3);
  });

  it("removes floating-point noise", () => {
    expect(roundTo(0.1 + 0.2, 10)).toBe(0.3);
    expect(roundTo(-0.0001, 2)).toBe(0);
    expect(Object.is(roundTo(-0.0001, 2), -0)).toBe(false);
  });

  it("handles tiny, huge and non-finite values", () => {
    expect(roundTo(1e-7, 8)).toBe(1e-7);
    expect(roundTo(1e21, 2)).toBe(1e21);
    expect(roundTo(NaN, 2)).toBeNaN();
  });
});

describe("toDisplayValue / toStoredValue", () => {
  it("converts between stored integers and displayed decimals", () => {
    expect(toDisplayValue(125, 100)).toBe(1.25);
    expect(toDisplayValue(3, 1000)).toBe(0.003);
    expect(toStoredValue(1.15, 100)).toBe(115);
    expect(toStoredValue(0.007, 1000)).toBe(7);
  });

  it("leaves values alone at scale 1 or an invalid scale", () => {
    expect(toDisplayValue(0.5)).toBe(0.5);
    expect(toStoredValue(0.5, 0)).toBe(0.5);
  });
});

describe("formatNumber", () => {
  it("shows a number in full without float noise when there is no pattern", () => {
    expect(formatNumber(0.1 + 0.2)).toBe("0.3");
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(125, undefined, 100)).toBe("1.25");
  });

  it("applies fixed and optional decimals", () => {
    expect(formatNumber(1.5, "0.00")).toBe("1.50");
    expect(formatNumber(1.5, "0.##")).toBe("1.5");
    expect(formatNumber(2, "0.##")).toBe("2");
    expect(formatNumber(0.25, "0.#")).toBe("0.3");
    expect(formatNumber(1.005, "0.00")).toBe("1.01");
    expect(formatNumber(1.23456, "0.0#")).toBe("1.23");
  });

  it("formats scaled integers exactly", () => {
    expect(formatNumber(125, "$0.00", 100)).toBe("$1.25");
    expect(formatNumber(5, "$0.00", 100)).toBe("$0.05");
    expect(formatNumber(2500, "0.### kg", 1000)).toBe("2.5 kg");
    expect(formatNumber(30, "0.000", 1000)).toBe("0.030");
  });

  it("groups thousands and keeps the sign in front of the prefix", () => {
    expect(formatNumber(1234567, "#,##0")).toBe("1,234,567");
    expect(formatNumber(123456789, "$#,##0.00", 100)).toBe("$1,234,567.89");
    expect(formatNumber(-125, "$0.00", 100)).toBe("-$1.25");
    expect(formatNumber(-0.001, "0.00")).toBe("0.00");
  });

  it("supports optional and padded whole-number digits", () => {
    expect(formatNumber(0.5, "#.00")).toBe(".50");
    expect(formatNumber(5, "00")).toBe("05");
  });

  it("copies surrounding text and ignores patterns with no digits", () => {
    expect(formatNumber(75, "Score: 0%")).toBe("Score: 75%");
    expect(formatNumber(0.1 + 0.2, "abc")).toBe("0.3");
  });
});

describe("stepFormat", () => {
  it("shows as many decimals as the step needs", () => {
    expect(stepFormat(1)).toBe("0");
    expect(stepFormat(0.25)).toBe("0.##");
    expect(stepFormat(1, 0.5)).toBe("0.#");
    expect(stepFormat(5, 0, 100)).toBe("0.##");
    expect(formatNumber(0.25, stepFormat(0.25))).toBe("0.25");
  });
});

describe("stepping with roundToStep", () => {
  it("lands exactly on the grid after many fractional steps", () => {
    let value = 0;
    for (let i = 0; i < 30; i++) value = roundToStep(value + 0.1, 0.1);
    expect(value).toBe(3);
  });
});
