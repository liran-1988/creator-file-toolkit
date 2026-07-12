import test from "node:test";
import assert from "node:assert/strict";
import { getMessages, TRANSLATIONS } from "../i18n.mjs";

function keyPaths(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object") return [path, ...keyPaths(child, path)];
    return [path];
  });
}

test("English and Chinese runtime dictionaries expose identical keys", () => {
  assert.deepEqual(keyPaths(TRANSLATIONS.en), keyPaths(TRANSLATIONS["zh-CN"]));
});

test("Chinese language variants resolve to Simplified Chinese messages", () => {
  for (const language of ["zh", "zh-CN", "zh-Hans", "zh-cn"]) {
    assert.equal(getMessages(language).summary.pass, "可以上传。");
    assert.equal(getMessages(language).status.pass, "通过");
  }
});

test("unknown languages fall back to English", () => {
  assert.strictEqual(getMessages("fr"), TRANSLATIONS.en);
  assert.strictEqual(getMessages(), TRANSLATIONS.en);
});

test("dynamic messages preserve image values", () => {
  const english = getMessages("en");
  const chinese = getMessages("zh-CN");

  assert.equal(
    english.checks.dimensions.expected(3840, 2160, 640),
    "3840 x 2160 px recommended; 640 px minimum width",
  );
  assert.equal(
    chinese.checks.dimensions.expected(3840, 2160, 640),
    "建议 3840 x 2160 px；最小宽度 640 px",
  );
  assert.equal(chinese.comparison.quality(72), "质量 72%");
});

test("translation dictionaries are deeply immutable", () => {
  assert.equal(Object.isFrozen(TRANSLATIONS), true);
  assert.equal(Object.isFrozen(TRANSLATIONS.en), true);
  assert.equal(Object.isFrozen(TRANSLATIONS.en.checks), true);
  assert.equal(Object.isFrozen(TRANSLATIONS["zh-CN"].errors), true);
});
