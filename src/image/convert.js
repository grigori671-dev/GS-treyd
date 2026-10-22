'use strict';

const sharp = require('sharp');

// Formats we accept as input. Detected from file contents, never from the
// extension or the client-supplied Content-Type.
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'heif', 'tiff']);

class UnsupportedImageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsupportedImageError';
  }
}

async function readMetadata(buffer, limitInputPixels) {
  try {
    return await sharp(buffer, { limitInputPixels }).metadata();
  } catch (err) {
    throw new UnsupportedImageError(`Not a readable image: ${err.message}`);
  }
}

/**
 * Converts an uploaded image to WebP.
 *
 * - applies EXIF orientation, then drops all metadata (EXIF/GPS, ICC is converted to sRGB)
 * - scales down so the longest side is at most `maxDimension`
 * - keeps transparency and animation
 */
async function convertToWebp(buffer, { quality, maxDimension, maxInputPixels }) {
  const meta = await readMetadata(buffer, maxInputPixels);
  if (!ACCEPTED_FORMATS.has(meta.format)) {
    throw new UnsupportedImageError(`Unsupported image format: ${meta.format}`);
  }

  const animated = (meta.pages ?? 1) > 1;

  let output;
  try {
    output = await sharp(buffer, { animated, limitInputPixels: maxInputPixels })
      .rotate()
      .resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });
  } catch (err) {
    throw new UnsupportedImageError(`Failed to process image: ${err.message}`);
  }

  const { data, info } = output;
  return {
    buffer: data,
    contentType: 'image/webp',
    width: info.width,
    // For animated images `info.height` is the height of all frames stacked.
    height: info.pageHeight ?? info.height,
    size: info.size,
    animated,
    sourceFormat: meta.format,
  };
}

module.exports = { convertToWebp, UnsupportedImageError, ACCEPTED_FORMATS };
