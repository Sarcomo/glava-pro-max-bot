const config = require('./config');
const { httpsRequest } = require('./httpsClient');

class MaxApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'MaxApiError';
    this.status = status;
    this.body = body;
  }
}

function describeMaxError(err) {
  if (err instanceof MaxApiError) {
    const detail = err.body ? ` — ${JSON.stringify(err.body)}` : '';
    return `${err.message}${detail}`;
  }
  return err?.message || String(err);
}

async function maxRequest(method, endpoint, { query, body } = {}) {
  const url = new URL(`${config.maxApiBase}${endpoint}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await httpsRequest(url.toString(), {
    method,
    headers: {
      Authorization: config.maxBotToken(),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  }).catch((err) => {
    throw new Error(`Сеть: ${err.message}`);
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    throw new MaxApiError(
      `MAX API error ${response.status} on ${method} ${endpoint}`,
      response.status,
      data,
    );
  }

  return data;
}

function editMessage(messageId, text, attachments = null, options = {}) {
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
  return maxRequest('PUT', '/messages', {
    query: { message_id: messageId },
    body,
  });
}

function isAttachmentNotReady(err) {
  return err instanceof MaxApiError && err.body?.code === 'attachment.not.ready';
}

async function sendWithAttachmentRetry(sendFn) {
  let delayMs = 1500;
  const maxAttempts = 6;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await sendFn();
    } catch (err) {
      if (!isAttachmentNotReady(err) || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 2, 10000);
    }
  }

  return null;
}

function sendMessage(chatId, text, attachments = null, options = {}) {
  const body = { text, notify: true };
  if (text && (text.includes('**') || text.includes('`') || text.includes('['))) {
    body.format = 'markdown';
  }
  if (options.format) {
    body.format = options.format;
  }
  if (attachments) {
    body.attachments = attachments;
  }
  const request = () => maxRequest('POST', '/messages', {
    query: { chat_id: chatId },
    body,
  });
  return attachments?.some((item) => item.type === 'file')
    ? sendWithAttachmentRetry(request)
    : request();
}

function sendMessageToUser(userId, text, attachments = null, options = {}) {
  const body = { text, notify: true };
  if (text && (text.includes('**') || text.includes('`') || text.includes('['))) {
    body.format = 'markdown';
  }
  if (options.format) {
    body.format = options.format;
  }
  if (attachments) {
    body.attachments = attachments;
  }
  const request = () => maxRequest('POST', '/messages', {
    query: { user_id: userId },
    body,
  });
  return attachments?.some((item) => item.type === 'file')
    ? sendWithAttachmentRetry(request)
    : request();
}

function answerCallback(callbackId, { message, notification } = {}) {
  const body = {};
  if (message) body.message = message;
  if (notification !== undefined && notification !== null) {
    body.notification = notification;
  }
  if (!body.message && body.notification === undefined) {
    body.notification = '\u200b';
  }
  return maxRequest('POST', '/answers', {
    query: { callback_id: callbackId },
    body,
  });
}

function registerWebhook(url, secret) {
  return maxRequest('POST', '/subscriptions', {
    body: {
      url,
      secret,
      update_types: [
        'message_created',
        'message_callback',
        'bot_started',
      ],
    },
  });
}

function listSubscriptions() {
  return maxRequest('GET', '/subscriptions');
}

function deleteSubscription(url) {
  return maxRequest('DELETE', '/subscriptions', {
    query: { url },
  });
}

/** Удаляет все текущие подписки и вешает одну — иначе MAX шлёт апдейты на несколько URL и дублирует ответы. */
async function replaceWebhook(url, secret) {
  let existing = [];
  try {
    const data = await listSubscriptions();
    existing = data?.subscriptions || [];
  } catch (err) {
    console.warn('[WEBHOOK] list failed:', err.message);
  }

  for (const sub of existing) {
    if (!sub?.url) continue;
    try {
      await deleteSubscription(sub.url);
      console.log('[WEBHOOK] removed', sub.url);
    } catch (err) {
      console.warn('[WEBHOOK] remove failed', sub.url, err.message);
    }
  }

  return registerWebhook(url, secret);
}

function getMe() {
  return maxRequest('GET', '/me');
}

module.exports = {
  MaxApiError,
  describeMaxError,
  isAttachmentNotReady,
  sendMessage,
  sendMessageToUser,
  editMessage,
  answerCallback,
  registerWebhook,
  replaceWebhook,
  listSubscriptions,
  deleteSubscription,
  getMe,
};
