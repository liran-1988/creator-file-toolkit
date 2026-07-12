import test from "node:test";
import assert from "node:assert/strict";

let validateThumbnail;
let calculateCoverCrop;
let calculateContainSize;
let buildDownloadName;
let actualRules;
let readImageDimensionsFromBytes;

try {
  ({
    validateThumbnail,
    calculateCoverCrop,
    calculateContainSize,
    buildDownloadName,
    readImageDimensionsFromBytes,
  } = await import("../core.mjs"));
  ({ YOUTUBE_THUMBNAIL_RULES: actualRules } = await import("../rules.mjs"));
} catch {
  // The first RED run intentionally happens before the module exists.
}

const RULES = {
  recommendedWidth: 3840,
  recommendedHeight: 2160,
  minimumWidth: 640,
  targetRatio: 16 / 9,
  ratioTolerance: 0.01,
  maximumBytes: 2 * 1024 * 1024,
  supportedTypes: ["image/jpeg", "image/png"],
};

test("accepts a recommended JPEG thumbnail under the file limit", () => {
  assert.equal(typeof validateThumbnail, "function");

  const result = validateThumbnail(
    { width: 3840, height: 2160, size: 900_000, type: "image/jpeg" },
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
    { width: 3840, height: 2160, size: RULES.maximumBytes + 1, type: "image/png" },
    RULES,
  );

  assert.equal(result.status, "fail");
  assert.equal(result.checks.find((check) => check.id === "file-size").status, "fail");
});

test("fails an unsupported WebP upload", () => {
  assert.equal(typeof validateThumbnail, "function");

  const result = validateThumbnail(
    { width: 3840, height: 2160, size: 300_000, type: "image/webp" },
    RULES,
  );

  assert.equal(result.status, "fail");
  assert.equal(result.checks.find((check) => check.id === "format").status, "fail");
});

test("uses the current official recommended resolution", () => {
  assert.equal(actualRules.recommendedWidth, 3840);
  assert.equal(actualRules.recommendedHeight, 2160);
});

test("warns when a 1280 by 720 thumbnail is below the current recommendation", () => {
  const result = validateThumbnail(
    { width: 1280, height: 720, size: 300_000, type: "image/jpeg" },
    RULES,
  );
  assert.equal(result.status, "warning");
  assert.equal(result.checks.find((check) => check.id === "dimensions").status, "warning");
});

test("calculates a centered 16 by 9 cover crop", () => {
  assert.equal(typeof calculateCoverCrop, "function");
  assert.deepEqual(calculateCoverCrop(1600, 1200, 1280, 720), {
    x: 0,
    y: 150,
    width: 1600,
    height: 900,
  });
});

test("keeps an exact 16 by 9 source intact", () => {
  assert.equal(typeof calculateCoverCrop, "function");
  assert.deepEqual(calculateCoverCrop(1920, 1080, 1280, 720), {
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
  });
});

test("calculates contained dimensions without upscaling past the target", () => {
  assert.equal(typeof calculateContainSize, "function");
  assert.deepEqual(calculateContainSize(1000, 1000, 1280, 720), {
    width: 720,
    height: 720,
  });
});

test("rejects non-positive geometry inputs", () => {
  assert.equal(typeof calculateCoverCrop, "function");
  assert.throws(() => calculateCoverCrop(0, 720, 1280, 720), RangeError);
  assert.throws(() => calculateContainSize(1280, -1, 1280, 720), RangeError);
});

test("builds a safe deterministic download name", () => {
  assert.equal(typeof buildDownloadName, "function");
  assert.equal(buildDownloadName("My Great Thumb!!.PNG", "jpg"), "my-great-thumb-youtube-thumbnail.jpg");
  assert.equal(buildDownloadName("", ".png"), "thumbnail-youtube-thumbnail.png");
});

test("reads PNG dimensions before raster decoding", () => {
  assert.equal(typeof readImageDimensionsFromBytes, "function");
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, 6000);
  view.setUint32(20, 4000);
  assert.deepEqual(readImageDimensionsFromBytes(bytes, "image/png"), { width: 6000, height: 4000 });
});

test("reads JPEG dimensions before raster decoding", () => {
  assert.equal(typeof readImageDimensionsFromBytes, "function");
  const bytes = new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08, 0x08, 0x70, 0x0f, 0x00,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
    0xff, 0xd9,
  ]);
  assert.deepEqual(readImageDimensionsFromBytes(bytes, "image/jpeg"), { width: 3840, height: 2160 });
});

test("rejects malformed image headers before decoding", () => {
  assert.equal(typeof readImageDimensionsFromBytes, "function");
  assert.throws(() => readImageDimensionsFromBytes(new Uint8Array([1, 2, 3]), "image/png"), /PNG header/);
  assert.throws(() => readImageDimensionsFromBytes(new Uint8Array([0xff, 0xd8, 0xff]), "image/jpeg"), /JPEG/);
});
