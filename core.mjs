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
