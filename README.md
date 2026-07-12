# Creator File Toolkit

The first tool is a private, browser-only YouTube Thumbnail Checker. It validates image dimensions, aspect ratio, format, and file size, previews approximate interface overlap, and exports a corrected 3840 x 2160 JPEG.

## Privacy

Images are processed locally in the browser with the Canvas API. The site has no backend, account, upload endpoint, cloud storage, analytics, ads, cookies, or remote image API.

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

## License

MIT
