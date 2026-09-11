const { reply } = require('../utils/messenger');
const { buildKeyboard, callbackButton, BTN, keepMenuButton } = require('../utils/keyboard');
const { setFlow, getState, nextStep, buildLeadFromState } = require('../services/state');
const { saveLead, formatLeadForManager } = require('../services/leads');
const { parseContactText, extractContactFromAttachments } = require('../utils/contact');
const { MANAGER_CONTACT_FOOTER } = require('../utils/messages');

const STEPS = ['utilities', 'slope', 'soil', 'region', 'distance', 'contact'];

const PROMPTS = {
  utilities: 'Есть ли на участке коммуникации? (газ, вода, электричество)',
  slope: 'Есть ли уклон на участке? Опишите кратко.',
  soil: 'Известен ли тип грунта? (если нет — напишите «не знаю»)',
  region: 'Укажите регион строительства:',
  distance: 'Расстояние от производства/города, если известно (или «не знаю»):',
  contact: 'Оставьте имя и телефон для консультации по фундаменту и доставке:',
};

async function startSiteEvaluation(ctx, options = {}) {
  setFlow(ctx.chatId, 'site_eval', {
    siteStep: 0,
    fromQuiz: options.fromQuiz || false,
    ...getState(ctx.chatId).data,
  });
  await reply(
    ctx,
    '**Оценка участка**\n\n' + PROMPTS.utilities,
    buildKeyboard([[callbackButton(BTN.mainMenu, 'menu:main')]]),
    options.fromQuiz ? {} : { keepMessage: true },
  );
}

async function handleSiteEvalMessage(ctx, text, attachments) {
  const state = getState(ctx.chatId);
  const stepIndex = state.data.siteStep ?? 0;
  const step = STEPS[stepIndex];

  if (step === 'contact') {
    const fromAttach = extractContactFromAttachments(attachments);
    const contact = fromAttach || parseContactText(text);
    if (!contact.phone) {
      await reply(ctx, 'Укажите телефон, пожалуйста.');
      return;
    }
    state.data.name = contact.name;
    state.data.phone = contact.phone;

    const leadType = state.data.fromQuiz ? 'квиз + оценка участка' : 'оценка участка';
    const lead = buildLeadFromState(ctx.chatId, state, leadType);
    await saveLead(lead);

    await reply(
      ctx,
      `Спасибо! Инженер подготовит рекомендации по фундаменту и доставке.\n\n${MANAGER_CONTACT_FOOTER}`,
      buildKeyboard([
        [keepMenuButton(BTN.excursion, 'excursion')],
        [keepMenuButton(BTN.mainMenu, 'main')],
      ]),
    );

    console.log('[LEAD]', formatLeadForManager(lead));
    return;
  }

  if (!text?.trim()) {
    await reply(ctx, 'Пожалуйста, введите ответ текстом.');
    return;
  }

  const fieldMap = {
    utilities: 'utilities',
    slope: 'slope',
    soil: 'soil',
    region: 'region',
    distance: 'distance',
  };

  const field = fieldMap[step];
  nextStep(ctx.chatId, { [field]: text.trim(), siteStep: stepIndex + 1 });

  const nextStepKey = STEPS[stepIndex + 1];
  const prompt = nextStepKey === 'contact' ? PROMPTS.contact : PROMPTS[nextStepKey];
  const keyboard = nextStepKey === 'contact'
    ? buildKeyboard([[callbackButton(BTN.mainMenu, 'menu:main')]])
    : null;

  await reply(ctx, `**Оценка участка**\n\n${prompt}`, keyboard, { keepMessage: true });
}

module.exports = {
  startSiteEvaluation,
  handleSiteEvalMessage,
};
