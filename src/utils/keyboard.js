const config = require('../config');

const BTN = {
  back: '◀️ Назад',
  mainMenu: '🏠 В главное меню',
  pickHouse: '🏡 Подобрать дом',
  catalog: '📋 Каталог проектов',
  cost: '💰 Рассчитать стоимость',
  excursion: '🚌 Записаться на экскурсию',
  faq: '❓ FAQ',
  manager: '📞 Связаться с менеджером',
  consultation: '💬 Получить консультацию',
  leaveRequest: '✍️ Оставить заявку',
  site: '🌐 Наш сайт',
  shareContact: '📱 Поделиться контактом',
  getPdf: '📄 Смета PDF',
  calcHouse: '🧮 Рассчитать этот дом',
  writeManager: '✉️ Написать менеджеру',
  backToList: '◀️ К списку проектов',
  backToFilters: '◀️ К фильтрам',
  allProjects: '🏘️ Все проекты',
  start: '▶️ Начать',
};

function buildKeyboard(rows) {
  return [
    {
      type: 'inline_keyboard',
      payload: { buttons: rows },
    },
  ];
}

function callbackButton(text, payload) {
  return { type: 'callback', text, payload };
}

function keepMenuPayload(action) {
  return `menu:keep:${action}`;
}

function keepMenuButton(text, action) {
  return callbackButton(text, keepMenuPayload(action));
}

function linkButton(text, url) {
  return { type: 'link', text, url };
}

function messageButton(text) {
  return { type: 'message', text };
}

function requestContactButton(text = BTN.shareContact) {
  return { type: 'request_contact', text };
}

function mainMenuKeyboard() {
  return buildKeyboard([
    [callbackButton(BTN.pickHouse, 'menu:quiz')],
    [callbackButton(BTN.catalog, 'menu:catalog')],
    [callbackButton(BTN.cost, 'menu:cost')],
    [callbackButton(BTN.excursion, 'menu:excursion')],
    [callbackButton(BTN.faq, 'menu:faq')],
    [callbackButton(BTN.manager, 'menu:manager')],
  ]);
}

function backToMenuKeyboard() {
  return buildKeyboard([[callbackButton(BTN.mainMenu, 'menu:main')]]);
}

function consultationKeyboard() {
  return buildKeyboard([
    [callbackButton(BTN.consultation, 'action:consultation')],
    [callbackButton(BTN.mainMenu, 'menu:main')],
  ]);
}

function managerKeyboard() {
  return buildKeyboard([
    [linkButton(BTN.site, config.siteUrl)],
    [callbackButton(BTN.leaveRequest, 'action:manager_lead')],
    [callbackButton(BTN.mainMenu, 'menu:main')],
  ]);
}

module.exports = {
  BTN,
  buildKeyboard,
  callbackButton,
  keepMenuPayload,
  keepMenuButton,
  linkButton,
  messageButton,
  requestContactButton,
  mainMenuKeyboard,
  backToMenuKeyboard,
  consultationKeyboard,
  managerKeyboard,
};
