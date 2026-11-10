import { describe, expect, it } from "vitest";

import { parseProject } from "./project";

describe("parseProject", () => {
  it("accepts a minimal project", () => {
    expect(parseProject({ name: "A", entry: "src/main.ts" }, "f")).toEqual({
      name: "A",
      entry: "src/main.ts",
      description: undefined,
      widgetId: undefined,
    });
  });

  it("requires name and entry", () => {
    expect(() => parseProject({ entry: "x" }, "f")).toThrow(/name/);
    expect(() => parseProject({ name: "A" }, "f")).toThrow(/entry/);
    expect(() => parseProject([], "f")).toThrow(/object/);
  });
});
