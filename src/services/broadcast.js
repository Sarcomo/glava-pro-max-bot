const fs = require('fs/promises');
const path = require('path');
const config = require('../config');
const { sendMessage, sendMessageToUser } = require('../maxApi');
const { getActiveSubscribers, markSubscriberInactive } = require('./subscribers');
const { buildKeyboard, linkButton, callbackButton, BTN } = require('../utils/keyboard');

function historyPath() {
  return path.resolve(config.broadcastHistoryPath);
}

async function ensureHistory() {
  const filePath = historyPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, '[]\n', 'utf8');
  }
  return filePath;
}

async function readHistory() {
  const filePath = await ensureHistory();
  const raw = await fs.readFile(filePath, 'utf8');
  const data = JSON.parse(raw || '[]');
  return Array.isArray(data) ? data : [];
}

async function appendHistory(entry) {
  const list = await readHistory();
  list.unshift(entry);
  await fs.writeFile(await ensureHistory(), `${JSON.stringify(list.slice(0, 50), null, 2)}\n`, 'utf8');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildBroadcastAttachments({ withCatalogButton } = {}) {
  if (!withCatalogButton) return null;
  const rows = [];
  if (config.miniAppUrl) {
    rows.push([linkButton('📋 Открыть каталог', config.miniAppUrl)]);
  } else {
    rows.push([callbackButton(BTN.catalog, 'menu:catalog')]);
  }
  rows.push([callbackButton(BTN.mainMenu, 'menu:main')]);
  return buildKeyboard(rows);
}

/**
 * Рассылка всем активным подписчикам.
 * @returns {{ sent: number, failed: number, total: number, errors: string[] }}
 */
async function sendBroadcast({ text, withCatalogButton = true } = {}) {
  const cleanText = String(text || '').trim();
  if (cleanText.length < 3) {
    const err = new Error('text_required');
    err.code = 'text_required';
    throw err;
  }

  const subscribers = await getActiveSubscribers();
  const attachments = buildBroadcastAttachments({ withCatalogButton });
  const result = {
    sent: 0,
    failed: 0,
    total: subscribers.length,
    errors: [],
  };

  for (let i = 0; i < subscribers.length; i += 1) {
    const sub = subscribers[i];
    try {
      if (sub.user_id) {
        await sendMessageToUser(sub.user_id, cleanText, attachments);
      } else if (sub.chat_id) {
        await sendMessage(sub.chat_id, cleanText, attachments);
      } else {
        result.failed += 1;
        continue;
      }
      result.sent += 1;
    } catch (err) {
      result.failed += 1;
      const msg = err?.message || String(err);
      if (result.errors.length < 10) {
        result.errors.push(`${sub.user_id || sub.chat_id}: ${msg}`);
      }
      if (/dialog\.not\.found|chat\.not\.found|403|forbidden/i.test(msg)) {
        await markSubscriberInactive({
          userId: sub.user_id,
          chatId: sub.chat_id,
        });
      }
    }

    // пауза, чтобы не упираться в лимиты API
    if (i < subscribers.length - 1) {
      await sleep(120);
    }
  }

  await appendHistory({
    datetime: new Date().toISOString(),
    text: cleanText,
    withCatalogButton: Boolean(withCatalogButton),
    ...result,
  });

  return result;
}

module.exports = {
  sendBroadcast,
  readHistory,
  buildBroadcastAttachments,
};
