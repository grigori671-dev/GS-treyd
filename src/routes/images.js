'use strict';

const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');
const { convertToWebp, UnsupportedImageError } = require('../image/convert');

function buildKey(prefix, now = new Date()) {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${prefix}/${yyyy}/${mm}/${crypto.randomUUID()}.webp`;
}

function createImagesRouter({ storage, config }) {
  const router = express.Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.upload.maxBytes, files: 1 },
  });

  // POST /images, multipart/form-data with the file in the "image" field.
  router.post('/', upload.single('image'), async (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Missing file in "image" field' });
    }

    try {
      const image = await convertToWebp(req.file.buffer, config.image);
      const key = buildKey(config.s3.keyPrefix);
      const stored = await storage.put(key, image.buffer, image.contentType);

      return res.status(201).json({
        key: stored.key,
        url: stored.url,
        contentType: image.contentType,
        width: image.width,
        height: image.height,
        size: image.size,
        animated: image.animated,
        sourceFormat: image.sourceFormat,
      });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

function imageErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: err.message, code: err.code });
  }
  if (err instanceof UnsupportedImageError) {
    return res.status(415).json({ error: err.message });
  }
  return next(err);
}

module.exports = { createImagesRouter, imageErrorHandler, buildKey };
