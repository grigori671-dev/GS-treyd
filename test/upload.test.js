'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const sharp = require('sharp');
const { createApp } = require('../src/app');
const { testConfig, MemoryStorage, solid } = require('./helpers');

function setup(configOverrides) {
  const storage = new MemoryStorage();
  const app = createApp({ storage, config: testConfig(configOverrides) });
  return { app, storage };
}

test('POST /images converts the upload and stores WebP', async () => {
  const { app, storage } = setup();
  const jpeg = await solid(2048, 1024).jpeg().toBuffer();

  const res = await request(app).post('/images').attach('image', jpeg, 'photo.jpg');

  assert.equal(res.status, 201);
  assert.match(res.body.key, /^images\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/);
  assert.equal(res.body.url, `https://cdn.test/${res.body.key}`);
  assert.equal(res.body.width, 1024);
  assert.equal(res.body.height, 512);
  assert.equal(res.body.sourceFormat, 'jpeg');

  const stored = storage.objects.get(res.body.key);
  assert.equal(stored.contentType, 'image/webp');
  assert.equal((await sharp(stored.body).metadata()).format, 'webp');
  assert.equal(stored.body.length, res.body.size);
});

test('detects format from contents, not the file name', async () => {
  const { app } = setup();
  const png = await solid(10, 10).png().toBuffer();

  const res = await request(app).post('/images').attach('image', png, 'misnamed.jpg');

  assert.equal(res.status, 201);
  assert.equal(res.body.sourceFormat, 'png');
});

test('returns 400 when the file is missing', async () => {
  const { app } = setup();
  const res = await request(app).post('/images').field('foo', 'bar');
  assert.equal(res.status, 400);
});

test('returns 400 when the file is sent under the wrong field', async () => {
  const { app } = setup();
  const png = await solid(10, 10).png().toBuffer();
  const res = await request(app).post('/images').attach('file', png, 'a.png');
  assert.equal(res.status, 400);
});

test('returns 415 for a non-image file', async () => {
  const { app, storage } = setup();
  const res = await request(app)
    .post('/images')
    .attach('image', Buffer.from('%PDF-1.7 fake'), { filename: 'doc.png', contentType: 'image/png' });

  assert.equal(res.status, 415);
  assert.equal(storage.objects.size, 0);
});

test('returns 413 when the file is too large', async () => {
  const { app } = setup({ upload: { maxBytes: 1024 } });
  const big = await solid(500, 500).png({ compressionLevel: 0 }).toBuffer();

  const res = await request(app).post('/images').attach('image', big, 'big.png');

  assert.equal(res.status, 413);
});

test('returns 500 when storage fails', async () => {
  const { app, storage } = setup();
  storage.put = async () => {
    throw new Error('S3 is down');
  };
  const png = await solid(10, 10).png().toBuffer();

  const original = console.error;
  console.error = () => {};
  try {
    const res = await request(app).post('/images').attach('image', png, 'a.png');
    assert.equal(res.status, 500);
  } finally {
    console.error = original;
  }
});
