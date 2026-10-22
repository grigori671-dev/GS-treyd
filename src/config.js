'use strict';

function intFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got "${raw}"`);
  }
  return value;
}

function loadConfig() {
  return {
    port: intFromEnv('PORT', 3000),
    upload: {
      // Limit on the raw uploaded file, enforced by multer before decoding.
      maxBytes: intFromEnv('UPLOAD_MAX_BYTES', 10 * 1024 * 1024),
    },
    image: {
      // Longest side of the output; larger images are scaled down, smaller ones are kept as is.
      maxDimension: intFromEnv('IMAGE_MAX_DIMENSION', 2560),
      quality: intFromEnv('WEBP_QUALITY', 80),
      // Guards against decompression bombs (tiny file, huge pixel count).
      maxInputPixels: intFromEnv('IMAGE_MAX_INPUT_PIXELS', 50_000_000),
    },
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.AWS_REGION || 'us-east-1',
      // Optional: MinIO / Cloudflare R2 / any S3-compatible endpoint.
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      // Optional: CDN or public bucket URL used to build links in responses.
      publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || undefined,
      keyPrefix: process.env.S3_KEY_PREFIX || 'images',
    },
  };
}

module.exports = { loadConfig };
