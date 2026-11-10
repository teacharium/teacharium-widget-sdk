import { describe, expect, it } from "vitest";
import type { WidgetVersionManifest } from "@teacharium/widget/manifest";

import { bareImports, checkManifest } from "./contract";

describe("bareImports", () => {
  it("finds bare static, re-export and dynamic imports", () => {
    const code = `
      import a, { b as c } from "react";
      import * as d from "react-dom";
      import "side-effect";
      export { x } from "lodash";
      const m = await import("dayjs");
      import y from "./local.js";
      import z from "https://cdn.example.com/z.js";
    `;
    expect(bareImports(code).sort()).toEqual(
      ["dayjs", "lodash", "react", "react-dom", "side-effect"].sort(),
    );
  });
});

describe("checkManifest", () => {
  const manifest = (names: string[]): WidgetVersionManifest => ({
    schemaVersion: 1,
    capturedAt: "",
    components: names.map((name) => ({
      name,
      category: "General",
      aiPrompt: "x",
      fields: {},
      capturedAt: "",
    })),
  });

  it("rejects names reserved by Teacharium", () => {
    expect(checkManifest(manifest(["Text"])).errors).toHaveLength(1);
    expect(checkManifest(manifest(["AcmeText"])).errors).toHaveLength(0);
  });
});
