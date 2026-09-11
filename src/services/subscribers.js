const fs = require('fs/promises');
const path = require('path');
const config = require('../config');

function subscribersPath() {
  return path.resolve(config.subscribersJsonPath);
}

async function ensureStore() {
  const filePath = subscribersPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, '[]\n', 'utf8');
  }
  return filePath;
}

async function readSubscribers() {
  const filePath = await ensureStore();
  const raw = await fs.readFile(filePath, 'utf8');
  const data = JSON.parse(raw || '[]');
  return Array.isArray(data) ? data : [];
}

async function writeSubscribers(list) {
  const filePath = await ensureStore();
  await fs.writeFile(filePath, `${JSON.stringify(list, null, 2)}\n`, 'utf8');
}

/**
 * Сохраняет/обновляет подписчика. Нужен хотя бы userId или chatId.
 */
async function upsertSubscriber({ userId, chatId, name } = {}) {
  const uid = Number(userId) || 0;
  const cid = Number(chatId) || 0;
  if (!uid && !cid) return null;

  const list = await readSubscribers();
  const now = new Date().toISOString();
  const idx = list.findIndex((s) => (
    (uid && s.user_id === uid) || (cid && s.chat_id === cid)
  ));

  if (idx >= 0) {
    const prev = list[idx];
    list[idx] = {
      ...prev,
      user_id: uid || prev.user_id || 0,
      chat_id: cid || prev.chat_id || 0,
      name: String(name || prev.name || '').trim(),
      last_seen: now,
      active: true,
    };
  } else {
    list.push({
      user_id: uid,
      chat_id: cid,
      name: String(name || '').trim(),
      first_seen: now,
      last_seen: now,
      active: true,
    });
  }

  await writeSubscribers(list);
  return list[idx >= 0 ? idx : list.length - 1];
}

async function markSubscriberInactive({ userId, chatId } = {}) {
  const list = await readSubscribers();
  let changed = false;
  for (const s of list) {
    if ((userId && s.user_id === Number(userId)) || (chatId && s.chat_id === Number(chatId))) {
      s.active = false;
      s.inactive_at = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) await writeSubscribers(list);
}

async function getActiveSubscribers() {
  const list = await readSubscribers();
  return list.filter((s) => s.active !== false && (s.user_id || s.chat_id));
}

async function countSubscribers() {
  const active = await getActiveSubscribers();
  return { total: (await readSubscribers()).length, active: active.length };
}

module.exports = {
  readSubscribers,
  upsertSubscriber,
  markSubscriberInactive,
  getActiveSubscribers,
  countSubscribers,
};
