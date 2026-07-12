import test from "node:test";
import assert from "node:assert/strict";

let validateThumbnail;

try {
  ({ validateThumbnail } = await import("../core.mjs"));
} catch {
  // The first RED run intentionally happens before the module exists.
}

const RULES = {
  recommendedWidth: 1280,
  recommendedHeight: 720,
  minimumWidth: 640,
  targetRatio: 16 / 9,
  ratioTolerance: 0.01,
  maximumBytes: 2 * 1024 * 1024,
  supportedTypes: ["image/jpeg", "image/png"],
};

test("accepts a recommended JPEG thumbnail under the file limit", () => {
  assert.equal(typeof validateThumbnail, "function");

  const result = validateThumbnail(
    { width: 1280, height: 720, size: 900_000, type: "image/jpeg" },
    RULES,
  );

  assert.equal(result.status, "pass");
  assert.equal(result.checks.length, 4);
  assert.ok(result.checks.every((check) => check.status === "pass"));
});

test("fails a thumbnail narrower than the minimum width", () => {
  assert.equal(typeof validateThumbnail, "function");

  const result = validateThumbnail(
    { width: 639, height: 360, size: 200_000, type: "image/png" },
    RULES,
  );

  assert.equal(result.status, "fail");
  assert.equal(result.checks.find((check) => check.id === "dimensions").status, "fail");
});

test("warns when an image is not 16 by 9", () => {
  assert.equal(typeof validateThumbnail, "function");

  const result = validateThumbnail(
    { width: 1080, height: 1080, size: 400_000, type: "image/jpeg" },
    RULES,
  );

  assert.equal(result.status, "warning");
  assert.equal(result.checks.find((check) => check.id === "ratio").status, "warning");
});

test("fails a file larger than the upload limit", () => {
  assert.equal(typeof validateThumbnail, "function");

  const result = validateThumbnail(
    { width: 1280, height: 720, size: RULES.maximumBytes + 1, type: "image/png" },
    RULES,
  );

  assert.equal(result.status, "fail");
  assert.equal(result.checks.find((check) => check.id === "file-size").status, "fail");
});

test("fails an unsupported WebP upload", () => {
  assert.equal(typeof validateThumbnail, "function");

  const result = validateThumbnail(
    { width: 1280, height: 720, size: 300_000, type: "image/webp" },
    RULES,
  );

  assert.equal(result.status, "fail");
  assert.equal(result.checks.find((check) => check.id === "format").status, "fail");
});
