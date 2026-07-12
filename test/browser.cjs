const assert = require("node:assert/strict");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    await page.goto(process.env.BASE_URL || "http://127.0.0.1:4174", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Try sample" }).click();
    await page.locator("#preview-image").waitFor({ state: "visible", timeout: 3000 });
    assert.equal(await page.locator("#result-status").textContent(), "Pass");
    assert.equal(await page.locator("#results-list .check-row").count(), 4);
    assert.equal(await page.locator("#fix-button").isEnabled(), true);
    assert.equal(await page.locator("#reset-button").isEnabled(), true);

    await page.getByRole("button", { name: "Mobile" }).click();
    assert.equal(await page.locator("#preview-frame").getAttribute("data-mode"), "mobile");

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
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
