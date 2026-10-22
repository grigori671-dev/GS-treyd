'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { convertToWebp, UnsupportedImageError } = require('../src/image/convert');
const { solid } = require('./helpers');

const options = { quality: 80, maxDimension: 1024, maxInputPixels: 50_000_000 };

test('converts JPEG to WebP without changing small dimensions', async () => {
  const input = await solid(640, 480).jpeg().toBuffer();
  const out = await convertToWebp(input, options);

  assert.equal(out.contentType, 'image/webp');
  assert.equal(out.sourceFormat, 'jpeg');
  assert.equal(out.width, 640);
  assert.equal(out.height, 480);
  assert.equal((await sharp(out.buffer).metadata()).format, 'webp');
});

test('scales down so the longest side fits maxDimension', async () => {
  const input = await solid(4000, 2000).png().toBuffer();
  const out = await convertToWebp(input, options);

  assert.equal(out.width, 1024);
  assert.equal(out.height, 512);
});

test('keeps transparency from PNG', async () => {
  const input = await solid(100, 100, { alpha: true }).png().toBuffer();
  const out = await convertToWebp(input, options);

  assert.equal((await sharp(out.buffer).metadata()).hasAlpha, true);
});

test('applies EXIF orientation and strips metadata', async () => {
  // Stored as 300x100 landscape, orientation 6 means "rotate 90° clockwise to display".
  const input = await solid(300, 100).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const out = await convertToWebp(input, options);

  assert.equal(out.width, 100);
  assert.equal(out.height, 300);
  const meta = await sharp(out.buffer).metadata();
  assert.equal(meta.exif, undefined);
  assert.equal(meta.orientation, undefined);
});

test('keeps animation', async () => {
  const frames = await Promise.all([solid(50, 40).png().toBuffer(), solid(50, 40, { alpha: true }).png().toBuffer()]);
  const gif = await sharp(frames, { join: { animated: true } }).gif().toBuffer();
  const out = await convertToWebp(gif, options);

  assert.equal(out.animated, true);
  assert.equal(out.width, 50);
  assert.equal(out.height, 40);
  assert.equal((await sharp(out.buffer).metadata()).pages, 2);
});

test('rejects non-image data', async () => {
  await assert.rejects(convertToWebp(Buffer.from('not an image'), options), UnsupportedImageError);
});

test('rejects images over the pixel limit', async () => {
  const input = await solid(2000, 2000).png().toBuffer();
  await assert.rejects(
    convertToWebp(input, { ...options, maxInputPixels: 1_000_000 }),
    UnsupportedImageError,
  );
});
