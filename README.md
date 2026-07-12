# Creator File Toolkit

The first tool is a private, browser-only YouTube Thumbnail Checker. It validates image dimensions, aspect ratio, format, and file size, previews approximate interface overlap, and exports a corrected 3840 x 2160 JPEG.

## Public Pages

- English: https://liran-1988.github.io/creator-file-toolkit/
- 简体中文: https://liran-1988.github.io/creator-file-toolkit/zh/

Each route has its own canonical URL and reciprocal language metadata. The language switch uses ordinary links and does not redirect based on browser language.

## Privacy

Images are processed locally in the browser with the Canvas API. The site has no backend, account, upload endpoint, cloud storage, or remote image API. It loads Google AdSense to support the free tools; Google and its partners may use cookies or similar technologies for advertising. See the published privacy pages at `/privacy/` and `/zh/privacy/`.

## Run Locally

Serve the directory because the app uses JavaScript modules:

```powershell
python -m http.server 4174 --bind 127.0.0.1
```

Open `http://127.0.0.1:4174`.

## Test

Install the pinned browser-test dependency, then run the complete suite:

```powershell
npm install
npm run test:all
```

The browser workflow test uses `playwright-core` and an installed Chromium-based browser. Set `BROWSER_PATH` when Edge is not installed in a standard Windows location:

```powershell
$env:BROWSER_PATH="C:\path\to\chrome.exe"
npm run test:browser
```

## Rules

Upload rules live in `rules.mjs` with a source URL and review date. Safe-area overlays are approximate previews and are not official YouTube upload constraints.

Source: [YouTube Help - Add video thumbnails on YouTube](https://support.google.com/youtube/answer/72431?hl=en)

## Deployment

The repository is designed to be served directly from the `main` branch root with GitHub Pages. There is no build step and no runtime dependency.

The sitemap is published at https://liran-1988.github.io/creator-file-toolkit/sitemap.xml. Creating or verifying the corresponding Google Search Console URL-prefix property is an interactive account action and is not performed by the site itself.

## License

MIT
