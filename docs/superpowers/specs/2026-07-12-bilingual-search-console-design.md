# Bilingual Pages and Search Console Design

Date: 2026-07-12
Status: Approved direction, pending written-spec review

## Goal

Keep the existing English YouTube Thumbnail Checker optimized for overseas discovery, add a fully translated Simplified Chinese page with a visible language switch, and register the tool as a new URL-prefix property in the user's existing Google Search Console account.

## URL and Language Model

- English remains at `https://liran-1988.github.io/creator-file-toolkit/`.
- Simplified Chinese is published at `https://liran-1988.github.io/creator-file-toolkit/zh/`.
- The English page remains the `x-default` language target.
- Each page has a self-referencing canonical URL.
- Each page declares `hreflang="en"`, `hreflang="zh-CN"`, and `hreflang="x-default"` alternatives.
- The header contains an `EN / 中文` segmented language navigation. These are ordinary links, not JavaScript-only controls.
- The site does not automatically redirect based on browser language, IP address, or stored preference.

This structure gives users a clear switch while allowing Google to crawl and index each language independently.

## Content and Shared Behavior

The Chinese page translates every user-facing element:

- metadata, title, and description;
- upload and drag-and-drop instructions;
- preview modes and approximate-overlay notices;
- validation labels, actual values, expected values, and status messages;
- correction, download, reset, error, and privacy messages;
- requirements guide, FAQ, and footer.

Image validation, PNG/JPEG header parsing, crop geometry, compression, race cancellation, and download behavior remain shared. Translation must not fork the processing implementation.

`app.js` selects a message dictionary from the document's `lang` attribute. English is the fallback dictionary. Static HTML content is translated in each language page so the Chinese page remains useful and indexable when JavaScript is unavailable.

## File Structure

```text
creator-file-toolkit/
  index.html
  zh/index.html
  app.js
  i18n.mjs
  core.mjs
  rules.mjs
  styles.css
  sitemap.xml
  robots.txt
  google6c947f734196aa98.html
  test/
```

`i18n.mjs` owns runtime messages keyed by stable identifiers. Both HTML pages use the same IDs and component structure. `app.js` consumes the selected dictionary and does not contain duplicated Chinese branches.

## Search Metadata

English metadata targets `YouTube thumbnail checker`, dimensions, ratio, and safe-area preview intent. Chinese metadata targets `YouTube 缩略图检测`, 尺寸, 比例, 文件大小, and 安全区域预览 intent.

The sitemap contains exactly two page URLs with language alternates:

- `https://liran-1988.github.io/creator-file-toolkit/`
- `https://liran-1988.github.io/creator-file-toolkit/zh/`

The verification HTML file is copied from the user's already verified `maven-conflict-guide` Pages root and published at:

`https://liran-1988.github.io/creator-file-toolkit/google6c947f734196aa98.html`

If Google rejects that token for the new property, the user will obtain a fresh HTML-file token from Search Console and the repository will replace the verification file. No token will be fabricated.

## Search Console Workflow

1. Publish and verify the English page, Chinese page, sitemap, robots file, and verification file over HTTPS.
2. Open Google Search Console in a visible browser using the user's existing signed-in Google session.
3. Add a new URL-prefix property for `https://liran-1988.github.io/creator-file-toolkit/`.
4. Select HTML-file verification and confirm ownership.
5. If the reused file is rejected, download or copy the new verification filename/content supplied by Google, publish it at the Pages root, and retry.
6. Submit `sitemap.xml` for the new property.
7. Confirm Search Console accepts the sitemap request. Indexing and search appearance may remain pending and are not treated as immediate failures.

Search Console authentication remains interactive. The implementation will not request, read, export, or automate Google passwords, cookies, OAuth tokens, recovery information, or account security settings.

## Error Handling

- Missing translation keys fall back to English and emit no broken placeholder text.
- The language switch continues to work without JavaScript.
- A failed Chinese-page script load still leaves translated guidance, privacy text, and language navigation visible.
- A failed Search Console verification does not trigger repeated automated attempts; it switches to the fresh-token workflow.
- A sitemap submission marked pending is reported accurately rather than described as indexed.

## Testing

Static tests verify:

- both HTML files exist and declare the correct `lang` value;
- canonical and all three hreflang links are correct and reciprocal;
- language links resolve to the other page;
- both pages contain original, visible language-specific content;
- sitemap lists both canonical URLs and language alternatives;
- the verification file is present at the repository root;
- shared scripts and styles resolve from both URL depths.

Browser tests run the full sample, correction, download, reset, offline, invalid-file, oversized-file, race, and pending-reset workflows in English and Chinese. They also verify runtime status text appears in the selected language and test 1440 px and 390 px viewports for overflow and clipped controls.

Public verification checks both language URLs, shared modules, sitemap, robots, and the Google verification file over HTTPS before opening Search Console.

## Non-Goals

- Translating into languages other than English and Simplified Chinese.
- Automatic browser-language redirects.
- Machine-generated SEO doorway pages.
- Creating a Google, AdSense, payment, tax, or identity account.
- Claiming immediate indexing, ranking, traffic, or advertising approval.
- Adding AdSense code before a valid `ca-pub-...` Publisher ID and separate advertising design approval are available.
