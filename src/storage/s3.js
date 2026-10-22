'use strict';

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

class S3Storage {
  constructor({ client, bucket, region, publicBaseUrl }) {
    if (!bucket) throw new Error('S3 bucket is not configured (S3_BUCKET)');
    this.client = client;
    this.bucket = bucket;
    this.publicBaseUrl =
      publicBaseUrl?.replace(/\/+$/, '') ?? `https://${bucket}.s3.${region}.amazonaws.com`;
  }

  static fromConfig(s3Config) {
    const client = new S3Client({
      region: s3Config.region,
      endpoint: s3Config.endpoint,
      forcePathStyle: s3Config.forcePathStyle,
    });
    return new S3Storage({ client, ...s3Config });
  }

  async put(key, body, contentType) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Keys are random and never overwritten, so the object can be cached forever.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return { key, url: `${this.publicBaseUrl}/${key}` };
  }
}

module.exports = { S3Storage };
