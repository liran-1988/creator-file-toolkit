const assert = require("node:assert/strict");
const fs = require("node:fs");
const zlib = require("node:zlib");
const { chromium } = require("playwright-core");

function resolveBrowserPath() {
  const candidates = [
    process.env.BROWSER_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  const browserPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!browserPath) {
    throw new Error("No supported browser found. Set BROWSER_PATH to Chrome, Edge, or Chromium.");
  }
  return browserPath;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function createPng(width, height, rgb = [35, 125, 80]) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const rowSize = 1 + width * 3;
  const pixels = Buffer.alloc(rowSize * height);
  for (let row = 0; row < height; row += 1) {
    const offset = row * rowSize;
    pixels[offset] = 0;
    for (let column = 0; column < width; column += 1) {
      pixels.set(rgb, offset + 1 + column * 3);
    }
  }
  return Buffer.concat([
    signature,
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(pixels)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: resolveBrowserPath(),
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    await page.goto(process.env.BASE_URL || "http://127.0.0.1:4174", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Try sample" }).click();
    await page.locator("#preview-image").waitFor({ state: "visible", timeout: 3000 });
    assert.equal(await page.locator("#result-status").textContent(), "Pass");
    assert.equal(await page.locator("#results-list .check-row").count(), 4);
    assert.equal(await page.locator("#results-list .check-status").count(), 4);
    assert.deepEqual(await page.locator("#results-list .check-status").allTextContents(), ["Pass", "Pass", "Pass", "Pass"]);
    assert.equal(await page.locator("#fix-button").isEnabled(), true);
    assert.equal(await page.locator("#reset-button").isEnabled(), true);

    await page.getByRole("button", { name: "Mobile" }).click();
    assert.equal(await page.locator("#preview-frame").getAttribute("data-mode"), "mobile");
    assert.equal(await page.locator("#placement-stage").getAttribute("data-mode"), "mobile");

    await page.getByRole("button", { name: "Fix & preview" }).click();
    await page.locator("#download-button:not([disabled])").waitFor({ timeout: 3000 });
    assert.match(await page.locator("#corrected-value").textContent(), /3840 x 2160/);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download JPEG" }).click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), "sample-thumbnail-youtube-thumbnail.jpg");

    await page.getByRole("button", { name: "Reset" }).click();
    assert.equal(await page.locator("#result-status").textContent(), "Waiting");
    assert.equal(await page.locator("#preview-image").isHidden(), true);
    assert.equal(await page.locator("#fix-button").isDisabled(), true);
    assert.equal(await page.locator("#preview-frame").getAttribute("data-mode"), "desktop");
    assert.equal(await page.getByRole("button", { name: "Desktop" }).getAttribute("aria-pressed"), "true");
    assert.equal(await page.getByRole("button", { name: "Mobile" }).getAttribute("aria-pressed"), "false");

    const oversizedPng = Buffer.alloc(24);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(oversizedPng, 0);
    oversizedPng.writeUInt32BE(13, 8);
    Buffer.from("IHDR", "ascii").copy(oversizedPng, 12);
    oversizedPng.writeUInt32BE(8000, 16);
    oversizedPng.writeUInt32BE(4000, 20);
    await page.locator("#file-input").setInputFiles({
      name: "oversized.png",
      mimeType: "image/png",
      buffer: oversizedPng,
    });
    await page.locator("#status-message").filter({ hasText: "24 megapixels" }).waitFor();
    assert.equal(await page.locator("#preview-image").isHidden(), true);

    await page.locator("#file-input").setInputFiles({
      name: "real-input.png",
      mimeType: "image/png",
      buffer: createPng(2, 2),
    });
    await page.locator("#original-value").filter({ hasText: "2 x 2" }).waitFor();
    assert.equal(await page.locator("#results-list .check-row").count(), 4);

    await page.locator("#file-input").setInputFiles({
      name: "corrupt.png",
      mimeType: "image/png",
      buffer: Buffer.from("not a png"),
    });
    await page.locator("#status-message").filter({ hasText: "Invalid PNG header" }).waitFor();
    assert.equal(await page.locator("#preview-image").isHidden(), true);

    await page.context().setOffline(true);
    await page.getByRole("button", { name: "Try sample" }).click();
    await page.locator("#result-status").filter({ hasText: "Pass" }).waitFor();
    await page.context().setOffline(false);

    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobilePage.goto(process.env.BASE_URL || "http://127.0.0.1:4174", { waitUntil: "networkidle" });
    await mobilePage.getByRole("button", { name: "Try sample" }).click();
    await mobilePage.locator("#result-status").filter({ hasText: "Pass" }).waitFor();
    const mobileMetrics = await mobilePage.evaluate(() => ({
      viewportWidth: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clippedButtons: [...document.querySelectorAll("button")]
        .filter((button) => button.scrollWidth > button.clientWidth + 1)
        .map((button) => button.textContent.trim()),
    }));
    assert.equal(mobileMetrics.scrollWidth, mobileMetrics.viewportWidth);
    assert.deepEqual(mobileMetrics.clippedButtons, []);
    await mobilePage.close();

    const raceContext = await browser.newContext();
    await raceContext.addInitScript(() => {
      const nativeCreateImageBitmap = window.createImageBitmap.bind(window);
      window.createImageBitmap = async (blob) => {
        if (blob.name === "slow.png") {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        return nativeCreateImageBitmap(blob);
      };
    });
    const racePage = await raceContext.newPage();
    await racePage.goto(process.env.BASE_URL || "http://127.0.0.1:4174", { waitUntil: "networkidle" });
    const slowLoad = racePage.locator("#file-input").setInputFiles({
      name: "slow.png",
      mimeType: "image/png",
      buffer: createPng(1, 1),
    });
    await racePage.waitForTimeout(20);
    await racePage.locator("#file-input").setInputFiles({
      name: "fast.png",
      mimeType: "image/png",
      buffer: createPng(2, 2),
    });
    await slowLoad;
    await racePage.locator("#original-value").filter({ hasText: "2 x 2" }).waitFor();
    await racePage.waitForTimeout(300);
    assert.match(await racePage.locator("#original-value").textContent(), /2 x 2/);

    const pendingLoad = racePage.locator("#file-input").setInputFiles({
      name: "slow.png",
      mimeType: "image/png",
      buffer: createPng(1, 1),
    });
    await racePage.waitForTimeout(20);
    await racePage.getByRole("button", { name: "Reset" }).click();
    await pendingLoad;
    await racePage.waitForTimeout(300);
    assert.equal(await racePage.locator("#result-status").textContent(), "Waiting");
    assert.equal(await racePage.locator("#preview-image").isHidden(), true);
    await raceContext.close();
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
