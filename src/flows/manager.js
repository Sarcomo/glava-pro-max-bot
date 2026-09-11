const { reply } = require('../utils/messenger');
const { buildKeyboard, callbackButton, BTN, requestContactButton, keepMenuButton } = require('../utils/keyboard');
const { setFlow, getState, buildLeadFromState } = require('../services/state');
const { saveLead, formatLeadForManager } = require('../services/leads');
const { parseContactText, extractContactFromAttachments } = require('../utils/contact');
const { MANAGER_CONTACT_FOOTER } = require('../utils/messages');

async function startManagerLead(ctx) {
  setFlow(ctx.chatId, 'manager_contact', {});
  await reply(
    ctx,
    'Оставьте **имя и телефон** — менеджер перезвонит.\n\nПример: `Иван, +7 999 123-45-67`',
    buildKeyboard([
      [requestContactButton()],
      [callbackButton(BTN.mainMenu, 'menu:main')],
    ]),
    { keepMessage: true },
  );
}

async function handleManagerContact(ctx, text, attachments) {
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
      { keepMessage: true },
    );
    return;
  }

  const state = getState(ctx.chatId);
  state.data.name = contact.name;
  state.data.phone = contact.phone;

  const lead = buildLeadFromState(ctx.chatId, state, 'менеджер');
  await saveLead(lead);

  await reply(
    ctx,
    `Заявка принята!\n\n${MANAGER_CONTACT_FOOTER}`,
    buildKeyboard([[keepMenuButton(BTN.mainMenu, 'main')]]),
  );

  console.log('[LEAD]', formatLeadForManager(lead));
}

module.exports = {
  startManagerLead,
  handleManagerContact,
};
