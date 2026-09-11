const config = require('../config');
const { reply } = require('../utils/messenger');
const { mainMenuKeyboard, buildKeyboard, callbackButton, BTN } = require('../utils/keyboard');
const { resetState } = require('../services/state');

const WELCOME_TEXT =
  'Здравствуйте! Я бот строительной компании **«ГЛАВА»**.\n\n' +
  'Помогу подобрать дом, рассчитать стоимость, показать каталог проектов и записать на экскурсию.';

/** MAX часто шлёт bot_started и /start почти одновременно — не дублируем меню. */
const recentMainMenuAt = new Map();
const MAIN_MENU_DEDUP_MS = 2500;

function shouldSkipDuplicateMainMenu(ctx) {
  const now = Date.now();
  const keys = [];
  if (ctx?.chatId) keys.push(`c:${ctx.chatId}`);
  if (ctx?.userId) keys.push(`u:${ctx.userId}`);
  if (!keys.length) return false;

  const recent = keys.some((key) => now - (recentMainMenuAt.get(key) || 0) < MAIN_MENU_DEDUP_MS);
  if (recent) return true;

  for (const key of keys) {
    recentMainMenuAt.set(key, now);
  }
  return false;
}

function startPromptKeyboard() {
  return buildKeyboard([[callbackButton(BTN.start, 'action:start')]]);
}

const START_PROMPT_TEXT =
  'Хотите узнать, что умеет бот?\n\n' +
  'Нажмите **«Начать»**, чтобы открыть меню и выбрать действие.';

async function showWelcomeStart(ctx) {
  await reply(ctx, START_PROMPT_TEXT, startPromptKeyboard());
}

async function showMainMenu(ctx, options = {}) {
  if (shouldSkipDuplicateMainMenu(ctx)) {
    return;
  }
  if (ctx.chatId) {
    resetState(ctx.chatId);
  }
  await reply(ctx, WELCOME_TEXT, mainMenuKeyboard(), options);
}

async function showManagerInfo(ctx, options = {}) {
  const text =
    '**Связаться с менеджером**\n\n' +
    `Телефон: ${config.managerPhone}\n` +
    `Email: ${config.managerEmail}\n` +
    `Сайт: ${config.siteUrl}\n\n` +
    'Оставьте заявку — менеджер перезвонит в рабочее время.';

  const { managerKeyboard } = require('../utils/keyboard');
  await reply(ctx, text, managerKeyboard(), options);
}

module.exports = {
  WELCOME_TEXT,
  START_PROMPT_TEXT,
  showWelcomeStart,
  showMainMenu,
  showManagerInfo,
};
