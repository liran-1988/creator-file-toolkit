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
    'id="placement-stage"',
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
  assert.match(html, /3840 x 2160/);
});

test("page has factual search metadata and local assets", async () => {
  const html = await readProjectFile("index.html");
  assert.match(html, /<title>YouTube Thumbnail Checker - Size, Ratio &amp; Safe Area Preview<\/title>/);
  assert.match(html, /name="description"/);
  assert.match(html, /href="styles\.css"/);
  assert.match(html, /src="app\.js"/);
  assert.doesNotMatch(html, /https:\/\/fonts\./);
});

test("page declares the exact public canonical URL", async () => {
  const html = await readProjectFile("index.html");
  assert.match(html, /rel="canonical" href="https:\/\/liran-1988\.github\.io\/creator-file-toolkit\/"/);
});

test("English and Chinese pages declare reciprocal language metadata", async () => {
  const [english, chinese] = await Promise.all([
    readProjectFile("index.html"),
    readProjectFile("zh/index.html"),
  ]);
  const rootUrl = "https://liran-1988.github.io/creator-file-toolkit/";
  const chineseUrl = `${rootUrl}zh/`;

  assert.match(english, /<html lang="en">/);
  assert.match(chinese, /<html lang="zh-CN">/);
  assert.ok(english.includes(`rel="canonical" href="${rootUrl}"`));
  assert.ok(chinese.includes(`rel="canonical" href="${chineseUrl}"`));

  for (const html of [english, chinese]) {
    assert.ok(html.includes(`rel="alternate" hreflang="en" href="${rootUrl}"`));
    assert.ok(html.includes(`rel="alternate" hreflang="zh-CN" href="${chineseUrl}"`));
    assert.ok(html.includes(`rel="alternate" hreflang="x-default" href="${rootUrl}"`));
  }

  assert.match(english, /href="zh\/"[^>]*>中文</);
  assert.match(chinese, /href="\.\.\/"[^>]*>EN</);
  assert.match(chinese, /YouTube 缩略图检测/);
});

test("sitemap exposes both localized URLs and Search Console verification", async () => {
  const [sitemap, verification] = await Promise.all([
    readProjectFile("sitemap.xml"),
    readProjectFile("google6c947f734196aa98.html"),
  ]);

  assert.match(sitemap, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  assert.match(sitemap, /<loc>https:\/\/liran-1988\.github\.io\/creator-file-toolkit\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/liran-1988\.github\.io\/creator-file-toolkit\/zh\/<\/loc>/);
  assert.match(sitemap, /xhtml:link rel="alternate" hreflang="en"/);
  assert.match(sitemap, /xhtml:link rel="alternate" hreflang="zh-CN"/);
  assert.match(sitemap, /xhtml:link rel="alternate" hreflang="x-default"/);
  assert.equal(verification.trim(), "google-site-verification: google6c947f734196aa98.html");
});

test("repository includes public documentation and discovery files", async () => {
  const [readme, license, robots, sitemap, notFound] = await Promise.all([
    readProjectFile("README.md"),
    readProjectFile("LICENSE"),
    readProjectFile("robots.txt"),
    readProjectFile("sitemap.xml"),
    readProjectFile("404.html"),
  ]);
  assert.match(readme, /processed locally/i);
  assert.match(readme, /npm run test:all/);
  assert.match(license, /MIT License/);
  assert.match(robots, /Sitemap: https:\/\/liran-1988\.github\.io\/creator-file-toolkit\/sitemap\.xml/);
  assert.match(sitemap, /https:\/\/liran-1988\.github\.io\/creator-file-toolkit\//);
  assert.match(notFound, /Back to thumbnail checker/);
});

test("repository declares reproducible unit and browser test commands", async () => {
  const packageJson = await readProjectFile("package.json");
  assert.match(packageJson, /"test:browser"/);
  assert.match(packageJson, /"test:all"/);
  assert.match(packageJson, /"playwright-core"/);
});
