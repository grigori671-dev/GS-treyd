'use strict';

const sharp = require('sharp');

function testConfig(overrides = {}) {
  return {
    port: 0,
    upload: { maxBytes: 5 * 1024 * 1024 },
    image: { maxDimension: 1024, quality: 80, maxInputPixels: 50_000_000 },
    s3: { bucket: 'test-bucket', keyPrefix: 'images' },
    ...overrides,
  };
}

class MemoryStorage {
  constructor() {
    this.objects = new Map();
  }

  async put(key, body, contentType) {
    this.objects.set(key, { body, contentType });
    return { key, url: `https://cdn.test/${key}` };
  }
}

function solid(width, height, { alpha = false } = {}) {
  return sharp({
    create: {
      width,
      height,
      channels: alpha ? 4 : 3,
      background: alpha ? { r: 255, g: 0, b: 0, alpha: 0.5 } : { r: 0, g: 128, b: 255 },
    },
  });
}

module.exports = { testConfig, MemoryStorage, solid };
