export const YOUTUBE_THUMBNAIL_RULES = Object.freeze({
  recommendedWidth: 3840,
  recommendedHeight: 2160,
  minimumWidth: 640,
  targetRatio: 16 / 9,
  ratioTolerance: 0.01,
  maximumBytes: 2 * 1024 * 1024,
  supportedTypes: Object.freeze(["image/jpeg", "image/png"]),
  sourceUrl: "https://support.google.com/youtube/answer/72431?hl=en",
  reviewedAt: "2026-07-12",
});
