const projects = require('../data/projects');
const { AREA_FILTERS, PRICE_FILTERS, CATALOG_CATEGORIES, getProjectSiteUrl } = require('../data/projects');
const { reply } = require('../utils/messenger');
const { buildKeyboard, callbackButton, linkButton, BTN, requestContactButton, keepMenuButton } = require('../utils/keyboard');
const { setFlow, getState, buildLeadFromState } = require('../services/state');
const { formatPrice, calculatePriceRange } = require('../services/pricing');
const config = require('../config');
const { COMPLETION } = require('../data/constants');
const { getProjectImageAttachment, sendStubEstimatePdf } = require('../services/media');
const { parseContactText, extractContactFromAttachments } = require('../utils/contact');
const { saveLead, formatLeadForManager } = require('../services/leads');
const { MANAGER_CONTACT_FOOTER } = require('../utils/messages');

function formatProjectCard(project) {
  const priceText = project.priceLabel || `от ${formatPrice(project.priceFrom)}`;
  const roomsLine = project.rooms
    ? `🚪 Комнаты: ${project.rooms}\n`
    : '';

  let text =
    `**${project.name}**\n` +
    `📐 Площадь: ${project.area} м²\n` +
    roomsLine +
    `🏠 Этажность: ${project.floors}\n` +
    `🛏 Спальни: ${project.bedrooms}\n` +
    `💵 Цена: ${priceText}`;

  if (project.description) {
    text += `\n\n${project.description}`;
  }

  return text;
}

function getOrderComment(project) {
  return project.category === 'domokomplekt'
    ? `Заказ домокомплекта: ${project.name}`
    : `Заказ готового проекта: ${project.name}`;
}

function getProjectAreaKey(area) {
  if (area <= 80) return 'up_to_80';
  if (area <= 100) return '80_100';
  if (area <= 150) return '100_150';
  return '150_200';
}

function getProjectTechLabels(project) {
  const tech = project.technology || 'sip';
  const techLabels = { sip: 'СИП-панели', timber: 'Брус', frame: 'Каркас' };
  return { tech, technologyLabel: techLabels[tech] || 'СИП-панели' };
}

async function askCatalogOrderContact(ctx, project) {
  await reply(
    ctx,
    `Заказ **${project.name}** — осталось указать **имя и телефон**.\n\n` +
      'Напишите, например: `Иван, +7 999 123-45-67`\n' +
      'или нажмите кнопку ниже.',
    buildKeyboard([
      [requestContactButton()],
      [
        callbackButton('◀️ К проекту', `catalog:view:${project.id}`),
        callbackButton(BTN.mainMenu, 'menu:main'),
      ],
    ]),
    { keepMessage: true },
  );
}

async function startCatalogOrder(ctx, project, extra = {}) {
  const { tech, technologyLabel } = getProjectTechLabels(project);

  setFlow(ctx.chatId, 'catalog_order', {
    projectId: project.id,
    orderComment: extra.orderComment || getOrderComment(project),
    technology: tech,
    technologyLabel,
    area: getProjectAreaKey(project.area),
    areaLabel: `${project.area} м²`,
  });

  await reply(
    ctx,
    `Заказ **${project.name}**.\n\nВыберите комплектацию:`,
    buildKeyboard(
      Object.entries(COMPLETION).map(([id, v]) => [
        callbackButton(v.label, `catalog:order_completion:${project.id}:${id}`),
      ]),
    ),
  );
}

async function handleCatalogOrderCompletion(ctx, projectId, completionId) {
  const project = projects.find((p) => p.id === projectId);
  const completion = COMPLETION[completionId];
  if (!project || !completion) {
    await reply(ctx, 'Проект не найден.', catalogMainKeyboard());
    return;
  }

  const state = getState(ctx.chatId);
  const { tech, technologyLabel } = getProjectTechLabels(project);
  state.flow = 'catalog_order';
  state.data = {
    ...state.data,
    projectId: project.id,
    orderComment: state.data.orderComment || getOrderComment(project),
    technology: tech,
    technologyLabel,
    area: getProjectAreaKey(project.area),
    areaLabel: `${project.area} м²`,
    completion: completionId,
    completionLabel: completion.label,
  };

  await askCatalogOrderContact(ctx, project);
}

async function handleCatalogOrderContact(ctx, text, attachments) {
  const state = getState(ctx.chatId);
  const project = projects.find((p) => p.id === state.data.projectId);
  const contact = extractContactFromAttachments(attachments) || parseContactText(text);

  if (!contact.phone) {
    await reply(
      ctx,
      'Укажите телефон, пожалуйста.\n\nПример: `Иван, +7 999 123-45-67`',
      buildKeyboard([
        [requestContactButton()],
        [
          callbackButton('◀️ К проекту', project ? `catalog:view:${project.id}` : 'menu:catalog'),
          callbackButton(BTN.mainMenu, 'menu:main'),
        ],
      ]),
      { keepMessage: true },
    );
    return;
  }

  state.data.name = contact.name;
  state.data.phone = contact.phone;

  const range = calculatePriceRange(
    state.data.technology,
    state.data.area,
    state.data.completion,
  );

  const lead = buildLeadFromState(ctx.chatId, state, 'каталог', {
    comment: state.data.orderComment || (project ? getOrderComment(project) : 'Заказ из каталога'),
  });
  await saveLead(lead);
  console.log('[LEAD]', formatLeadForManager(lead));

  const projectName = project?.name || 'проект';
  let responseText =
    `Заявка на **${projectName}** принята.\n\n`;

  if (range) {
    responseText +=
      `Предварительная стоимость: **от ${formatPrice(range.min)} до ${formatPrice(range.max)}**.\n` +
      'Точный расчёт зависит от проекта, фундамента, доставки, участка и комплектации.\n\n';
  }

  responseText += MANAGER_CONTACT_FOOTER;

  await reply(
    ctx,
    responseText,
    buildKeyboard([
      [linkButton(BTN.site, config.siteUrl)],
      [keepMenuButton(BTN.mainMenu, 'main')],
    ]),
    { keepMessage: true },
  );

  setFlow(ctx.chatId, 'catalog', { projectId: project?.id });
}

async function startCatalogManagerContact(ctx, project) {
  setFlow(ctx.chatId, 'catalog_manager', {
    projectId: project.id,
    managerComment: `Вопрос по проекту: ${project.name}`,
  });

  await reply(
    ctx,
    `Напишите **имя и телефон** — менеджер ответит по проекту **${project.name}**.\n\n` +
      'Напишите, например: `Иван, +7 999 123-45-67`\n' +
      'или нажмите кнопку ниже.',
    buildKeyboard([
      [requestContactButton()],
      [
        callbackButton('◀️ К проекту', `catalog:view:${project.id}`),
        callbackButton(BTN.mainMenu, 'menu:main'),
      ],
    ]),
    { keepMessage: true },
  );
}

async function handleCatalogManagerContact(ctx, text, attachments) {
  const state = getState(ctx.chatId);
  const project = projects.find((p) => p.id === state.data.projectId);
  const contact = extractContactFromAttachments(attachments) || parseContactText(text);

  if (!contact.phone) {
    await reply(
      ctx,
      'Укажите телефон, пожалуйста.\n\nПример: `Иван, +7 999 123-45-67`',
      buildKeyboard([
        [requestContactButton()],
        [
          callbackButton('◀️ К проекту', project ? `catalog:view:${project.id}` : 'menu:catalog'),
          callbackButton(BTN.mainMenu, 'menu:main'),
        ],
      ]),
      { keepMessage: true },
    );
    return;
  }

  state.data.name = contact.name;
  state.data.phone = contact.phone;

  const lead = buildLeadFromState(ctx.chatId, state, 'каталог', {
    comment: state.data.managerComment || (project ? `Вопрос по проекту: ${project.name}` : 'Вопрос менеджеру'),
  });
  await saveLead(lead);
  console.log('[LEAD]', formatLeadForManager(lead));

  const projectName = project?.name || 'проекту';
  await reply(
    ctx,
    `Спасибо! Заявка по **${projectName}** принята.\n\n${MANAGER_CONTACT_FOOTER}`,
    buildKeyboard([
      [linkButton(BTN.site, config.siteUrl)],
      [keepMenuButton(BTN.mainMenu, 'main')],
    ]),
    { keepMessage: true },
  );

  setFlow(ctx.chatId, 'catalog', { projectId: project?.id });
}

function projectKeyboard(project) {
  if (project.category === 'domokomplekt' || project.category === 'ready') {
    const orderLabel = project.category === 'domokomplekt'
      ? '📞 Заказать домокомплект'
      : '📞 Заказать проект';
    const rows = [
      [callbackButton(orderLabel, `catalog:order:${project.id}`)],
    ];
    if (project.options?.length) {
      rows.push([callbackButton('🔧 Доп. опции', `catalog:options:${project.id}`)]);
    }
    rows.push([
      callbackButton(BTN.writeManager, `catalog:manager:${project.id}`),
      callbackButton(BTN.getPdf, `catalog:pdf:${project.id}`),
    ]);
    rows.push([linkButton('🌐 На сайте', getProjectSiteUrl(project) || config.siteUrl)]);
    rows.push([
      callbackButton(BTN.backToList, 'catalog:back'),
      callbackButton(BTN.mainMenu, 'menu:main'),
    ]);
    return buildKeyboard(rows);
  }

  return buildKeyboard([
    [callbackButton(BTN.getPdf, `catalog:pdf:${project.id}`)],
    [callbackButton(BTN.calcHouse, `catalog:calc:${project.id}`)],
    [callbackButton(BTN.manager, `catalog:manager:${project.id}`)],
    [callbackButton(BTN.backToList, 'catalog:back'), callbackButton(BTN.mainMenu, 'menu:main')],
  ]);
}

async function buildProjectAttachments(project) {
  const keyboard = projectKeyboard(project);
  const image = await getProjectImageAttachment(project);
  if (!image) return keyboard;
  return [image, ...keyboard];
}

function catalogMainKeyboard() {
  return buildKeyboard([
    [callbackButton('🔍 Фильтр', 'catalog:filters')],
    [
      callbackButton('📦 Домокомплекты', 'catalog:category:domokomplekt'),
      callbackButton('🏡 Готовые проекты', 'catalog:category:ready'),
    ],
    [callbackButton(BTN.mainMenu, 'menu:main')],
  ]);
}

function catalogFilterMenuKeyboard() {
  const rows = Object.entries(AREA_FILTERS).map(([id, f]) => [
    callbackButton(f.label, `catalog:area:${id}`),
  ]);
  rows.push([
    callbackButton('◀️ В каталог', 'menu:catalog'),
    callbackButton(BTN.mainMenu, 'menu:main'),
  ]);
  return buildKeyboard(rows);
}

function catalogPriceMenuKeyboard(areaId) {
  const rows = Object.entries(PRICE_FILTERS).map(([id, f]) => [
    callbackButton(f.label, `catalog:price:${areaId}:${id}`),
  ]);
  rows.push([callbackButton('◀️ К фильтрам', 'catalog:filters')]);
  rows.push([
    callbackButton('◀️ В каталог', 'menu:catalog'),
    callbackButton(BTN.mainMenu, 'menu:main'),
  ]);
  return buildKeyboard(rows);
}

function filterProjectsByAreaAndPrice(areaId, priceId) {
  const areaFn = AREA_FILTERS[areaId]?.fn;
  const priceFn = PRICE_FILTERS[priceId]?.fn;
  if (!areaFn || !priceFn) return [];
  return projects.filter((p) => areaFn(p) && priceFn(p));
}

function projectListKeyboard(list, backPayload = 'menu:catalog', backLabel = '◀️ В каталог') {
  const rows = list.map((p) => [callbackButton(`🏠 ${p.name}`, `catalog:view:${p.id}`)]);
  rows.push([
    callbackButton(backLabel, backPayload),
    callbackButton(BTN.mainMenu, 'menu:main'),
  ]);
  return buildKeyboard(rows);
}

function listBackFromState(state) {
  if (state.data.catalogCategory) {
    return { payload: 'menu:catalog', label: '◀️ В каталог' };
  }
  if (state.data.catalogAreaFilter && state.data.catalogPriceFilter) {
    return {
      payload: `catalog:area:${state.data.catalogAreaFilter}`,
      label: '◀️ К выбору цены',
    };
  }
  return { payload: 'menu:catalog', label: '◀️ В каталог' };
}

async function showCatalog(ctx, options = {}) {
  setFlow(ctx.chatId, 'catalog', {});
  await reply(
    ctx,
    '**Каталог проектов Глава Про**\n\nВыберите раздел:',
    catalogMainKeyboard(),
    options,
  );
}

async function showFilterMenu(ctx) {
  await reply(
    ctx,
    '**Фильтр проектов**\n\nВыберите площадь:',
    catalogFilterMenuKeyboard(),
  );
}

async function showAreaPriceMenu(ctx, areaId) {
  const area = AREA_FILTERS[areaId];
  if (!area) {
    await showFilterMenu(ctx);
    return;
  }

  getState(ctx.chatId).data.catalogAreaFilter = areaId;

  await reply(
    ctx,
    `**${area.label}**\n\nВыберите стоимость:`,
    catalogPriceMenuKeyboard(areaId),
  );
}

async function showCombinedFilteredProjects(ctx, areaId, priceId) {
  const area = AREA_FILTERS[areaId];
  const price = PRICE_FILTERS[priceId];
  if (!area || !price) {
    await showFilterMenu(ctx);
    return;
  }

  const list = filterProjectsByAreaAndPrice(areaId, priceId);
  if (!list.length) {
    await reply(
      ctx,
      `По фильтру «${area.label}», «${price.label}» проектов не найдено.`,
      catalogPriceMenuKeyboard(areaId),
    );
    return;
  }

  const state = getState(ctx.chatId);
  state.data.catalogCategory = null;
  state.data.catalogAreaFilter = areaId;
  state.data.catalogPriceFilter = priceId;
  state.data.catalogList = list.map((p) => p.id);

  const back = listBackFromState(state);
  await reply(
    ctx,
    `${area.label}, ${price.label}\n\nНайдено проектов: ${list.length}\n\nВыберите проект:`,
    projectListKeyboard(list, back.payload, back.label),
  );
}

async function showCategoryProjects(ctx, categoryId) {
  const category = CATALOG_CATEGORIES[categoryId];
  if (!category) {
    await showCatalog(ctx);
    return;
  }

  const list = projects.filter(category.fn);
  if (!list.length) {
    await reply(
      ctx,
      `В разделе «${category.label}» пока нет проектов.`,
      catalogMainKeyboard(),
    );
    return;
  }

  const state = getState(ctx.chatId);
  state.data.catalogCategory = categoryId;
  state.data.catalogAreaFilter = null;
  state.data.catalogPriceFilter = null;
  state.data.catalogList = list.map((p) => p.id);

  const back = listBackFromState(state);
  await reply(
    ctx,
    `${category.label} — проектов: ${list.length}\n\nВыберите проект:`,
    projectListKeyboard(list, back.payload, back.label),
  );
}

async function showProjectCard(ctx, projectId) {
  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    await showCatalog(ctx);
    return;
  }

  getState(ctx.chatId).data.projectId = project.id;
  const attachments = await buildProjectAttachments(project);
  await reply(ctx, formatProjectCard(project), attachments);
}

async function handleCatalogAction(ctx, payload) {
  const parts = payload.split(':');
  const action = parts[1];
  const value = parts[2];
  const extra = parts[3];
  const project = projects.find((p) => p.id === value);
  const state = getState(ctx.chatId);

  if (action === 'area') {
    await showAreaPriceMenu(ctx, value);
    return;
  }

  if (action === 'price') {
    await showCombinedFilteredProjects(ctx, value, extra);
    return;
  }

  if (action === 'filters') {
    await showFilterMenu(ctx);
    return;
  }

  if (action === 'category') {
    await showCategoryProjects(ctx, value);
    return;
  }

  if (action === 'back') {
    const ids = state.data.catalogList || projects.map((p) => p.id);
    const list = ids.map((id) => projects.find((p) => p.id === id)).filter(Boolean);
    const back = listBackFromState(state);
    let title;
    if (state.data.catalogAreaFilter && state.data.catalogPriceFilter) {
      const area = AREA_FILTERS[state.data.catalogAreaFilter];
      const price = PRICE_FILTERS[state.data.catalogPriceFilter];
      title = `${area?.label || ''}, ${price?.label || ''}\n\nНайдено проектов: ${list.length}`;
    } else if (state.data.catalogCategory) {
      title = `${CATALOG_CATEGORIES[state.data.catalogCategory]?.label || 'Каталог'} — проектов: ${list.length}`;
    } else {
      title = `**Каталог** — найдено проектов: ${list.length}`;
    }
    await reply(
      ctx,
      `${title}\n\nВыберите проект:`,
      projectListKeyboard(list, back.payload, back.label),
    );
    return;
  }

  if (action === 'view') {
    await showProjectCard(ctx, value);
    return;
  }

  if (action === 'options' && project?.options?.length) {
    const lines = project.options.map(
      (opt) => `• ${opt.name}: **+${formatPrice(opt.price)}**`,
    );
    await reply(
      ctx,
      `**Дополнительные опции — ${project.name}**\n\n${lines.join('\n')}\n\n` +
        'Менеджер уточнит комплектацию и итоговую стоимость.',
      buildKeyboard([
        [callbackButton('📞 Заказать с опциями', `catalog:order_options:${project.id}`)],
        [callbackButton('◀️ К проекту', `catalog:view:${project.id}`)],
        [callbackButton(BTN.mainMenu, 'menu:main')],
      ]),
    );
    return;
  }

  if (action === 'order_options') {
    if (!project) {
      await reply(ctx, 'Проект не найден.', catalogMainKeyboard());
      return;
    }
    await startCatalogOrder(ctx, project, {
      orderComment: `Заказ с опциями: ${project.name}`,
    });
    return;
  }

  if (action === 'order_completion') {
    await handleCatalogOrderCompletion(ctx, value, extra);
    return;
  }

  if (action === 'order') {
    if (!project) {
      await reply(ctx, 'Проект не найден.', catalogMainKeyboard());
      return;
    }
    await startCatalogOrder(ctx, project);
    return;
  }

  if (!project) {
    await reply(ctx, 'Проект не найден.', catalogMainKeyboard());
    return;
  }

  state.data.projectId = project.id;

  if (action === 'pdf') {
    await sendStubEstimatePdf(ctx, project);
    return;
  }

  if (action === 'calc') {
    const { tech, technologyLabel } = getProjectTechLabels(project);
    setFlow(ctx.chatId, 'cost', {
      technology: tech,
      technologyLabel,
      area: getProjectAreaKey(project.area),
      areaLabel: `${project.area} м²`,
      projectId: project.id,
      costStep: 2,
    });
    await reply(
      ctx,
      `Расчёт для **${project.name}**.\n\nВыберите комплектацию:`,
      buildKeyboard(
        Object.entries(COMPLETION).map(([id, v]) => [
          callbackButton(v.label, `cost:completion:${id}`),
        ]),
      ),
    );
    return;
  }

  if (action === 'manager') {
    await startCatalogManagerContact(ctx, project);
    return;
  }
}

module.exports = {
  showCatalog,
  handleCatalogAction,
  handleCatalogOrderContact,
  handleCatalogManagerContact,
};
