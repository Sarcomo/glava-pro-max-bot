import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  PageBreak,
  TableOfContents,
  Footer,
  PageNumber,
} from 'docx';
import {
  PROJECTS,
  FAQ_ITEMS,
  TEST_CASES,
  introductionExtra,
  chapter1Sections,
  chapter2Sections,
  conclusionExtra,
  referencesExtra,
  appendixCode,
  appendixPricing,
} from './report-content.mjs';

const OUTPUT = path.join('C:\\Users\\Zhamb\\Downloads', 'Отчёт_практика_ГЛАВА_MAX_v2.docx');

const FONT = 'Times New Roman';
const CODE_FONT = 'Courier New';
const SIZE = 28;
const CODE_SIZE = 22;
const INDENT = 709;

function run(text, opts = {}) {
  return new TextRun({
    text,
    font: opts.code ? CODE_FONT : FONT,
    size: opts.size || (opts.code ? CODE_SIZE : SIZE),
    bold: opts.bold,
    italics: opts.italics,
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { after: 160, line: 360, lineRule: 'auto' },
    indent: opts.noIndent ? undefined : { firstLine: opts.center ? 0 : INDENT },
    pageBreakBefore: opts.pageBreak,
    children: [run(text, opts)],
  });
}

function paras(texts, opts = {}) {
  return texts.map((t) => p(t, opts));
}

function emptyLine() {
  return new Paragraph({ spacing: { after: 80 }, children: [run('')] });
}

function sectionTitle(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 200, line: 360, lineRule: 'auto' },
    children: [run(text, { bold: true })],
  });
}

function chapterIntro(title) {
  return [p(title, { center: true, bold: true, noIndent: true, size: 32 }), emptyLine()];
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function buildSections(sectionsMap) {
  const blocks = [];
  for (const [title, paragraphs] of Object.entries(sectionsMap)) {
    blocks.push(sectionTitle(title));
    blocks.push(...paras(paragraphs));
  }
  return blocks;
}

const titlePage = [
  p('Министерство науки и высшего образования Российской Федерации', { center: true, noIndent: true }),
  p('федеральное государственное бюджетное образовательное учреждение высшего образования', { center: true, noIndent: true }),
  p('«Байкальский государственный университет»', { center: true, noIndent: true, bold: true }),
  p('(БГУ)', { center: true, noIndent: true }),
  emptyLine(),
  p('Институт бизнеса и информатики', { center: true, noIndent: true }),
  emptyLine(),
  emptyLine(),
  p('ОТЧЁТ', { center: true, noIndent: true, bold: true, size: 32 }),
  p('по учебной практике', { center: true, noIndent: true, bold: true, size: 32 }),
  p('УП.02.03(П) Учебно-производственная практика (получение первичных профессиональных умений и навыков)', { center: true, noIndent: true }),
  emptyLine(),
  p('по направлению 09.03.03 «Прикладная информатика»', { center: true, noIndent: true }),
  p('(прикладной бакалавриат)', { center: true, noIndent: true }),
  p('профиль «Прикладная информатика в экономике»', { center: true, noIndent: true }),
  emptyLine(),
  emptyLine(),
  p('Тема: «Разработка чат-бота для мессенджера MAX строительной компании ПСК «ГЛАВА»»', { center: true, noIndent: true }),
  emptyLine(),
  emptyLine(),
  emptyLine(),
  p('Студент 3 курса очной формы обучения, группы [ГРУППА]', { noIndent: true }),
  p('________________ [ФИО СТУДЕНТА]', { noIndent: true }),
  emptyLine(),
  p('Руководитель: к.э.н., доцент', { noIndent: true }),
  p('________________ [ФИО РУКОВОДИТЕЛЯ]', { noIndent: true }),
  emptyLine(),
  emptyLine(),
  emptyLine(),
  p('Отчёт защищён:', { noIndent: true }),
  p('«_____» ___________ 2026 г.', { noIndent: true }),
  p('С оценкой _____________', { noIndent: true }),
  emptyLine(),
  p('Иркутск, 2026', { center: true, noIndent: true }),
  pageBreak(),
];

const introduction = [
  p('ВВЕДЕНИЕ', { center: true, noIndent: true, bold: true, size: 32 }),
  emptyLine(),
  ...paras([
    'Целью настоящей учебной практики является разработка программного решения для автоматизации первичной коммуникации с клиентами строительной компании — чат-бота в мессенджере MAX, способного квалифицировать заявки, предоставлять справочную информацию и передавать подготовленные лиды менеджеру.',
    'Практика проходила на базе производственной площадки ПСК «ГЛАВА» (сайты sip.glava.pro и ecodom.glava.pro), специализирующейся на строительстве домов по технологии СИП и продаже домокомплектов. Компании необходим современный канал обращения клиентов, интегрированный в отечественный мессенджер MAX, с возможностью сбора контактных данных, предварительного расчёта стоимости и демонстрации каталога проектов без участия менеджера на первом этапе.',
    'Актуальность темы обусловлена ростом доли цифровых каналов продаж в строительной отрасли. Потенциальный клиент ожидает мгновенного ответа, наглядного каталога и прозрачного расчёта бюджета. Чат-бот закрывает эти ожидания круглосуточно, снижает нагрузку на call-центр и повышает конверсию обращений в квалифицированные заявки.',
    'Объект исследования — процесс первичного взаимодействия клиента со строительной компанией в цифровой среде. Предмет исследования — методы проектирования и реализации чат-ботов на платформе MAX Bot API с использованием Node.js и Express.',
    'Цель практики — разработать и протестировать чат-бот «Глава Про» для мессенджера MAX, обеспечивающий сбор и квалификацию лидов для ПСК «ГЛАВА».',
  ]),
  ...paras([
    'Для достижения цели были поставлены следующие задачи:',
    '— изучить документацию MAX Bot API и требования к webhook-интеграции;',
    '— спроектировать архитектуру бота и пользовательские сценарии (меню, квиз, каталог, калькулятор);',
    '— реализовать серверную часть на Node.js с маршрутизацией событий и хранением лидов;',
    '— настроить уведомления менеджера и опциональную выгрузку в Google Sheets;',
    '— провести локальное тестирование с использованием HTTPS-туннеля.',
  ], { noIndent: true }),
  ...paras(introductionExtra),
  p('Структура отчёта: первая глава — теоретические основы; вторая — практическая реализация проекта glava-pro-max-bot; заключение; список источников; приложения с фрагментами кода, каталогом проектов и протоколом тестирования.'),
  pageBreak(),
];

const chapter1 = [
  ...chapterIntro('1 ТЕОРЕТИЧЕСКАЯ ЧАСТЬ'),
  ...buildSections(chapter1Sections),
  sectionTitle('Выводы по главе 1'),
  ...paras([
    'В первой главе систематизированы теоретические основы автоматизации клиентских коммуникаций в строительной отрасли, описаны возможности MAX Bot API, принципы построения webhook-сервера на Node.js/Express, подходы к управлению лидами и проектированию UX диалоговых сценариев. Рассмотрена продуктовая линейка ПСК «ГЛАВА» и технология СИП как контекст предметной области.',
    'Полученные теоретические выводы определили архитектуру практического проекта: модульный webhook-сервер, разделение flows/services/handlers, JSON-хранилище лидов с опциональной синхронизацией в Google Sheets, push-уведомления менеджеру в MAX, пошаговые сценарии квиза и калькулятора с inline-клавиатурами.',
    'Особое значение для практики имели вопросы безопасности (секрет webhook, хранение токена) и надёжности (немедленный 200 OK, retry для вложений). Эти принципы были заложены в реализацию с первого этапа разработки.',
  ]),
  pageBreak(),
];

const projectCatalogSection = [
  sectionTitle('2.8 Каталог проектов в боте'),
  p('В модуль data/projects.js импортированы данные о 15 проектах компании. Ниже приведено описание каждой позиции каталога, доступной пользователю бота.'),
  ...PROJECTS.flatMap((pr, i) => [
    p(`Проект ${i + 1}. ${pr.name} — категория «${pr.cat}», площадь ${pr.area} м², ${pr.price}. В карточке проекта пользователь видит описание, опции комплектации, изображение (при наличии файла в assets/catalog), кнопки «Заказать», «Смета PDF», «Наш сайт» (переход на ${pr.site}) и «Менеджер». При заказе формируется лид с указанием названия проекта в поле comment для корректного уведомления менеджера.`),
  ]),
];

const testingSection = [
  sectionTitle('2.9 Протокол функционального тестирования'),
  p('Таблица 2.1 — Результаты функционального тестирования бота «Глава Про»'),
  ...TEST_CASES.map(
    ([id, input, expected, result]) =>
      p(`${id}. Вход: ${input}. Ожидание: ${expected}. Результат: ${result}.`),
  ),
  p('Все перечисленные тест-кейсы выполнены успешно на локальном стенде с ngrok-туннелем. Регрессионное тестирование рекомендуется повторять после каждого изменения flows или maxApi.js.'),
];

const chapter2 = [
  ...chapterIntro('2 ПРАКТИЧЕСКАЯ ЧАСТЬ'),
  ...buildSections(chapter2Sections),
  ...projectCatalogSection,
  ...testingSection,
  sectionTitle('Выводы по главе 2'),
  ...paras([
    'Во второй главе описан полный цикл практической разработки: сбор требований, проектирование, реализация ядра webhook и API-клиента, создание сценариев меню, квиза, каталога, калькулятора, FAQ, экскурсии, модуля лидов и уведомлений, тестирование и подготовка к деплою.',
    'Каталог из 15 проектов интегрирован с сайтами sip.glava.pro и ecodom.glava.pro. Протокол тестирования подтверждает работоспособность основных функций. Проект glava-pro-max-bot готов к передаче в эксплуатацию после установки рабочего токена MAX и размещения на HTTPS-домене.',
    'Практическая работа продемонстрировала применимость знаний по направлению 09.03.03 к реальной задаче бизнеса — автоматизации первичных продаж в строительной компании.',
  ]),
  pageBreak(),
];

const conclusion = [
  p('ЗАКЛЮЧЕНИЕ', { center: true, noIndent: true, bold: true, size: 32 }),
  emptyLine(),
  ...paras([
    'В результате прохождения учебной практики выполнена разработка чат-бота для мессенджера MAX строительной компании ПСК «ГЛАВА». Решены задачи изучения MAX Bot API, проектирования архитектуры, реализации пользовательских сценариев, хранения лидов и тестирования интеграции.',
    'Практическая часть включала создание Node.js-приложения с модульной структурой, каталога из 15 проектов, квиза из 7 вопросов, калькулятора стоимости, раздела FAQ из 7 тем, записи на экскурсию и системы уведомлений менеджера. Получен опыт работы с webhook, inline-клавиатурами, загрузкой PDF и переменными окружения.',
    'Разработанный продукт может использоваться компанией для автоматизации первичного контакта с клиентами, сокращения времени ответа и повышения качества передаваемых менеджеру заявок.',
  ]),
  ...paras(conclusionExtra),
  pageBreak(),
];

const references = [
  p('СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ', { center: true, noIndent: true, bold: true, size: 32 }),
  emptyLine(),
  ...paras([
    '1. MAX для разработчиков — документация Bot API [Электронный ресурс]. URL: https://dev.max.ru/ (дата обращения: 10.07.2026).',
    '2. Node.js — официальная документация [Электронный ресурс]. URL: https://nodejs.org/docs/ (дата обращения: 10.07.2026).',
    '3. Express — руководство [Электронный ресурс]. URL: https://expressjs.com/ (дата обращения: 10.07.2026).',
    '4. Sip.glava.pro — сайт ПСК «ГЛАВА» [Электронный ресурс]. URL: https://sip.glava.pro/ (дата обращения: 10.07.2026).',
    '5. Ecodom.glava.pro — готовые дома [Электронный ресурс]. URL: https://ecodom.glava.pro/ (дата обращения: 10.07.2026).',
    '6. Google Sheets API — документация [Электронный ресурс]. URL: https://developers.google.com/sheets/api (дата обращения: 10.07.2026).',
    '7. Flanagan D. JavaScript: The Definitive Guide. — O\'Reilly Media, 2020. — 706 p.',
    '8. Fowler M. Patterns of Enterprise Application Architecture. — Addison-Wesley, 2002.',
    ...referencesExtra,
  ], { noIndent: true }),
  pageBreak(),
];

const faqAppendix = FAQ_ITEMS.flatMap((item, i) => [
  p(`Раздел ${i + 1}. ${item.title}: ${item.text}`),
]);

const appendices = [
  p('ПРИЛОЖЕНИЯ', { center: true, noIndent: true, bold: true, size: 32 }),
  emptyLine(),
  ...paras([
    'Приложение А — Задание на учебную практику (лист задания).',
    'Приложение Б — Структура каталогов проекта glava-pro-max-bot.',
    'Приложение В — Фрагменты программного кода.',
    'Приложение Г — Тексты разделов FAQ бота.',
    'Приложение Д — Скриншоты работы бота в MAX (главное меню, квиз, уведомление менеджеру).',
  ], { noIndent: true }),
  pageBreak(),
  p('Приложение Б', { noIndent: true, bold: true }),
  emptyLine(),
  ...paras([
    'glava-pro-max-bot/',
    '├── src/index.js              — точка входа, warmup PDF',
    '├── src/app.js                — Express, webhook, mini-app',
    '├── src/config.js             — конфигурация из .env',
    '├── src/maxApi.js             — клиент MAX Bot API',
    '├── src/handlers/updateHandler.js',
    '├── src/flows/                — menu, quiz, catalog, cost, faq, excursion…',
    '├── src/services/             — leads, pricing, state, media',
    '├── src/data/                 — projects, faq, constants',
    '├── src/utils/                — keyboard, messages, contact',
    '├── assets/pdfs/smeta.pdf',
    '├── assets/catalog/           — изображения проектов',
    '├── data/leads.json',
    '├── scripts/register-webhook.js',
    '└── .env                      — токены и секреты (не в git)',
  ], { noIndent: true }),
  pageBreak(),
  p('Приложение В', { noIndent: true, bold: true }),
  p('Фрагмент обработчика webhook (src/app.js):', { noIndent: true }),
  ...appendixCode.split('\n').map((line) => p(line, { noIndent: true, code: true })),
  emptyLine(),
  p('Фрагмент расчёта стоимости (src/services/pricing.js):', { noIndent: true }),
  ...appendixPricing.split('\n').map((line) => p(line, { noIndent: true, code: true })),
  pageBreak(),
  p('Приложение Г', { noIndent: true, bold: true }),
  p('Полные тексты разделов FAQ, реализованных в data/faq.js и flows/faq.js:', { noIndent: true }),
  ...faqAppendix,
  pageBreak(),
  p('Приложение Д', { noIndent: true, bold: true }),
  ...paras([
    'Место для скриншотов: рисунок Д.1 — главное меню бота; рисунок Д.2 — прохождение квиза; рисунок Д.3 — карточка проекта в каталоге; рисунок Д.4 — уведомление менеджеру о новой заявке; рисунок Д.5 — отправка PDF-сметы.',
    'Скриншоты необходимо вставить в документ перед сдачей отчёта на кафедру.',
  ]),
  pageBreak(),
  p('Приложение Е', { noIndent: true, bold: true }),
  p('Переменные окружения (.env) проекта glava-pro-max-bot:', { noIndent: true }),
  ...paras([
    'MAX_BOT_TOKEN — токен бота из кабинета MAX (обязательный).',
    'MAX_WEBHOOK_SECRET — секрет для заголовка X-Max-Bot-Api-Secret (обязательный).',
    'WEBHOOK_URL — публичный HTTPS URL вида https://домен/webhook.',
    'MANAGER_PHONE — телефон менеджера для отображения в боте, например +7 (924) 533-56-66.',
    'MANAGER_EMAIL — email компании для раздела «Менеджер».',
    'SITE_URL — основной сайт https://sip.glava.pro.',
    'MANAGER_MAX_USER_ID — user_id менеджера в MAX для push-уведомлений о заявках.',
    'MANAGER_MAX_CHAT_ID — альтернативный chat_id для уведомлений.',
    'LEADS_STORAGE — json (по умолчанию) или google_sheets.',
    'GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY — параметры интеграции с таблицей.',
    'ADMIN_SECRET — секрет для доступа к /admin/leads.',
    'PORT — порт HTTP-сервера (по умолчанию 3000).',
  ], { noIndent: true }),
];

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1134, right: 567, bottom: 1134, left: 1701 },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 24 })],
            }),
          ],
        }),
      },
      children: [
        ...titlePage,
        p('СОДЕРЖАНИЕ', { center: true, noIndent: true, bold: true }),
        new TableOfContents('Содержание', { hyperlink: true, headingStyleRange: '1-3' }),
        pageBreak(),
        ...introduction,
        ...chapter1,
        ...chapter2,
        ...conclusion,
        ...references,
        ...appendices,
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(OUTPUT, buffer);

const charCount = buffer.length;
console.log('Report saved:', OUTPUT);
console.log('File size (bytes):', charCount);
