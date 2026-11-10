import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { scaffold, toComponentPrefix, toPackageName } from "../index.js";

test("names", () => {
  assert.equal(toPackageName("My Widgets!"), "my-widgets");
  assert.equal(toComponentPrefix("my-widgets"), "MyWidgets");
  assert.equal(toComponentPrefix("3d-tools"), "W3dTools");
});

test("scaffold fills in the template", () => {
  const root = mkdtempSync(join(tmpdir(), "ctw-"));
  try {
    const dir = join(root, "acme-science");
    scaffold(dir, { displayName: "Acme Science" });

    assert.ok(existsSync(join(dir, ".gitignore")));
    assert.ok(!existsSync(join(dir, "gitignore")));

    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    assert.equal(pkg.name, "acme-science");
    assert.match(pkg.dependencies["@teacharium/widget"], /^\^\d/);
    assert.match(pkg.devDependencies["@teacharium/widget-tools"], /^\^\d/);

    const project = JSON.parse(readFileSync(join(dir, "teacharium.json"), "utf8"));
    assert.equal(project.name, "Acme Science");
    assert.equal(project.widgetId, undefined);

    const main = readFileSync(join(dir, "src/main.ts"), "utf8");
    assert.match(main, /name: "AcmeScienceHelloCard"/);
    // Lesson-variable examples in prompts are left alone.
    assert.match(main, /\{\{variables\}\}/);
    assert.doesNotMatch(main, /\{\{(packageName|componentPrefix)\}\}/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("refuses a non-empty directory", () => {
  const root = mkdtempSync(join(tmpdir(), "ctw-"));
  try {
    scaffold(join(root, "a"), { displayName: "A" });
    assert.throws(() => scaffold(join(root, "a"), { displayName: "A" }), /not empty/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
