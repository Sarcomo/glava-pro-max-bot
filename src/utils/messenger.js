const { sendMessage, sendMessageToUser, answerCallback } = require('../maxApi');

/** Антидубль одинаковых исходящих сообщений в один чат. */
const recentOutbound = new Map();
const OUTBOUND_DEDUP_MS = 2000;

function outboundKey(ctx, text) {
  const target = ctx?.chatId ? `c:${ctx.chatId}` : `u:${ctx?.userId}`;
  const normalized = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  return `${target}|${normalized}`;
}

function shouldSkipDuplicateOutbound(ctx, text) {
  const key = outboundKey(ctx, text);
  const now = Date.now();
  const prev = recentOutbound.get(key) || 0;
  if (now - prev < OUTBOUND_DEDUP_MS) return true;
  recentOutbound.set(key, now);
  if (recentOutbound.size > 500) {
    for (const [k, ts] of recentOutbound) {
      if (now - ts > OUTBOUND_DEDUP_MS * 4) recentOutbound.delete(k);
    }
  }
  return false;
}

function buildMessageBody(text, attachments, options = {}) {
  const body = { text, notify: options.notify ?? false };
  if (text && (text.includes('**') || text.includes('`') || text.includes('['))) {
    body.format = 'markdown';
  }
  if (options.format) {
    body.format = options.format;
  }
  if (attachments) {
    body.attachments = attachments;
  }
  return body;
}

async function deliverMessage(ctx, text, attachments, options = {}) {
  if (ctx?.chatId) {
    return sendMessage(ctx.chatId, text, attachments, options);
  }
  if (ctx?.userId) {
    return sendMessageToUser(ctx.userId, text, attachments, options);
  }
  throw new Error('reply: chatId or userId is required');
}

/**
 * replace (по умолчанию для кнопок) — меню/навигация заменяет сообщение, не копится.
 * keepMessage: true — отправляет новое сообщение, вопросы остаются в чате.
 */
async function reply(ctx, text, attachments = null, options = {}) {
  if (!ctx?.chatId && !ctx?.userId) {
    throw new Error('reply: chatId or userId is required');
  }

  if (!options.allowDuplicate && shouldSkipDuplicateOutbound(ctx, text)) {
    if (ctx.callbackId) {
      try {
        await answerCallback(ctx.callbackId, {
          notification: options.notification ?? '\u200b',
        });
      } catch {
        // ignore
      }
    }
    return { mode: 'dedup', messageId: null };
  }

  if (ctx.callbackId && options.keepMessage) {
    await answerCallback(ctx.callbackId, { notification: options.notification ?? '\u200b' });
    const result = await deliverMessage(ctx, text, attachments, {
      ...options,
      notify: options.notify ?? true,
    });
    return { mode: 'send', messageId: result?.message?.body?.mid || null };
  }

  if (ctx.callbackId) {
    const body = buildMessageBody(text, attachments, options);
    await answerCallback(ctx.callbackId, {
      message: body,
      notification: options.notification ?? '\u200b',
    });
    return { mode: 'replace', messageId: ctx.messageId };
  }

  const result = await deliverMessage(ctx, text, attachments, {
    ...options,
    notify: options.notify ?? true,
  });
  return { mode: 'send', messageId: result?.message?.body?.mid || null };
}

function makeCtx(chatId, callback = null, extra = {}) {
  if (callback) {
    return {
      chatId,
      callbackId: callback.callback_id,
      messageId: callback.message?.body?.mid,
      userId: extra.userId ?? callback.user?.user_id ?? null,
      ...extra,
    };
  }
  return { chatId, userId: extra.userId ?? null, ...extra };
}

module.exports = {
  reply,
  makeCtx,
};
