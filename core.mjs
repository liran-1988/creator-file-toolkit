function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function aggregateStatus(checks) {
  if (checks.some((check) => check.status === "fail")) return "fail";
  if (checks.some((check) => check.status === "warning")) return "warning";
  return "pass";
}

export function validateThumbnail(metadata, rules) {
  const { width, height, size, type } = metadata;
  const validDimensions = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
  const ratio = validDimensions ? width / height : 0;
  const ratioDifference = Math.abs(ratio - rules.targetRatio);

  let dimensionStatus = "pass";
  if (!validDimensions || width < rules.minimumWidth) {
    dimensionStatus = "fail";
  } else if (width < rules.recommendedWidth || height < rules.recommendedHeight) {
    dimensionStatus = "warning";
  }

  const checks = [
    {
      id: "dimensions",
      status: dimensionStatus,
      label: "Dimensions",
      actual: validDimensions ? `${width} x ${height} px` : "Invalid dimensions",
      expected: `${rules.recommendedWidth} x ${rules.recommendedHeight} px recommended; ${rules.minimumWidth} px minimum width`,
    },
    {
      id: "ratio",
      status: validDimensions && ratioDifference <= rules.ratioTolerance ? "pass" : "warning",
      label: "Aspect ratio",
      actual: validDimensions ? `${ratio.toFixed(3)}:1` : "Unknown",
      expected: "16:9 recommended",
    },
    {
      id: "file-size",
      status: Number.isFinite(size) && size >= 0 && size <= rules.maximumBytes ? "pass" : "fail",
      label: "File size",
      actual: formatBytes(size),
      expected: `${formatBytes(rules.maximumBytes)} or less`,
    },
    {
      id: "format",
      status: rules.supportedTypes.includes(type) ? "pass" : "fail",
      label: "File format",
      actual: type || "Unknown",
      expected: "JPEG or PNG",
    },
  ];

  const status = aggregateStatus(checks);
  const summary = {
    pass: "Ready to upload.",
    warning: "Usable, but improvements are recommended.",
    fail: "Fix the failed checks before uploading.",
  }[status];

  return { status, summary, checks };
}

function assertPositiveDimensions(values) {
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new RangeError("Dimensions must be positive finite numbers.");
  }
}

export function calculateCoverCrop(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  assertPositiveDimensions([sourceWidth, sourceHeight, targetWidth, targetHeight]);

  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;

  if (Math.abs(sourceRatio - targetRatio) < Number.EPSILON * 10) {
    return { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
  }

  if (sourceRatio > targetRatio) {
    const width = Math.round(sourceHeight * targetRatio);
    return {
      x: Math.round((sourceWidth - width) / 2),
      y: 0,
      width,
      height: sourceHeight,
    };
  }

  const height = Math.round(sourceWidth / targetRatio);
  return {
    x: 0,
    y: Math.round((sourceHeight - height) / 2),
    width: sourceWidth,
    height,
  };
}

export function calculateContainSize(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  assertPositiveDimensions([sourceWidth, sourceHeight, targetWidth, targetHeight]);
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

export function buildDownloadName(originalName, extension) {
  const cleanExtension = String(extension || "jpg")
    .toLowerCase()
    .replace(/^\.+/, "")
    .replace(/[^a-z0-9]/g, "") || "jpg";
  const baseName = String(originalName || "")
    .replace(/\.[^.]*$/, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "thumbnail";

  return `${baseName}-youtube-thumbnail.${cleanExtension}`;
}

function readPngDimensions(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 24 || signature.some((value, index) => bytes[index] !== value)) {
    throw new Error("Invalid PNG header.");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (!width || !height) throw new Error("Invalid PNG dimensions.");
  return { width, height };
}

function readJpegDimensions(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error("Invalid JPEG header.");
  }

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3,
    0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb,
    0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;

  while (offset + 3 < bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;

    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (offset + 1 >= bytes.length) break;

    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;
    if (startOfFrameMarkers.has(marker)) {
      if (segmentLength < 7) break;
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      if (width && height) return { width, height };
      break;
    }
    offset += segmentLength;
  }

  throw new Error("Could not read JPEG dimensions from the file header.");
}

export function readImageDimensionsFromBytes(input, mimeType) {
  const bytes = input instanceof Uint8Array
    ? input
    : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  if (mimeType === "image/png") return readPngDimensions(bytes);
  if (mimeType === "image/jpeg") return readJpegDimensions(bytes);
  throw new Error("Unsupported image header type.");
}
