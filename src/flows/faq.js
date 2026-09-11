const faqItems = require('../data/faq');
const { reply } = require('../utils/messenger');
const { buildKeyboard, callbackButton, BTN, requestContactButton, keepMenuButton } = require('../utils/keyboard');
const { setFlow, getState, buildLeadFromState } = require('../services/state');
const { saveLead, formatLeadForManager } = require('../services/leads');
const { parseContactText, extractContactFromAttachments } = require('../utils/contact');
const { MANAGER_CONTACT_FOOTER } = require('../utils/messages');

function faqContactKeyboard(itemId) {
  const backPayload = itemId && itemId !== 'general' ? `faq:item:${itemId}` : 'menu:faq';
  return buildKeyboard([
    [requestContactButton()],
    [
      callbackButton(BTN.back, backPayload),
      callbackButton(BTN.mainMenu, 'menu:main'),
    ],
  ]);
}

function faqMenuKeyboard() {
  const rows = faqItems.map((item) => [
    callbackButton(item.title, `faq:item:${item.id}`),
  ]);
  rows.push([callbackButton(BTN.mainMenu, 'menu:main')]);
  return buildKeyboard(rows);
}

async function showFaq(ctx, options = {}) {
  setFlow(ctx.chatId, 'faq', {});
  await reply(ctx, '**Частые вопросы**\n\nВыберите тему:', faqMenuKeyboard(), options);
}

async function showFaqItem(ctx, itemId) {
  const item = faqItems.find((f) => f.id === itemId);
  if (!item) {
    await showFaq(ctx);
    return;
  }

  await reply(
    ctx,
    `**${item.title}**\n\n${item.text}`,
    buildKeyboard([
      [callbackButton(BTN.consultation, `faq:consult:${item.id}`)],
      [
        callbackButton(BTN.back, 'menu:faq'),
        callbackButton(BTN.mainMenu, 'menu:main'),
      ],
    ]),
  );
}

async function handleFaqConsult(ctx, itemId) {
  const item = faqItems.find((f) => f.id === itemId);
  setFlow(ctx.chatId, 'faq_contact', {
    faqTopic: item?.title || itemId,
    faqItemId: itemId,
  });

  await reply(
    ctx,
    'Оставьте **имя и телефон** — менеджер свяжется и ответит на все вопросы.\n\n' +
      'Напишите, например: `Иван, +7 999 123-45-67`\n' +
      'или нажмите кнопку ниже.',
    faqContactKeyboard(itemId),
  );
}

async function handleFaqContact(ctx, text, attachments) {
  const state = getState(ctx.chatId);
  const contact = extractContactFromAttachments(attachments) || parseContactText(text);

  if (!contact.phone) {
    await reply(
      ctx,
      'Укажите телефон, пожалуйста.\n\nПример: `Иван, +7 999 123-45-67`',
      faqContactKeyboard(state.data.faqItemId),
    );
    return;
  }

  await finalizeFaqLead(ctx, contact);
}

async function finalizeFaqLead(ctx, contact) {
  const state = getState(ctx.chatId);
  state.data.name = contact.name;
  state.data.phone = contact.phone;

  const lead = buildLeadFromState(ctx.chatId, state, 'FAQ', {
    comment: `Тема FAQ: ${state.data.faqTopic || ''}`,
  });
  await saveLead(lead);

  await reply(
    ctx,
    `Спасибо! Заявка принята.\n\n${MANAGER_CONTACT_FOOTER}`,
    buildKeyboard([[keepMenuButton(BTN.mainMenu, 'main')]]),
  );

  console.log('[LEAD]', formatLeadForManager(lead));
}

module.exports = {
  showFaq,
  showFaqItem,
  handleFaqConsult,
  handleFaqContact,
  finalizeFaqLead,
};
