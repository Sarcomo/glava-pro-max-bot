const express = require('express');
const crypto = require('crypto');
const path = require('path');
const config = require('./config');
const { processUpdate } = require('./handlers/updateHandler');
const { describeMaxError } = require('./maxApi');
const { registerAdminRoutes } = require('./routes/admin');
const { registerMiniAppRoutes } = require('./routes/miniApp');

function verifyWebhookSecret(headerValue) {
  const expected = config.maxWebhookSecret();
  if (!headerValue || !expected) return false;
  const received = Buffer.from(String(headerValue));
  const expectedBuf = Buffer.from(String(expected));
  if (received.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(received, expectedBuf);
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true, service: 'glava-pro-max-bot' });
  });

  registerMiniAppRoutes(app);

  const miniAppDir = path.join(__dirname, '..', 'public', 'app');
  app.get(['/app', '/app/'], (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(miniAppDir, 'index.html'));
  });
  app.use('/app', express.static(miniAppDir, {
    maxAge: 0,
    etag: false,
    lastModified: false,
    setHeaders(res) {
      res.set('Cache-Control', 'no-store');
    },
  }));

  registerAdminRoutes(app);

  app.post('/webhook', (req, res) => {
    const secret = req.get('X-Max-Bot-Api-Secret');

    if (!verifyWebhookSecret(secret)) {
      console.warn('Webhook rejected: invalid secret');
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    res.status(200).json({ ok: true });

    const update = req.body;
    setImmediate(() => {
      processUpdate(update).catch((err) => {
        console.error('Update processing error:', describeMaxError(err));
      });
    });
  });

  app.use((err, _req, res, _next) => {
    console.error('Express error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ ok: false });
    }
  });

  return app;
}

module.exports = { createApp };
