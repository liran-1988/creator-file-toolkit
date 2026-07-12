# Bilingual Pages and Search Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish independently indexable English and Simplified Chinese versions of Creator File Toolkit, then verify a new URL-prefix property and submit its sitemap in Google Search Console.

**Architecture:** Keep English at the existing root and add a structurally equivalent `/zh/` page. Static guidance remains language-specific HTML for crawlability, while `i18n.mjs` supplies shared runtime messages to the existing `app.js`; both pages continue to use one validation and Canvas implementation.

**Tech Stack:** Static HTML/CSS, JavaScript ES modules, Node `node:test`, Playwright Core, GitHub Pages, Google Search Console HTML-file verification.

---

## File Map

- `index.html`: English canonical page, language navigation, reciprocal hreflang.
- `zh/index.html`: Simplified Chinese canonical page with the same component IDs and shared assets.
- `i18n.mjs`: English and Chinese runtime message dictionaries with English fallback.
- `app.js`: consumes dictionary keys instead of embedding user-facing runtime strings.
- `styles.css`: stable EN / 中文 segmented navigation.
- `sitemap.xml`: two canonical pages and XHTML language alternates.
- `google6c947f734196aa98.html`: Search Console HTML verification file at Pages root.
- `test/i18n.test.mjs`: dictionary completeness and fallback tests.
- `test/static.test.mjs`: bilingual URL, content, SEO, and verification contracts.
- `test/browser.cjs`: English and Chinese end-to-end workflow checks.

### Task 1: Bilingual Static Contracts

**Files:**
- Modify: `test/static.test.mjs`
- Modify: `test/browser.cjs`

- [ ] **Step 1: Write failing static tests**

Require:

```text
index.html lang="en"
zh/index.html lang="zh-CN"
English canonical: /creator-file-toolkit/
Chinese canonical: /creator-file-toolkit/zh/
Reciprocal hreflang: en, zh-CN, x-default
English link href="zh/"
Chinese link href="../"
Chinese visible text: YouTube 缩略图检测
sitemap contains both URLs and XHTML alternates
google6c947f734196aa98.html exists at repository root
```

- [ ] **Step 2: Extend the browser contract before implementation**

Parameterize the main flow with:

```js
[
  { path: "/", sample: "Try sample", pass: "Pass", download: "Download JPEG" },
  { path: "/zh/", sample: "试用示例", pass: "通过", download: "下载 JPEG" },
]
```

Assert both pages can generate the sample, show four checks, correct to 3840 x 2160, download, reset, and navigate to the alternate language.

- [ ] **Step 3: Run tests and observe RED**

Run:

```powershell
npm test
npm run test:browser
```

Expected: static tests fail because `zh/index.html`, hreflang, sitemap alternates, and verification file do not exist; Chinese browser navigation fails with 404.

### Task 2: Runtime Translation Module

**Files:**
- Create: `i18n.mjs`
- Create: `test/i18n.test.mjs`
- Modify: `app.js`

- [ ] **Step 1: Write failing dictionary tests**

Define the expected API:

```js
const messages = getMessages("zh-CN");
messages.status.pass === "可以上传。"
getMessages("fr").status.pass === getMessages("en").status.pass
```

Assert English and Chinese expose identical nested keys for statuses, checks, upload errors, processing, correction, downloads, and empty states.

- [ ] **Step 2: Run focused tests and observe RED**

Run: `node --test test/i18n.test.mjs`

Expected: FAIL because `i18n.mjs` does not exist.

- [ ] **Step 3: Implement `i18n.mjs`**

Export `getMessages(language)` and immutable `TRANSLATIONS`. Normalize `zh`, `zh-CN`, and `zh-Hans` to Chinese; return English for every other value. Keep dynamic values as formatter functions such as `dimensionsExpected(width, height, minimumWidth)`.

- [ ] **Step 4: Replace runtime strings in `app.js`**

Load once:

```js
const messages = getMessages(document.documentElement.lang);
```

Use dictionary values in result summaries, check labels/expectations, loading/error states, file comparison values, compression-floor guidance, and download confirmation. Keep MIME types, dimensions, ratios, byte values, and filenames language-neutral.

- [ ] **Step 5: Run tests and commit**

Run: `npm test`

Expected: dictionary and existing pure/static tests pass.

Commit:

```powershell
git add i18n.mjs app.js test/i18n.test.mjs
git commit -m "feat: add shared English and Chinese runtime messages"
```

### Task 3: English and Chinese Pages

**Files:**
- Modify: `index.html`
- Create: `zh/index.html`
- Modify: `styles.css`

- [ ] **Step 1: Add English SEO alternatives and switch**

Add self canonical plus:

```html
<link rel="alternate" hreflang="en" href="https://liran-1988.github.io/creator-file-toolkit/">
<link rel="alternate" hreflang="zh-CN" href="https://liran-1988.github.io/creator-file-toolkit/zh/">
<link rel="alternate" hreflang="x-default" href="https://liran-1988.github.io/creator-file-toolkit/">
```

Add a header segmented navigation with current-language `aria-current="page"` and an ordinary `href="zh/"` Chinese link.

- [ ] **Step 2: Create the full Chinese static page**

Copy the same component structure and IDs, set `lang="zh-CN"`, use `../styles.css` and `../app.js`, translate every visible section, link English with `href="../"`, and set Chinese canonical/Open Graph URL to `/zh/`.

- [ ] **Step 3: Style the language switch**

Use a compact two-segment control with a stable 36 px height, visible focus, current-page contrast, no rounded text pill styling, and no mobile overflow. Preserve the existing privacy indicator on desktop.

- [ ] **Step 4: Run static and browser tests**

Run: `npm run test:all`

Expected: English and Chinese functional checks pass; Search Console and sitemap tests remain red until Task 4.

- [ ] **Step 5: Commit**

```powershell
git add index.html zh/index.html styles.css test/static.test.mjs test/browser.cjs
git commit -m "feat: publish English and Chinese checker pages"
```

### Task 4: Sitemap and Search Console Verification

**Files:**
- Modify: `sitemap.xml`
- Create: `google6c947f734196aa98.html`
- Modify: `README.md`

- [ ] **Step 1: Add both language URLs to sitemap**

Declare the XHTML namespace and add reciprocal alternates for both `<url>` entries. Keep the existing English root and add `/zh/`; do not list utility files as pages.

- [ ] **Step 2: Add the exact existing verification file**

Fetch the public file from:

`https://liran-1988.github.io/maven-conflict-guide/google6c947f734196aa98.html`

Save the exact response bytes as `google6c947f734196aa98.html`. Do not invent or transform the token.

- [ ] **Step 3: Document bilingual routes and Search Console**

Update README with both public routes, language behavior, sitemap URL, and the rule that Search Console property creation remains an interactive account action.

- [ ] **Step 4: Run full tests and commit**

Run: `npm run test:all`

Expected: all unit, static, and browser tests pass with no pre-existing server.

Commit:

```powershell
git add sitemap.xml google6c947f734196aa98.html README.md test/static.test.mjs
git commit -m "feat: prepare bilingual site for Search Console"
```

### Task 5: Visual Verification, Publication, and Search Console

**Files:**
- Modify: external factory progress/report records only after verification

- [ ] **Step 1: Run desktop and mobile visual checks**

Capture English and Chinese pages at 1440 x 1000 and 390 x 844 after loading the sample. Check no horizontal overflow, clipped buttons, overlapping text, blank preview, or untranslated runtime state.

- [ ] **Step 2: Run release scans**

Run `npm run test:all`, `git diff --check`, module syntax checks, tracked secret scan, absolute personal-path scan, and clean-worktree check.

- [ ] **Step 3: Merge and publish**

Merge the verified feature branch into `main`, push `main`, wait for Pages status `built`, and verify HTTP 200 for `/`, `/zh/`, shared modules, sitemap, robots, and `google6c947f734196aa98.html`.

- [ ] **Step 4: Add the new Search Console property**

Open Search Console in a visible browser. Add URL-prefix:

`https://liran-1988.github.io/creator-file-toolkit/`

Use HTML-file verification. If the existing file is rejected, stop and obtain the exact replacement file from Google before modifying the repository.

- [ ] **Step 5: Submit sitemap and record actual status**

Submit `sitemap.xml`. Record whether Search Console reports success, pending, or an error; do not describe submission as indexing.
