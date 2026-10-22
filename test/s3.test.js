'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { S3Storage } = require('../src/storage/s3');

function fakeClient() {
  const sent = [];
  return { sent, send: async (command) => sent.push(command) };
}

test('put sends PutObjectCommand with content type and cache headers', async () => {
  const client = fakeClient();
  const storage = new S3Storage({ client, bucket: 'b', region: 'eu-central-1' });

  const result = await storage.put('images/x.webp', Buffer.from('data'), 'image/webp');

  assert.equal(client.sent.length, 1);
  const [command] = client.sent;
  assert.ok(command instanceof PutObjectCommand);
  assert.equal(command.input.Bucket, 'b');
  assert.equal(command.input.Key, 'images/x.webp');
  assert.equal(command.input.ContentType, 'image/webp');
  assert.match(command.input.CacheControl, /immutable/);
  assert.equal(result.url, 'https://b.s3.eu-central-1.amazonaws.com/images/x.webp');
});

test('uses publicBaseUrl for links when set', async () => {
  const storage = new S3Storage({
    client: fakeClient(),
    bucket: 'b',
    region: 'eu-central-1',
    publicBaseUrl: 'https://cdn.example.com/',
  });

  const result = await storage.put('images/x.webp', Buffer.from('data'), 'image/webp');

  assert.equal(result.url, 'https://cdn.example.com/images/x.webp');
});

test('requires a bucket', () => {
  assert.throws(() => new S3Storage({ client: fakeClient(), region: 'us-east-1' }), /S3_BUCKET/);
});
