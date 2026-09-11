const { reply } = require('../utils/messenger');
const { buildKeyboard, callbackButton, BTN, keepMenuButton } = require('../utils/keyboard');
const { setFlow, getState, nextStep, buildLeadFromState } = require('../services/state');
const { saveLead, formatLeadForManager } = require('../services/leads');
const { parseContactText, extractContactFromAttachments } = require('../utils/contact');
const { MANAGER_CONTACT_FOOTER } = require('../utils/messages');

const EXCURSION_FORMATS = [
  { id: 'object', label: '🏗 Объект' },
  { id: 'production', label: '🏭 Производство' },
  { id: 'demo_house', label: '🏠 Демонстрационный дом' },
  { id: 'video', label: '🎥 Видео-экскурсия' },
];

const STEPS = ['name', 'phone', 'day', 'time', 'format'];

const PROMPTS = {
  name: 'Как вас зовут?',
  phone: 'Укажите ваш телефон:',
  day: 'Какой день вам удобен? (например: суббота, 15 июля)',
  time: 'Удобное время? (например: 11:00–13:00)',
  format: 'Выберите формат экскурсии:',
};

async function startExcursion(ctx, options = {}) {
  setFlow(ctx.chatId, 'excursion', { excursionStep: 0 });
  await reply(
    ctx,
    '**Запись на экскурсию**\n\n' + PROMPTS.name,
    null,
    { keepMessage: true, ...options },
  );
}

async function askExcursionFormat(ctx) {
  const rows = EXCURSION_FORMATS.map((f) => [
    callbackButton(f.label, `excursion:format:${f.id}`),
  ]);
  await reply(ctx, `**Запись на экскурсию**\n\n${PROMPTS.format}`, buildKeyboard(rows), { keepMessage: true });
}

async function handleExcursionMessage(ctx, text, attachments) {
  const state = getState(ctx.chatId);
  const stepIndex = state.data.excursionStep ?? 0;
  const step = STEPS[stepIndex];

  if (step === 'phone') {
    const fromAttach = extractContactFromAttachments(attachments);
    const contact = fromAttach || parseContactText(text);
    if (!contact.phone) {
      await reply(ctx, 'Укажите телефон, пожалуйста.');
      return;
    }
    nextStep(ctx.chatId, { phone: contact.phone, excursionStep: stepIndex + 1 });
    await reply(ctx, `**Запись на экскурсию**\n\n${PROMPTS.day}`, null, { keepMessage: true });
    return;
  }

  if (!text?.trim()) {
    await reply(ctx, 'Пожалуйста, введите текст.');
    return;
  }

  if (step === 'name') {
    nextStep(ctx.chatId, { name: text.trim(), excursionStep: stepIndex + 1 });
    await reply(ctx, `**Запись на экскурсию**\n\n${PROMPTS.phone}`, null, { keepMessage: true });
    return;
  }

  if (step === 'day') {
    nextStep(ctx.chatId, { excursionDay: text.trim(), excursionStep: stepIndex + 1 });
    await reply(ctx, `**Запись на экскурсию**\n\n${PROMPTS.time}`, null, { keepMessage: true });
    return;
  }

  if (step === 'time') {
    nextStep(ctx.chatId, { excursionTime: text.trim(), excursionStep: stepIndex + 1 });
    await askExcursionFormat(ctx);
  }
}

async function handleExcursionFormat(ctx, formatId) {
  const format = EXCURSION_FORMATS.find((f) => f.id === formatId);
  const state = getState(ctx.chatId);
  state.data.excursionFormat = format?.label || formatId;

  const lead = buildLeadFromState(ctx.chatId, state, 'экскурсия');
  await saveLead(lead);

  await reply(
    ctx,
    `Спасибо! Мы проверим доступное время и подтвердим запись.\n\n${MANAGER_CONTACT_FOOTER}`,
    buildKeyboard([[keepMenuButton(BTN.mainMenu, 'main')]]),
  );

  console.log('[LEAD]', formatLeadForManager(lead));
}

module.exports = {
  startExcursion,
  handleExcursionMessage,
  handleExcursionFormat,
};
