const { reply } = require('../utils/messenger');
const { buildKeyboard, callbackButton, requestContactButton, BTN, keepMenuButton } = require('../utils/keyboard');
const {
  setFlow,
  getState,
  nextStep,
  buildLeadFromState,
} = require('../services/state');
const { saveLead, formatLeadForManager } = require('../services/leads');
const { MANAGER_CONTACT_FOOTER } = require('../utils/messages');
const { QUIZ_STEPS, TECHNOLOGIES, AREAS, FLOORS, BEDROOMS, COMPLETION, BUDGETS, PLOT } = require('../data/constants');
const { calculatePriceRange, formatPrice } = require('../services/pricing');
const { startSiteEvaluation } = require('./siteEval');

const LABEL_MAPS = {
  technology: TECHNOLOGIES,
  area: AREAS,
  floors: FLOORS,
  bedrooms: BEDROOMS,
  completion: COMPLETION,
  budget: BUDGETS,
  plot: PLOT,
};

async function startQuiz(ctx, options = {}) {
  setFlow(ctx.chatId, 'quiz', { quizStep: 0 });
  await sendQuizQuestion(ctx, 0, options);
}

async function sendQuizQuestion(ctx, stepIndex, options = {}) {
  const step = QUIZ_STEPS[stepIndex];
  if (!step) {
    await askContact(ctx, 'quiz');
    return;
  }

  const rows = step.options.map((opt) => [
    callbackButton(opt.label, `${step.prefix}:${opt.id}`),
  ]);

  if (stepIndex > 0) {
    rows.push([
      callbackButton(BTN.back, 'quiz:back'),
      callbackButton(BTN.mainMenu, 'menu:main'),
    ]);
  } else {
    rows.push([callbackButton(BTN.mainMenu, 'menu:main')]);
  }

  await reply(
    ctx,
    `**Подбор дома** — шаг ${stepIndex + 1} из ${QUIZ_STEPS.length}\n\n${step.question}`,
    buildKeyboard(rows),
    options,
  );
}

async function handleQuizCallback(ctx, payload) {
  const state = getState(ctx.chatId);
  const stepIndex = state.data.quizStep ?? 0;
  const step = QUIZ_STEPS[stepIndex];
  if (!step) return;

  const value = payload.split(':').pop();
  const labelMap = LABEL_MAPS[step.key];
  const label = labelMap[value]?.label || value;

  nextStep(ctx.chatId, {
    quizStep: stepIndex + 1,
    [step.key]: value,
    [`${step.key}Label`]: label,
  });

  if (step.key === 'plot' && value === 'need_help') {
    await startSiteEvaluation(ctx, { fromQuiz: true });
    return;
  }

  await sendQuizQuestion(ctx, stepIndex + 1);
}

function clearQuizFromStep(state, fromIndex) {
  for (let i = fromIndex; i < QUIZ_STEPS.length; i += 1) {
    const key = QUIZ_STEPS[i].key;
    delete state.data[key];
    delete state.data[`${key}Label`];
  }
  state.data.quizStep = fromIndex;
}

async function handleQuizBack(ctx) {
  const state = getState(ctx.chatId);

  if (state.flow === 'quiz_contact') {
    clearQuizFromStep(state, QUIZ_STEPS.length - 1);
    setFlow(ctx.chatId, 'quiz', state.data);
    await sendQuizQuestion(ctx, QUIZ_STEPS.length - 1);
    return;
  }

  const currentStep = state.data.quizStep ?? 0;
  if (currentStep <= 0) return;

  const prevStep = currentStep - 1;
  clearQuizFromStep(state, prevStep);
  await sendQuizQuestion(ctx, prevStep);
}

async function askContact(ctx, flowType) {
  setFlow(ctx.chatId, flowType === 'quiz' ? 'quiz_contact' : flowType, getState(ctx.chatId).data);

  const text =
    'Оставьте **имя и телефон**, и мы отправим предварительный расчёт и подходящие проекты.\n\n' +
    'Напишите в одном сообщении, например:\n`Иван, +7 999 123-45-67`\n\n' +
    'Или нажмите кнопку ниже:';

  await reply(ctx, text, buildKeyboard([
    [requestContactButton()],
    [callbackButton(BTN.back, 'quiz:back'), callbackButton(BTN.mainMenu, 'menu:main')],
  ]));
}

async function finalizeQuizLead(ctx, contact) {
  const state = getState(ctx.chatId);
  state.data.name = contact.name;
  state.data.phone = contact.phone;

  const lead = buildLeadFromState(ctx.chatId, state, 'квиз');
  await saveLead(lead);

  const range = calculatePriceRange(state.data.technology, state.data.area, state.data.completion);
  let text =
    'Спасибо! Заявка принята.\n\n' +
    'Мы подготовим подборку проектов.\n\n';

  if (range) {
    text +=
      `Предварительная стоимость: **от ${formatPrice(range.min)} до ${formatPrice(range.max)}**.\n` +
      'Точный расчёт зависит от проекта, фундамента, доставки, участка и комплектации.\n\n';
  }

  text += MANAGER_CONTACT_FOOTER;

  await reply(ctx, text, buildKeyboard([
    [keepMenuButton(BTN.catalog, 'catalog')],
    [keepMenuButton(BTN.mainMenu, 'main')],
  ]));

  console.log('[LEAD]', formatLeadForManager(lead));
}

module.exports = {
  startQuiz,
  handleQuizCallback,
  handleQuizBack,
  askContact,
  finalizeQuizLead,
};
