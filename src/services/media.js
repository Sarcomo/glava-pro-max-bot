const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const config = require('../config');
const { httpsRequest } = require('../httpsClient');
const { reply } = require('../utils/messenger');
const { buildKeyboard, callbackButton, BTN, keepMenuButton } = require('../utils/keyboard');

const uploadTokenCache = new Map();

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

async function getUploadUrl(type) {
  const url = new URL(`${config.maxApiBase}/uploads`);
  url.searchParams.set('type', type);

  const response = await httpsRequest(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: config.maxBotToken(),
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  if (!response.ok || !data?.url) {
    throw new Error(`Upload URL error (${type}): ${JSON.stringify(data)}`);
  }
  return data.url;
}

function extractUploadToken(data, text) {
  if (data?.token) return data.token;
  if (data?.photos && typeof data.photos === 'object') {
    const first = Object.values(data.photos)[0];
    if (first?.token) return first.token;
  }
  throw new Error(`No token in upload response: ${text.slice(0, 200)}`);
}

function uploadFileMultipart(uploadUrl, filePath) {
  const fileName = path.basename(filePath);
  const mime = getMimeType(filePath);
  const fileData = fs.readFileSync(filePath);
  const boundary = `----MaxBot${Date.now()}`;
  const prefix = `--${boundary}\r\nContent-Disposition: form-data; name="data"; filename="${fileName}"\r\nContent-Type: ${mime}\r\n\r\n`;
  const suffix = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([Buffer.from(prefix), fileData, Buffer.from(suffix)]);

  return new Promise((resolve, reject) => {
    const url = new URL(uploadUrl);
    const lib = url.protocol === 'https:' ? https : http;

    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          try {
            const data = JSON.parse(text);
            resolve(extractUploadToken(data, text));
          } catch {
            reject(new Error(`Upload response parse error: ${text.slice(0, 200)}`));
          }
        });
      },
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function uploadMedia(filePath, type, { retries = 3 } = {}) {
  const absPath = path.resolve(filePath);
  const cacheKey = `${type}:${absPath}`;
  const cached = uploadTokenCache.get(cacheKey);
  if (cached) return cached;

  const uploadUrl = await getUploadUrl(type);
  let token = null;
  let lastError = null;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      token = await uploadFileMultipart(uploadUrl, absPath);
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
      break;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
    }
  }

  if (!token) {
    throw lastError || new Error(`${type} upload failed`);
  }

  uploadTokenCache.set(cacheKey, token);
  return token;
}

async function uploadImage(filePath, options) {
  return uploadMedia(filePath, 'image', options);
}

function imageAttachment(token) {
  return { type: 'image', payload: { token } };
}

function fileAttachment(token) {
  return { type: 'file', payload: { token } };
}

async function getProjectImageAttachment(project) {
  if (!project?.imagePath) return null;
  const absPath = path.resolve(project.imagePath);
  if (!fs.existsSync(absPath)) return null;

  try {
    const token = await uploadImage(absPath);
    return imageAttachment(token);
  } catch (err) {
    console.error(`[MEDIA] ${project.id}:`, err.message);
    return null;
  }
}

async function getStubEstimatePdfAttachment() {
  const absPath = path.resolve(config.stubEstimatePdfPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Stub PDF not found: ${absPath}`);
  }

  const token = await uploadMedia(absPath, 'file');
  return fileAttachment(token);
}

function projectPdfKeyboard(project) {
  const rows = [
    [keepMenuButton(BTN.mainMenu, 'main')],
  ];
  if (project?.id) {
    rows.unshift([callbackButton('◀️ К проекту', `catalog:view:${project.id}`)]);
  }
  return buildKeyboard(rows);
}

async function sendStubEstimatePdf(ctx, project) {
  const projectName = project?.name || 'проекту';

  try {
    const file = await getStubEstimatePdfAttachment();
    await reply(
      ctx,
      `Смета PDF по **${projectName}**:`,
      [file, ...projectPdfKeyboard(project)],
      { keepMessage: Boolean(ctx.callbackId) },
    );
  } catch (err) {
    console.error('[MEDIA] PDF:', err.message);
    await reply(
      ctx,
      'Не удалось отправить PDF. Попробуйте позже или напишите менеджеру.',
      projectPdfKeyboard(project),
      { keepMessage: Boolean(ctx.callbackId) },
    );
  }
}

async function warmupStubEstimatePdf() {
  try {
    await getStubEstimatePdfAttachment();
    console.log('[MEDIA] Stub PDF uploaded');
  } catch (err) {
    console.error('[MEDIA] Stub PDF warmup failed:', err.message);
  }
}

module.exports = {
  uploadImage,
  uploadMedia,
  getProjectImageAttachment,
  getStubEstimatePdfAttachment,
  sendStubEstimatePdf,
  warmupStubEstimatePdf,
  imageAttachment,
  fileAttachment,
};
