'use strict';

const express = require('express');
const { createImagesRouter, imageErrorHandler } = require('./routes/images');

function createApp({ storage, config }) {
  const app = express();

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use('/images', createImagesRouter({ storage, config }));

  app.use(imageErrorHandler);
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
