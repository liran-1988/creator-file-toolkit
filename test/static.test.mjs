import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readProjectFile(name) {
  try {
    return await readFile(new URL(`../${name}`, import.meta.url), "utf8");
  } catch {
    return "";
  }
}

test("page exposes the checker before the guide", async () => {
  const html = await readProjectFile("index.html");
  assert.ok(html.includes('id="thumbnail-checker"'));
  assert.ok(html.includes('id="requirements-guide"'));
  assert.ok(html.indexOf('id="thumbnail-checker"') < html.indexOf('id="requirements-guide"'));
});

test("page contains labeled upload, preview, correction, and reset controls", async () => {
  const html = await readProjectFile("index.html");
  for (const required of [
    'id="file-input"',
    'id="drop-zone"',
    'id="preview-image"',
    'id="results-list"',
    'id="fix-button"',
    'id="download-button"',
    'id="reset-button"',
    'aria-live="polite"',
  ]) {
    assert.ok(html.includes(required), `Missing ${required}`);
  }
});

test("page describes local processing and approximate overlays", async () => {
  const html = await readProjectFile("index.html");
  assert.match(html, /processed locally in your browser/i);
  assert.match(html, /approximate/i);
  assert.match(html, /support\.google\.com\/youtube\/answer\/72431/);
});

test("page has factual search metadata and local assets", async () => {
  const html = await readProjectFile("index.html");
  assert.match(html, /<title>YouTube Thumbnail Checker - Size, Ratio &amp; Safe Area Preview<\/title>/);
  assert.match(html, /name="description"/);
  assert.match(html, /href="styles\.css"/);
  assert.match(html, /src="app\.js"/);
  assert.doesNotMatch(html, /https:\/\/fonts\./);
});
