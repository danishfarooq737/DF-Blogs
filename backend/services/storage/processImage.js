const sharp = require('sharp');

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const MAX_INPUT_PIXELS = 40_000_000;

/**
 * Verifies the bytes really are a JPEG/PNG/WebP image (not just a renamed file),
 * then re-encodes to an optimised, metadata-free WebP no wider than 1600px.
 * Throws when the buffer is not an acceptable image.
 */
async function processImage(buffer) {
  const options = { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' };
  const { format } = await sharp(buffer, options).metadata();
  if (!ALLOWED_FORMATS.has(format)) throw new Error('Unsupported image format');
  return sharp(buffer, options)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

module.exports = { processImage };
