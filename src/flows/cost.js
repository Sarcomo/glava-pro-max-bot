const { reply } = require('../utils/messenger');
const { buildKeyboard, callbackButton, BTN, requestContactButton, keepMenuButton } = require('../utils/keyboard');
const { setFlow, getState, nextStep, buildLeadFromState } = require('../services/state');
const { saveLead, formatLeadForManager } = require('../services/leads');
const { TECHNOLOGIES, AREAS, COMPLETION } = require('../data/constants');
const { calculatePriceRange, formatPrice } = require('../services/pricing');
const { parseContactText, extractContactFromAttachments } = require('../utils/contact');
const { MANAGER_CONTACT_FOOTER } = require('../utils/messages');

const COST_STEPS = [
  {
    key: 'technology',
    question: 'Выберите технологию для расчёта:',
    options: Object.entries(TECHNOLOGIES).map(([id, v]) => ({ id, label: v.label })),
    prefix: 'cost:tech',
  },
  {
    key: 'area',
    question: 'Укажите площадь дома:',
    options: Object.entries(AREAS).map(([id, v]) => ({ id, label: v.label })),
    prefix: 'cost:area',
  },
  {
    key: 'completion',
    question: 'Выберите комплектацию:',
    options: Object.entries(COMPLETION).map(([id, v]) => ({ id, label: v.label })),
    prefix: 'cost:completion',
  },
];

async function startCostCalc(ctx, options = {}) {
  setFlow(ctx.chatId, 'cost', { costStep: 0 });
  await sendCostQuestion(ctx, 0, options);
}

async function sendCostQuestion(ctx, stepIndex, options = {}) {
  const step = COST_STEPS[stepIndex];
  if (!step) {
    setFlow(ctx.chatId, 'cost_contact', getState(ctx.chatId).data);
    await reply(
      ctx,
      'Оставьте **имя и телефон** для отправки расчёта.\n\n' +
        'Напишите, например: `Иван, +7 999 123-45-67`\n' +
        'или нажмите кнопку ниже.',
      buildKeyboard([
        [requestContactButton()],
        [callbackButton(BTN.mainMenu, 'menu:main')],
      ]),
      options,
    );
    return;
  }

  const rows = step.options.map((opt) => [
    callbackButton(opt.label, `${step.prefix}:${opt.id}`),
  ]);

  await reply(
    ctx,
    `**Расчёт стоимости** — шаг ${stepIndex + 1} из ${COST_STEPS.length}\n\n${step.question}`,
    buildKeyboard(rows),
    options,
  );
}

async function handleCostCallback(ctx, payload) {
  const state = getState(ctx.chatId);
  const stepIndex = state.data.costStep ?? 0;
  const step = COST_STEPS[stepIndex];
  if (!step) return;

  const value = payload.split(':').pop();
  const maps = { technology: TECHNOLOGIES, area: AREAS, completion: COMPLETION };
  const label = maps[step.key][value]?.label || value;

  nextStep(ctx.chatId, {
    costStep: stepIndex + 1,
    [step.key]: value,
    [`${step.key}Label`]: label,
  });

  await sendCostQuestion(ctx, stepIndex + 1);
}

async function finalizeCostLead(ctx, contact) {
  const state = getState(ctx.chatId);
  state.data.name = contact.name;
  state.data.phone = contact.phone;

  const range = calculatePriceRange(state.data.technology, state.data.area, state.data.completion);
  const lead = buildLeadFromState(ctx.chatId, state, 'расчёт стоимости', {
    comment: range
      ? `Расчёт: от ${formatPrice(range.min)} до ${formatPrice(range.max)}`
      : '',
  });
  await saveLead(lead);

  let text = 'Спасибо! Заявка принята.\n\n';
  if (range) {
    text +=
      `Предварительная стоимость: **от ${formatPrice(range.min)} до ${formatPrice(range.max)}**.\n` +
      'Точный расчёт зависит от проекта, фундамента, доставки, участка и комплектации.\n\n';
  }
  text += MANAGER_CONTACT_FOOTER;

  await reply(ctx, text, buildKeyboard([
    [keepMenuButton(BTN.pickHouse, 'quiz')],
    [keepMenuButton(BTN.mainMenu, 'main')],
  ]));

  console.log('[LEAD]', formatLeadForManager(lead));
}

async function handleCostContact(ctx, text, attachments) {
  const fromAttach = extractContactFromAttachments(attachments);
  const contact = fromAttach || parseContactText(text);
  if (!contact.phone) {
    await reply(
      ctx,
      'Укажите телефон, пожалуйста.\n\nПример: `Иван, +7 999 123-45-67`',
      buildKeyboard([
        [requestContactButton()],
        [callbackButton(BTN.mainMenu, 'menu:main')],
      ]),
    );
    return;
  }
  await finalizeCostLead(ctx, contact);
}

module.exports = {
  startCostCalc,
  sendCostQuestion,
  handleCostCallback,
  handleCostContact,
  finalizeCostLead,
};
