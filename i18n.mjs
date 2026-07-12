function deepFreeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) {
    if (child && (typeof child === "object" || typeof child === "function") && !Object.isFrozen(child)) {
      deepFreeze(child);
    }
  }
  return value;
}

export const TRANSLATIONS = deepFreeze({
  en: {
    status: { pass: "Pass", warning: "Review", fail: "Fix needed", empty: "Waiting" },
    checkStatus: { pass: "Pass", warning: "Warning", fail: "Fail" },
    summary: {
      pass: "Ready to upload.",
      warning: "Usable, but improvements are recommended.",
      fail: "Fix the failed checks before uploading.",
    },
    checks: {
      dimensions: {
        label: "Dimensions",
        invalid: "Invalid dimensions",
        expected: (width, height, minimumWidth) => `${width} x ${height} px recommended; ${minimumWidth} px minimum width`,
      },
      ratio: { label: "Aspect ratio", unknown: "Unknown", expected: "16:9 recommended" },
      "file-size": { label: "File size", expected: (maximum) => `${maximum} or less` },
      format: { label: "File format", unknown: "Unknown", expected: "JPEG or PNG" },
    },
    empty: { results: "Select an image to check dimensions, ratio, size, and format." },
    comparison: { notCreated: "Not created", quality: (value) => `${value}% quality` },
    activity: {
      noImage: "No image selected.",
      reading: "Reading image details locally...",
      processing: "Cropping and compressing locally...",
      sizeTargetMissed: "Could not reach 2 MB at the minimum quality. Try a simpler image or compress it before upload.",
      correctedReady: "Corrected thumbnail is ready to download.",
      downloadStarted: "Download started. Your original file was not changed.",
      creatingSample: "Creating a local sample...",
    },
    errors: {
      decode: "The browser could not decode this image.",
      jpegScanLimit: "Could not find JPEG dimensions within the 16 MB metadata scan limit.",
      jpegCompleteHeader: "Could not read JPEG dimensions from the complete file header.",
      jpegEmpty: "The JPEG file is empty.",
      unsupportedFormat: "Choose a JPEG or PNG file. Other formats are not supported by this checker yet.",
      tooLarge: "This image is too large to decode safely. Choose an image at or below 24 megapixels.",
      dimensionsMismatch: "The decoded image dimensions do not match its file header.",
      createCorrected: "The browser could not create the corrected image.",
      canvasUnavailable: "Canvas processing is unavailable in this browser.",
      invalidPngHeader: "Invalid PNG header.",
      invalidPngChunk: "PNG header does not contain a valid IHDR chunk.",
      invalidPngDimensions: "Invalid PNG dimensions.",
      invalidJpegHeader: "Invalid JPEG header.",
      invalidJpegSegment: "Invalid JPEG segment length.",
      jpegMoreBytes: "More JPEG header bytes are required.",
      jpegFindDimensions: "More JPEG header bytes are required to find dimensions.",
      unsupportedHeader: "Unsupported image header type.",
    },
  },
  "zh-CN": {
    status: { pass: "通过", warning: "建议检查", fail: "需要修正", empty: "等待中" },
    checkStatus: { pass: "通过", warning: "警告", fail: "未通过" },
    summary: {
      pass: "可以上传。",
      warning: "可以使用，但建议进一步优化。",
      fail: "请先修正未通过的检查项。",
    },
    checks: {
      dimensions: {
        label: "尺寸",
        invalid: "尺寸无效",
        expected: (width, height, minimumWidth) => `建议 ${width} x ${height} px；最小宽度 ${minimumWidth} px`,
      },
      ratio: { label: "宽高比", unknown: "未知", expected: "建议 16:9" },
      "file-size": { label: "文件大小", expected: (maximum) => `不超过 ${maximum}` },
      format: { label: "文件格式", unknown: "未知", expected: "JPEG 或 PNG" },
    },
    empty: { results: "选择图片后即可检查尺寸、宽高比、大小和格式。" },
    comparison: { notCreated: "尚未生成", quality: (value) => `质量 ${value}%` },
    activity: {
      noImage: "尚未选择图片。",
      reading: "正在本地读取图片信息...",
      processing: "正在本地裁剪并压缩...",
      sizeTargetMissed: "最低质量下仍无法压缩至 2 MB。请尝试内容更简单的图片，或先行压缩。",
      correctedReady: "修正后的缩略图可以下载了。",
      downloadStarted: "下载已开始，原始文件未被修改。",
      creatingSample: "正在本地生成示例...",
    },
    errors: {
      decode: "浏览器无法解码此图片。",
      jpegScanLimit: "在 16 MB 元数据扫描范围内未找到 JPEG 尺寸。",
      jpegCompleteHeader: "无法从完整文件头读取 JPEG 尺寸。",
      jpegEmpty: "JPEG 文件为空。",
      unsupportedFormat: "请选择 JPEG 或 PNG 文件，此工具暂不支持其他格式。",
      tooLarge: "图片过大，无法安全解码。请选择不超过 2400 万像素的图片。",
      dimensionsMismatch: "解码后的图片尺寸与文件头不一致。",
      createCorrected: "浏览器无法生成修正后的图片。",
      canvasUnavailable: "当前浏览器不支持 Canvas 图片处理。",
      invalidPngHeader: "PNG 文件头无效。",
      invalidPngChunk: "PNG 文件头不包含有效的 IHDR 数据块。",
      invalidPngDimensions: "PNG 尺寸无效。",
      invalidJpegHeader: "JPEG 文件头无效。",
      invalidJpegSegment: "JPEG 数据段长度无效。",
      jpegMoreBytes: "需要读取更多 JPEG 文件头数据。",
      jpegFindDimensions: "需要更多 JPEG 文件头数据才能获取尺寸。",
      unsupportedHeader: "不支持此图片文件头类型。",
    },
  },
});

export function getMessages(language = "en") {
  return /^zh(?:-|$)/i.test(language) ? TRANSLATIONS["zh-CN"] : TRANSLATIONS.en;
}
