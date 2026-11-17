import { describe, expect, it } from "vitest";
import {
  MEDIA_REF_PATTERN,
  formatMediaRef,
  parseMediaRef,
  pickVariantWidth,
} from "./media-ref";

const ID = "0b6e3c2a-1d4f-4a8b-9c7d-2e5f6a7b8c9d";

describe("parseMediaRef", () => {
  it("parses plain, sized, video and bare refs", () => {
    expect(parseMediaRef(`media:${ID}`)).toEqual({ kind: "media", id: ID });
    expect(parseMediaRef(`media:${ID}?w=960`)).toEqual({ kind: "media", id: ID, width: 960 });
    expect(parseMediaRef(`video:${ID}`)).toEqual({ kind: "video", id: ID });
    expect(parseMediaRef(ID)).toEqual({ kind: "media", id: ID });
  });

  it("rejects non-refs", () => {
    expect(parseMediaRef("https://example.com/a.png")).toBeNull();
    expect(parseMediaRef(`video:${ID}?w=960`)).toBeNull();
    expect(parseMediaRef(`media:${ID}?w=abc`)).toBeNull();
    expect(parseMediaRef(42)).toBeNull();
  });

  it("round-trips with formatMediaRef", () => {
    expect(formatMediaRef(ID)).toBe(`media:${ID}`);
    expect(formatMediaRef(ID, 400)).toBe(`media:${ID}?w=400`);
    expect(parseMediaRef(formatMediaRef(ID, 400))?.width).toBe(400);
  });
});

describe("pickVariantWidth", () => {
  it("rounds up to the next standard width", () => {
    expect(pickVariantWidth(100)).toBe(200);
    expect(pickVariantWidth(400)).toBe(400);
    expect(pickVariantWidth(700)).toBe(960);
    expect(pickVariantWidth(1440)).toBe(1440);
  });

  it("serves the original above the largest size or when the original is smaller", () => {
    expect(pickVariantWidth(2000)).toBeNull();
    expect(pickVariantWidth(undefined)).toBeNull();
    expect(pickVariantWidth(700, 800)).toBeNull();
    expect(pickVariantWidth(700, 960)).toBeNull();
    expect(pickVariantWidth(700, 3000)).toBe(960);
  });
});

describe("MEDIA_REF_PATTERN", () => {
  it("finds refs with and without a width inside text", () => {
    const text = `{"a":"media:${ID}?w=960","b":"![x](media:${ID})"}`;
    const found = [...text.matchAll(MEDIA_REF_PATTERN)].map((m) => [m[1], m[2]]);
    expect(found).toEqual([
      [ID, "960"],
      [ID, undefined],
    ]);
  });
});
