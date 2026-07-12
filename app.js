import {
  buildDownloadName,
  calculateCoverCrop,
  readImageDimensionsFromBytes,
  validateThumbnail,
} from "./core.mjs";
import { YOUTUBE_THUMBNAIL_RULES } from "./rules.mjs";

const MAX_PIXELS = 24_000_000;
const HEADER_READ_LIMIT = 512 * 1024;
const TARGET_WIDTH = YOUTUBE_THUMBNAIL_RULES.recommendedWidth;
const TARGET_HEIGHT = YOUTUBE_THUMBNAIL_RULES.recommendedHeight;

const elements = {
  fileInput: document.querySelector("#file-input"),
  dropZone: document.querySelector("#drop-zone"),
  sampleButton: document.querySelector("#sample-button"),
  statusMessage: document.querySelector("#status-message"),
  workspace: document.querySelector("#workspace"),
  placementStage: document.querySelector("#placement-stage"),
  previewFrame: document.querySelector("#preview-frame"),
  previewEmpty: document.querySelector("#preview-empty"),
  previewImage: document.querySelector("#preview-image"),
  resultsList: document.querySelector("#results-list"),
  resultStatus: document.querySelector("#result-status"),
  fixButton: document.querySelector("#fix-button"),
  downloadButton: document.querySelector("#download-button"),
  resetButton: document.querySelector("#reset-button"),
  fileComparison: document.querySelector("#file-comparison"),
  originalValue: document.querySelector("#original-value"),
  correctedValue: document.querySelector("#corrected-value"),
  previewModes: [...document.querySelectorAll("[data-preview-mode]")],
};

const state = {
  file: null,
  source: null,
  originalUrl: null,
  correctedUrl: null,
  correctedBlob: null,
  requestId: 0,
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function setStatus(message, kind = "neutral") {
  elements.statusMessage.textContent = message;
  elements.statusMessage.dataset.kind = kind;
}

function setWorkspaceState(value) {
  elements.workspace.dataset.state = value;
}

function setResultStatus(status) {
  elements.resultStatus.className = `result-status is-${status}`;
  elements.resultStatus.textContent = {
    pass: "Pass",
    warning: "Review",
    fail: "Fix needed",
    empty: "Waiting",
  }[status];
}

function setPreviewMode(mode) {
  for (const item of elements.previewModes) {
    const active = item.dataset.previewMode === mode;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-pressed", String(active));
  }
  elements.previewFrame.dataset.mode = mode;
  elements.placementStage.dataset.mode = mode;
}

function renderChecks(result) {
  elements.resultsList.replaceChildren();
  for (const check of result.checks) {
    const item = document.createElement("li");
    item.className = "check-row";
    item.dataset.status = check.status;

    const indicator = document.createElement("span");
    indicator.className = "check-indicator";
    indicator.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    copy.className = "check-copy";
    const labelLine = document.createElement("span");
    labelLine.className = "label-line";
    const label = document.createElement("strong");
    label.textContent = check.label;
    const statusText = document.createElement("span");
    statusText.className = "check-status";
    statusText.textContent = check.status === "warning"
      ? "Warning"
      : check.status[0].toUpperCase() + check.status.slice(1);
    labelLine.append(label, statusText);
    const actual = document.createElement("span");
    actual.textContent = check.actual;
    const expected = document.createElement("small");
    expected.textContent = check.expected;
    copy.append(labelLine, actual, expected);
    item.append(indicator, copy);
    elements.resultsList.append(item);
  }
  setResultStatus(result.status);
}

function metadataFor(file, source) {
  return {
    width: source.width,
    height: source.height,
    size: file.size,
    type: file.type,
  };
}

function releaseSource() {
  if (state.source && typeof state.source.close === "function") {
    state.source.close();
  }
  state.source = null;
}

function revokeUrl(name) {
  if (state[name]) URL.revokeObjectURL(state[name]);
  state[name] = null;
}

function clearLoadedState() {
  releaseSource();
  revokeUrl("originalUrl");
  revokeUrl("correctedUrl");
  state.file = null;
  state.correctedBlob = null;
  elements.fileInput.value = "";
  elements.previewImage.removeAttribute("src");
  elements.previewImage.hidden = true;
  elements.previewEmpty.hidden = false;
  elements.previewFrame.classList.remove("has-image");
  elements.resultsList.innerHTML = '<li class="empty-result">Select an image to check dimensions, ratio, size, and format.</li>';
  setResultStatus("empty");
  elements.fileComparison.hidden = true;
  elements.originalValue.textContent = "-";
  elements.correctedValue.textContent = "-";
  elements.fixButton.disabled = true;
  elements.downloadButton.disabled = true;
}

function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The browser could not decode this image."));
    image.src = url;
  });
}

async function decodeFile(file) {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      // Safari and some encoded JPEGs need the Image fallback.
    }
  }
  const temporaryUrl = URL.createObjectURL(file);
  try {
    return await loadImageElement(temporaryUrl);
  } finally {
    URL.revokeObjectURL(temporaryUrl);
  }
}

function showPreview(url) {
  elements.previewImage.src = url;
  elements.previewImage.hidden = false;
  elements.previewEmpty.hidden = true;
  elements.previewFrame.classList.add("has-image");
}

function showError(error) {
  setWorkspaceState("error");
  setStatus(error instanceof Error ? error.message : String(error), "error");
  elements.resetButton.disabled = false;
}

async function inspectFile(file) {
  const requestId = ++state.requestId;
  clearLoadedState();
  setWorkspaceState("loading");
  setStatus("Reading image details locally...", "neutral");
  elements.resetButton.disabled = false;

  try {
    if (!YOUTUBE_THUMBNAIL_RULES.supportedTypes.includes(file.type)) {
      throw new Error("Choose a JPEG or PNG file. Other formats are not supported by this checker yet.");
    }

    const headerBytes = new Uint8Array(await file.slice(0, HEADER_READ_LIMIT).arrayBuffer());
    if (requestId !== state.requestId) return;
    const headerDimensions = readImageDimensionsFromBytes(headerBytes, file.type);
    if (headerDimensions.width * headerDimensions.height > MAX_PIXELS) {
      throw new Error("This image is too large to decode safely. Choose an image at or below 24 megapixels.");
    }

    const source = await decodeFile(file);
    if (requestId !== state.requestId) {
      if (typeof source.close === "function") source.close();
      return;
    }
    if (source.width !== headerDimensions.width || source.height !== headerDimensions.height) {
      if (typeof source.close === "function") source.close();
      throw new Error("The decoded image dimensions do not match its file header.");
    }

    state.file = file;
    state.source = source;
    state.originalUrl = URL.createObjectURL(file);
    const metadata = metadataFor(file, source);
    const result = validateThumbnail(metadata, YOUTUBE_THUMBNAIL_RULES);

    showPreview(state.originalUrl);
    renderChecks(result);
    elements.originalValue.textContent = `${metadata.width} x ${metadata.height} / ${formatBytes(file.size)}`;
    elements.correctedValue.textContent = "Not created";
    elements.fileComparison.hidden = false;
    elements.fixButton.disabled = false;
    elements.downloadButton.disabled = true;
    elements.fileInput.value = "";
    setWorkspaceState("ready");
    setStatus(result.summary, result.status);
  } catch (error) {
    if (requestId === state.requestId) showError(error);
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("The browser could not create the corrected image.")),
      type,
      quality,
    );
  });
}

async function exportCompressedJpeg(canvas) {
  let quality = 0.92;
  let blob = await canvasToBlob(canvas, "image/jpeg", quality);
  while (blob.size > YOUTUBE_THUMBNAIL_RULES.maximumBytes && quality > 0.5) {
    quality = Math.max(0.5, quality - 0.08);
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }
  return { blob, quality };
}

async function correctImage() {
  if (!state.source || !state.file) return;
  const requestId = state.requestId;
  setWorkspaceState("processing");
  elements.fixButton.disabled = true;
  elements.downloadButton.disabled = true;
  setStatus("Cropping and compressing locally...", "neutral");

  try {
    const crop = calculateCoverCrop(
      state.source.width,
      state.source.height,
      TARGET_WIDTH,
      TARGET_HEIGHT,
    );
    const canvas = document.createElement("canvas");
    canvas.width = TARGET_WIDTH;
    canvas.height = TARGET_HEIGHT;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas processing is unavailable in this browser.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
    context.drawImage(
      state.source,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      TARGET_WIDTH,
      TARGET_HEIGHT,
    );

    const { blob, quality } = await exportCompressedJpeg(canvas);
    if (requestId !== state.requestId) return;
    revokeUrl("correctedUrl");
    state.correctedBlob = blob;
    state.correctedUrl = URL.createObjectURL(blob);
    showPreview(state.correctedUrl);

    const result = validateThumbnail(
      { width: TARGET_WIDTH, height: TARGET_HEIGHT, size: blob.size, type: blob.type },
      YOUTUBE_THUMBNAIL_RULES,
    );
    renderChecks(result);
    elements.correctedValue.textContent = `${TARGET_WIDTH} x ${TARGET_HEIGHT} / ${formatBytes(blob.size)} / ${Math.round(quality * 100)}% quality`;
    const missedSizeTarget = blob.size > YOUTUBE_THUMBNAIL_RULES.maximumBytes;
    elements.downloadButton.disabled = result.status === "fail";
    elements.fixButton.disabled = false;
    setWorkspaceState("ready");
    setStatus(
      missedSizeTarget
        ? "Could not reach 2 MB at the minimum quality. Try a simpler image or compress it before upload."
        : result.status === "pass"
          ? "Corrected thumbnail is ready to download."
          : result.summary,
      result.status,
    );
  } catch (error) {
    if (requestId === state.requestId) {
      elements.fixButton.disabled = false;
      showError(error);
    }
  }
}

function downloadCorrected() {
  if (!state.correctedBlob || !state.correctedUrl || !state.file) return;
  const anchor = document.createElement("a");
  anchor.href = state.correctedUrl;
  anchor.download = buildDownloadName(state.file.name, "jpg");
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setStatus("Download started. Your original file was not changed.", "pass");
}

function resetTool() {
  state.requestId += 1;
  clearLoadedState();
  setPreviewMode("desktop");
  elements.resetButton.disabled = true;
  setWorkspaceState("empty");
  setStatus("No image selected.");
}

async function createSampleFile() {
  const canvas = document.createElement("canvas");
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;
  const context = canvas.getContext("2d", { alpha: false });
  const scaleX = TARGET_WIDTH / 1280;
  const scaleY = TARGET_HEIGHT / 720;
  context.scale(scaleX, scaleY);
  context.fillStyle = "#111827";
  context.fillRect(0, 0, 1280, 720);
  context.fillStyle = "#ef4444";
  context.fillRect(0, 0, 34, 720);
  context.fillStyle = "#ffffff";
  context.font = "700 76px system-ui, sans-serif";
  context.fillText("MAKE IT CLEAR", 92, 290);
  context.fillStyle = "#d1d5db";
  context.font = "36px system-ui, sans-serif";
  context.fillText("A local thumbnail check", 96, 355);
  context.fillStyle = "#22c55e";
  context.beginPath();
  context.arc(1090, 290, 110, 0, Math.PI * 2);
  context.fill();
  const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
  return new File([blob], "sample-thumbnail.jpg", { type: "image/jpeg" });
}

elements.dropZone.addEventListener("click", () => elements.fileInput.click());
elements.dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    elements.fileInput.click();
  }
});
elements.fileInput.addEventListener("change", async () => {
  const [file] = elements.fileInput.files;
  if (!file) return;
  await inspectFile(file);
});

for (const eventName of ["dragenter", "dragover"]) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("is-dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("is-dragging");
  });
}
elements.dropZone.addEventListener("drop", async (event) => {
  const [file] = event.dataTransfer.files;
  if (!file) return;
  await inspectFile(file);
});

elements.sampleButton.addEventListener("click", async () => {
  const intentId = ++state.requestId;
  clearLoadedState();
  elements.resetButton.disabled = false;
  setWorkspaceState("loading");
  setStatus("Creating a local sample...", "neutral");
  try {
    const file = await createSampleFile();
    if (intentId === state.requestId) await inspectFile(file);
  } catch (error) {
    if (intentId === state.requestId) showError(error);
  }
});
elements.fixButton.addEventListener("click", correctImage);
elements.downloadButton.addEventListener("click", downloadCorrected);
elements.resetButton.addEventListener("click", resetTool);

for (const button of elements.previewModes) {
  button.addEventListener("click", () => setPreviewMode(button.dataset.previewMode));
}
