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
