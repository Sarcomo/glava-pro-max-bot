const { getState } = require('../services/state');
const { showMainMenu, showManagerInfo, showWelcomeStart } = require('../flows/menu');
const { startQuiz, handleQuizCallback, finalizeQuizLead } = require('../flows/quiz');
const { parseContactText, extractContactFromAttachments } = require('../utils/contact');
const { startCostCalc, handleCostCallback, handleCostContact } = require('../flows/cost');
const { showCatalog, handleCatalogAction, handleCatalogOrderContact, handleCatalogManagerContact } = require('../flows/catalog');
const { showFaq, showFaqItem, handleFaqConsult, handleFaqContact } = require('../flows/faq');
const { startExcursion, handleExcursionMessage, handleExcursionFormat } = require('../flows/excursion');
const { handleSiteEvalMessage } = require('../flows/siteEval');
const { startManagerLead, handleManagerContact } = require('../flows/manager');
const { makeCtx, reply } = require('../utils/messenger');
const { upsertSubscriber } = require('../services/subscribers');

/** Антидубль входящих update (повтор webhook / двойной тап по кнопке). */
const seenUpdateKeys = new Map();
const UPDATE_DEDUP_MS = 4000;
const ACTION_DEDUP_MS = 1500;

function rememberUpdateKey(key, ttlMs = UPDATE_DEDUP_MS) {
  const now = Date.now();
  const prev = seenUpdateKeys.get(key) || 0;
  if (now - prev < ttlMs) return false;
  seenUpdateKeys.set(key, now);
  if (seenUpdateKeys.size > 800) {
    for (const [k, ts] of seenUpdateKeys) {
      if (now - ts > UPDATE_DEDUP_MS * 5) seenUpdateKeys.delete(k);
    }
  }
  return true;
}

function getUpdateDedupKey(update) {
  const type = update?.update_type;
  if (update?.update_id != null) return `id:${update.update_id}`;
  if (type === 'message_callback') {
    const cb = update.callback;
    if (cb?.callback_id) return `cb:${cb.callback_id}`;
    const chatId = getChatId(update);
    const payload = cb?.payload || '';
    return `cb-payload:${chatId}:${payload}`;
  }
  if (type === 'message_created') {
    const mid = update.message?.body?.mid || update.message?.message_id;
    if (mid) return `msg:${mid}`;
    const chatId = getChatId(update);
    const text = getTextFromMessage(update.message);
    return `msg-fallback:${chatId}:${text}`;
  }
  if (type === 'bot_started') {
    const chatId = getChatId(update);
    const userId = getUserIdFromUpdate(update);
    return `start:${chatId || userId || 'unknown'}`;
  }
  return null;
}

function getChatId(update) {
  return (
    update.message?.recipient?.chat_id ??
    update.callback?.message?.recipient?.chat_id ??
    update.chat_id ??
    null
  );
}

function getUserIdFromUpdate(update) {
  return (
    update.user?.user_id ??
    update.message?.sender?.user_id ??
    update.callback?.user?.user_id ??
    null
  );
}

function getTextFromMessage(message) {
  return message?.body?.text?.trim() || '';
}

function getSenderName(sender) {
  if (!sender) return '';
  return [sender.first_name, sender.last_name].filter(Boolean).join(' ').trim()
    || sender.name
    || sender.username
    || '';
}

async function trackSubscriber(update, chatId, userId, sender = null) {
  try {
    await upsertSubscriber({
      userId: userId || getUserIdFromUpdate(update),
      chatId,
      name: getSenderName(sender || update.user || update.message?.sender || update.callback?.user),
    });
  } catch (err) {
    console.error('[SUB] upsert failed:', err.message);
  }
}

async function handleCommand(ctx, text, sender = null) {
  const cmd = text.split(/\s+/)[0].toLowerCase();

  switch (cmd) {
    case '/start':
    case '/menu':
      await showMainMenu(ctx);
      break;
    case '/faq':
      await showFaq(ctx);
      break;
    case '/catalog':
      await showCatalog(ctx);
      break;
    case '/manager':
      await showManagerInfo(ctx);
      break;
    case '/myid': {
      const userId = sender?.user_id ?? '—';
      await reply(
        ctx,
        `**Ваши ID в MAX:**\n\n` +
        `user_id: \`${userId}\`\n` +
        `chat_id: \`${ctx.chatId}\`\n\n` +
        'Для уведомлений о заявках добавьте **user_id** в `.env`:\n' +
        `\`MANAGER_MAX_USER_ID=${userId}\``,
      );
      break;
    }
    default:
      return false;
  }
  return true;
}

async function handleMenuCallback(ctx, action, options = {}) {
  switch (action) {
    case 'main':
      await showMainMenu(ctx, options);
      break;
    case 'quiz':
      await startQuiz(ctx, options);
      break;
    case 'catalog':
      await showCatalog(ctx, options);
      break;
    case 'cost':
      await startCostCalc(ctx, options);
      break;
    case 'excursion':
      await startExcursion(ctx, options);
      break;
    case 'faq':
      await showFaq(ctx, options);
      break;
    case 'manager':
      await showManagerInfo(ctx, options);
      break;
    default:
      break;
  }
}

async function handleCallback(update) {
  const chatId = getChatId(update);
  const callback = update.callback;
  const payload = callback?.payload;
  if (!chatId || !payload) return;

  const ctx = makeCtx(chatId, callback);

  if (payload.startsWith('menu:')) {
    const parts = payload.split(':');
    if (parts[1] === 'keep') {
      await handleMenuCallback(ctx, parts[2], { keepMessage: true });
    } else {
      await handleMenuCallback(ctx, parts[1]);
    }
    return;
  }

  if (payload === 'quiz:back') {
    const { handleQuizBack } = require('../flows/quiz');
    await handleQuizBack(ctx);
    return;
  }

  if (payload.startsWith('quiz:')) {
    await handleQuizCallback(ctx, payload);
    return;
  }

  if (payload.startsWith('cost:')) {
    await handleCostCallback(ctx, payload);
    return;
  }

  if (payload.startsWith('catalog:')) {
    await handleCatalogAction(ctx, payload);
    return;
  }

  if (payload.startsWith('faq:item:')) {
    await showFaqItem(ctx, payload.split(':')[2]);
    return;
  }

  if (payload.startsWith('faq:consult:')) {
    await handleFaqConsult(ctx, payload.split(':')[2]);
    return;
  }

  if (payload.startsWith('excursion:format:')) {
    await handleExcursionFormat(ctx, payload.split(':')[2]);
    return;
  }

  if (payload === 'action:start') {
    await showMainMenu(ctx);
    return;
  }

  if (payload === 'action:consultation') {
    await handleFaqConsult(ctx, 'general');
    return;
  }

  if (payload === 'action:manager_lead') {
    await startManagerLead(ctx);
  }
}

async function handleTextMessage(chatId, text, attachments, sender = null) {
  const ctx = makeCtx(chatId, null, { userId: sender?.user_id ?? null });
  const state = getState(chatId);

  if (text.toLowerCase() === 'начать') {
    await showMainMenu(ctx);
    return;
  }

  if (await handleCommand(ctx, text, sender)) {
    return;
  }

  switch (state.flow) {
    case 'quiz_contact': {
      const contact = extractContactFromAttachments(attachments) || parseContactText(text);
      if (!contact.phone) {
        await reply(ctx, 'Укажите телефон, например: Иван, +7 999 123-45-67');
        return;
      }
      await finalizeQuizLead(ctx, contact);
      break;
    }
    case 'cost_contact':
      await handleCostContact(ctx, text, attachments);
      break;
    case 'excursion':
      await handleExcursionMessage(ctx, text, attachments);
      break;
    case 'site_eval':
      await handleSiteEvalMessage(ctx, text, attachments);
      break;
    case 'faq_contact':
      await handleFaqContact(ctx, text, attachments);
      break;
    case 'manager_contact':
      await handleManagerContact(ctx, text, attachments);
      break;
    case 'catalog_order':
      await handleCatalogOrderContact(ctx, text, attachments);
      break;
    case 'catalog_manager':
      await handleCatalogManagerContact(ctx, text, attachments);
      break;
    default:
      await showWelcomeStart(ctx);
  }
}

async function processUpdate(update) {
  const type = update.update_type;

  if (process.env.DEBUG_UPDATES === '1') {
    console.log('[UPDATE]', JSON.stringify(update));
  }

  const dedupKey = getUpdateDedupKey(update);
  if (dedupKey && !rememberUpdateKey(dedupKey)) {
    console.log('[DEDUP] skip update', dedupKey);
    return;
  }

  // Доп. защита от двойного тапа одной и той же кнопки с разными callback_id
  if (type === 'message_callback') {
    const chatId = getChatId(update);
    const payload = update.callback?.payload;
    if (chatId && payload) {
      const actionKey = `action:${chatId}:${payload}`;
      if (!rememberUpdateKey(actionKey, ACTION_DEDUP_MS)) {
        console.log('[DEDUP] skip callback action', actionKey);
        try {
          const { answerCallback } = require('../maxApi');
          if (update.callback?.callback_id) {
            await answerCallback(update.callback.callback_id, { notification: '\u200b' });
          }
        } catch {
          // ignore
        }
        return;
      }
    }
  }

  if (type === 'bot_started') {
    const chatId = getChatId(update);
    const userId = getUserIdFromUpdate(update);
    await trackSubscriber(update, chatId, userId, update.user);
    if (chatId || userId) {
      await showMainMenu(makeCtx(chatId, null, { userId }));
    }
    return;
  }

  if (type === 'message_callback') {
    const chatId = getChatId(update);
    await trackSubscriber(update, chatId, update.callback?.user?.user_id, update.callback?.user);
    await handleCallback(update);
    return;
  }

  if (type === 'message_created') {
    const message = update.message;
    const chatId = getChatId(update);
    if (!chatId || message?.sender?.is_bot) return;

    await trackSubscriber(update, chatId, message?.sender?.user_id, message?.sender);
    const text = getTextFromMessage(message);
    const attachments = message?.body?.attachments;
    await handleTextMessage(chatId, text, attachments, message?.sender);
  }
}

module.exports = {
  processUpdate,
};
