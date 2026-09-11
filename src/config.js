require('dotenv').config();
const path = require('path');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  maxBotToken: () => requireEnv('MAX_BOT_TOKEN'),
  maxWebhookSecret: () => requireEnv('MAX_WEBHOOK_SECRET'),
  webhookUrl: process.env.WEBHOOK_URL || '',
  maxApiBase: 'https://platform-api2.max.ru',
  managerPhone: process.env.MANAGER_PHONE || '+7 (XXX) XXX-XX-XX',
  managerEmail: process.env.MANAGER_EMAIL || 'info@sip.glava.pro',
  siteUrl: process.env.SITE_URL || 'https://sip.glava.pro',
  leadsStorage: process.env.LEADS_STORAGE || 'json',
  leadsJsonPath: process.env.LEADS_JSON_PATH || './data/leads.json',
  projectsJsonPath: process.env.PROJECTS_JSON_PATH || './data/projects.json',
  subscribersJsonPath: process.env.SUBSCRIBERS_JSON_PATH || './data/subscribers.json',
  broadcastHistoryPath: process.env.BROADCAST_HISTORY_PATH || './data/broadcasts.json',
  googleSheetsId: process.env.GOOGLE_SHEETS_ID || '',
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
  googlePrivateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  adminSecret: process.env.ADMIN_SECRET || '',
  managerMaxUserId: Number(process.env.MANAGER_MAX_USER_ID || 0) || null,
  managerMaxChatId: Number(process.env.MANAGER_MAX_CHAT_ID || 0) || null,
  stubEstimatePdfPath: process.env.STUB_ESTIMATE_PDF_PATH
    || path.join(__dirname, '..', 'assets', 'pdfs', 'smeta.pdf'),
  miniAppUrl: process.env.MINI_APP_URL || (() => {
    const webhook = process.env.WEBHOOK_URL || '';
    if (!webhook) return '';
    try {
      return `${new URL(webhook).origin}/app/`;
    } catch {
      return '';
    }
  })(),
};
