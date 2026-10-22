'use strict';

const { loadConfig } = require('./config');
const { createApp } = require('./app');
const { S3Storage } = require('./storage/s3');

const config = loadConfig();
const storage = S3Storage.fromConfig(config.s3);
const app = createApp({ storage, config });

app.listen(config.port, () => {
  console.log(`Listening on http://localhost:${config.port}`);
});
