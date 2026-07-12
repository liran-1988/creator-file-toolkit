# Creator File Toolkit

The first tool is a private, browser-only YouTube Thumbnail Checker. It validates image dimensions, aspect ratio, format, and file size, previews approximate interface overlap, and exports a corrected 1280 x 720 JPEG.

## Privacy

Images are processed locally in the browser with the Canvas API. The site has no backend, account, upload endpoint, cloud storage, analytics, ads, cookies, or remote image API.

## Run Locally

Serve the directory because the app uses JavaScript modules:

```powershell
python -m http.server 4174 --bind 127.0.0.1
```

Open `http://127.0.0.1:4174`.

## Test

Pure logic and static page contracts use Node's built-in test runner:

```powershell
node --test test/*.test.mjs
```

The browser workflow test uses Playwright and an installed Chromium-based browser:

```powershell
$env:NODE_PATH="<path-to-node_modules>"
node test/browser.cjs
```

## Rules

Upload rules live in `rules.mjs` with a source URL and review date. Safe-area overlays are approximate previews and are not official YouTube upload constraints.

Source: [YouTube Help - Add video thumbnails on YouTube](https://support.google.com/youtube/answer/72431?hl=en)

## Deployment

The repository is designed to be served directly from the `main` branch root with GitHub Pages. There is no build step and no runtime dependency.

## License

MIT
