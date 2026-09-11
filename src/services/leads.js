const fs = require('fs/promises');
const path = require('path');
const config = require('../config');
const { sendMessage, sendMessageToUser } = require('../maxApi');

let sheetsClient = null;

async function ensureJsonFile() {
  const filePath = path.resolve(config.leadsJsonPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, '[]\n', 'utf8');
  }
  return filePath;
}

async function readLeads() {
  const filePath = await ensureJsonFile();
  const raw = await fs.readFile(filePath, 'utf8');
  const leads = JSON.parse(raw || '[]');
  return leads.reverse();
}

async function saveToJson(lead) {
  const filePath = await ensureJsonFile();
  const raw = await fs.readFile(filePath, 'utf8');
  const leads = JSON.parse(raw || '[]');
  leads.push(lead);
  await fs.writeFile(filePath, JSON.stringify(leads, null, 2), 'utf8');
}

async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const { google } = require('googleapis');
  const auth = new google.auth.JWT({
    email: config.googleServiceAccountEmail,
    key: config.googlePrivateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

async function saveToGoogleSheets(lead) {
  const sheets = await getSheetsClient();
  const row = [
    lead.datetime,
    String(lead.user_id),
    lead.name,
    lead.phone,
    lead.email,
    lead.technology,
    lead.area,
    lead.floors,
    lead.bedrooms,
    lead.completion,
    lead.budget,
    lead.plot,
    lead.source,
    lead.lead_type,
    lead.comment,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: config.googleSheetsId,
    range: 'Leads!A:O',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

function isGoogleSheetsConfigured() {
  return Boolean(
    config.googleSheetsId &&
    config.googleServiceAccountEmail &&
    config.googlePrivateKey,
  );
}

function isManagerNotificationsConfigured() {
  return Boolean(config.managerMaxUserId || config.managerMaxChatId);
}

async function notifyManager(lead) {
  if (!isManagerNotificationsConfigured()) return;

  if (config.managerMaxChatId && lead.user_id === config.managerMaxChatId) {
    return;
  }

  const text = formatLeadForManager(lead);
  const attempts = [];

  if (config.managerMaxUserId) {
    attempts.push(() => sendMessageToUser(config.managerMaxUserId, text));
  }
  if (config.managerMaxChatId) {
    attempts.push(() => sendMessage(config.managerMaxChatId, text));
  }

  let lastError = null;
  for (const send of attempts) {
    try {
      await send();
      console.log('[NOTIFY] Заявка отправлена менеджеру в MAX');
      return;
    } catch (err) {
      lastError = err;
    }
  }

  console.error(
    '[NOTIFY] Не удалось отправить менеджеру:',
    lastError?.message || 'unknown',
  );
}

async function saveLead(lead) {
  await saveToJson(lead);

  if (isGoogleSheetsConfigured()) {
    try {
      await saveToGoogleSheets(lead);
    } catch (err) {
      console.error('Google Sheets save failed:', err.message);
    }
  }

  await notifyManager(lead);
}

function appendField(lines, label, value) {
  if (value) {
    lines.push(`**${label}:** ${value}`);
  }
}

function parseLeadComment(comment) {
  const result = {
    subjectLabel: null,
    subjectValue: null,
    calculation: null,
    notes: [],
  };
  if (!comment) return result;

  const parts = comment.split(' | ').map((part) => part.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.startsWith('Расчёт:')) {
      result.calculation = part.replace(/^Расчёт:\s*/, '');
      continue;
    }
    if (/^Проект: \w+$/.test(part)) continue;

    const colonIndex = part.indexOf(':');
    if (colonIndex > 0) {
      const label = part.slice(0, colonIndex).trim();
      const value = part.slice(colonIndex + 1).trim();
      if (label === 'Расчёт') {
        result.calculation = value;
        continue;
      }
      if (!result.subjectValue) {
        result.subjectLabel = label;
        result.subjectValue = value;
        continue;
      }
    }

    result.notes.push(part);
  }

  return result;
}

function getLeadSubjectLine(lead, parsed) {
  if (parsed.subjectLabel && parsed.subjectValue) {
    return `**${parsed.subjectLabel}:** ${parsed.subjectValue}`;
  }
  if (parsed.subjectValue) {
    return `**${parsed.subjectValue}**`;
  }

  const typeLabels = {
    квиз: 'Подбор дома',
    'расчёт стоимости': 'Расчёт стоимости',
    менеджер: 'Заявка менеджеру',
    экскурсия: 'Запись на экскурсию',
    'оценка участка': 'Оценка участка',
    'квиз + оценка участка': 'Подбор дома и оценка участка',
  };

  const label = typeLabels[lead.lead_type];
  if (label) return `**${label}**`;
  if (lead.lead_type) return `**${lead.lead_type}**`;
  return null;
}

function formatLeadForManager(lead) {
  const parsed = parseLeadComment(lead.comment);
  const lines = ['☎️ **Новая заявка**'];

  const subject = getLeadSubjectLine(lead, parsed);
  if (subject) lines.push(subject);

  if (parsed.calculation) {
    lines.push(`**Расчёт:** ${parsed.calculation}`);
  }

  appendField(lines, 'Имя', lead.name);
  appendField(lines, 'Телефон', lead.phone);
  appendField(lines, 'Технология', lead.technology);
  appendField(lines, 'Площадь', lead.area);
  appendField(lines, 'Комплектация', lead.completion);
  appendField(lines, 'Этажность', lead.floors);
  appendField(lines, 'Спальни', lead.bedrooms);
  appendField(lines, 'Бюджет', lead.budget);
  appendField(lines, 'Участок', lead.plot);
  appendField(lines, 'Email', lead.email);

  for (const note of parsed.notes) {
    const colonIndex = note.indexOf(':');
    if (colonIndex > 0) {
      const label = note.slice(0, colonIndex).trim();
      const value = note.slice(colonIndex + 1).trim();
      lines.push(`**${label}:** ${value}`);
    } else {
      lines.push(note);
    }
  }

  return lines.join('\n');
}

module.exports = {
  readLeads,
  saveLead,
  formatLeadForManager,
  isGoogleSheetsConfigured,
  isManagerNotificationsConfigured,
  notifyManager,
};
