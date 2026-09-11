/**
 * Сборка отчёта по практике (≥30 стр. основной части).
 */
const fs = require('fs');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  PageNumber,
  Footer,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  VerticalAlign,
  PageBreak,
  TabStopType,
  Bookmark,
  InternalHyperlink,
  UnderlineType,
  TableOfContents,
} = require('docx');

const base = require('./report_content.js');
const extra = require('./report_extra.js');
const padMore = require('./report_pad_more.js');
const padBulk = require('./report_pad_bulk.js');

const OUT = 'c:/Users/Zhamb/glava-pro-max-bot/Отчёт_Жамсаранжапов_30стр.docx';
const LOGO = 'c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/logo.png';

const FONT = 'Times New Roman';
const SZ = 28;
const SZ_SM = 24;
const LINE = 360;
const FIRST = 720;

function t(text, opts = {}) {
  return new TextRun({
    text,
    font: FONT,
    size: opts.size || SZ,
    bold: !!opts.bold,
    italics: !!opts.italics,
  });
}

function p(text, opts = {}) {
  const align =
    opts.align === 'center'
      ? AlignmentType.CENTER
      : opts.align === 'left'
        ? AlignmentType.LEFT
        : opts.align === 'right'
          ? AlignmentType.RIGHT
          : AlignmentType.BOTH;
  return new Paragraph({
    spacing: { line: LINE, lineRule: 'auto', after: opts.after || 0, before: opts.before || 0 },
    indent: { firstLine: opts.noIndent ? 0 : FIRST },
    alignment: align,
    children: [t(text, { bold: opts.bold, size: opts.size, italics: opts.italics })],
  });
}

function empty() {
  return new Paragraph({
    spacing: { line: LINE, lineRule: 'auto' },
    indent: { firstLine: 0 },
    children: [],
  });
}

function headingChildren(text, bookmarkId) {
  const run = t(text, { bold: true });
  if (!bookmarkId) return [run];
  return [new Bookmark({ id: bookmarkId, children: [run] })];
}

function h1(text, bookmarkId) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { line: LINE, lineRule: 'auto', before: 240, after: 240 },
    indent: { firstLine: 0 },
    alignment: AlignmentType.CENTER,
    children: headingChildren(text, bookmarkId),
  });
}

function h2(text, bookmarkId) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { line: LINE, lineRule: 'auto', before: 200, after: 120 },
    indent: { firstLine: FIRST },
    alignment: AlignmentType.BOTH,
    children: headingChildren(text, bookmarkId),
  });
}

function tocLink(text, bookmarkId) {
  return new InternalHyperlink({
    anchor: bookmarkId,
    children: [
      new TextRun({
        text,
        font: FONT,
        size: SZ,
        color: '000000',
        underline: { type: UnderlineType.NONE },
      }),
    ],
  });
}

function tocParagraph(title, page, bookmarkId, isSub) {
  return new Paragraph({
    spacing: { line: LINE, lineRule: 'auto', after: isSub ? 0 : 60 },
    indent: { firstLine: 0, left: isSub ? 360 : 0 },
    tabStops: [{ type: TabStopType.RIGHT, position: 9631, leader: 'dot' }],
    children: [
      tocLink(title, bookmarkId),
      new TextRun({ text: '\t', font: FONT, size: SZ }),
      tocLink(String(page), bookmarkId),
    ],
  });
}

function listItem(text, n) {
  return new Paragraph({
    spacing: { line: LINE, lineRule: 'auto' },
    indent: { left: 720, hanging: 360 },
    alignment: AlignmentType.BOTH,
    children: [t(`${n}. ${text}`)],
  });
}

function cell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.w || 2000, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        spacing: { line: 276, lineRule: 'auto' },
        indent: { firstLine: 0 },
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [t(text, { bold: !!opts.bold, size: opts.size || 20 })],
      }),
    ],
  });
}

function makeTable(headers, rows, colWidths) {
  return new Table({
    width: { size: colWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    rows: [
      new TableRow({
        children: headers.map((h, i) => cell(h, { bold: true, center: true, w: colWidths[i] })),
      }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: r.map((c, i) => cell(String(c), { w: colWidths[i], center: i > 0 && r.length > 2 })),
          }),
      ),
    ],
  });
}

function addTable(children, table) {
  children.push(
    new Paragraph({
      spacing: { line: LINE, lineRule: 'auto' },
      indent: { firstLine: 0 },
      alignment: AlignmentType.RIGHT,
      children: [t(table.label, { bold: true })],
    }),
  );
  children.push(
    new Paragraph({
      spacing: { line: LINE, lineRule: 'auto', after: 120 },
      indent: { firstLine: 0 },
      alignment: AlignmentType.CENTER,
      children: [t(table.caption, { italics: true })],
    }),
  );
  children.push(makeTable(table.headers, table.rows, table.widths));
  children.push(empty());
}

function pushSection(children, section, bookmarkId) {
  children.push(h2(section.title, bookmarkId));
  for (const para of section.paras || []) children.push(p(para));
  if (section.table) addTable(children, section.table);
  for (const para of section.parasAfter || []) children.push(p(para));
}

function countMainChars(content) {
  let n = 0;
  const add = (s) => {
    if (typeof s === 'string') n += s.length;
  };
  content.introduction.forEach(add);
  content.introductionTasks.forEach(add);
  content.introductionTail.forEach(add);
  for (const ch of [content.chapter1, content.chapter2]) {
    add(ch.title);
    for (const s of ch.sections) {
      add(s.title);
      (s.paras || []).forEach(add);
      (s.parasAfter || []).forEach(add);
      if (s.table) {
        add(s.table.label + s.table.caption);
        s.table.headers.forEach(add);
        s.table.rows.flat().forEach(add);
      }
    }
  }
  return n;
}

function mergeContent() {
  const content = JSON.parse(JSON.stringify(base));
  if (extra.introTitleParas && extra.introTitleParas.length) {
    content.introduction = extra.introTitleParas.concat(content.introduction || []);
  }
  if (extra.moreTheory) {
    const s11 = content.chapter1.sections.find((s) => s.title.startsWith('1.1'));
    if (s11) s11.paras = (s11.paras || []).concat(extra.moreTheory);
  }
  if (extra.padByPrefix) {
    for (const ch of [content.chapter1, content.chapter2]) {
      for (const section of ch.sections) {
        for (const [prefix, paras] of Object.entries(extra.padByPrefix)) {
          if (section.title.startsWith(prefix)) {
            section.paras = (section.paras || []).concat(paras);
          }
        }
      }
    }
  }
  if (extra.moreDesignAdmin && extra.moreDesignAdmin.length) {
    const s25 = content.chapter2.sections.find((s) => s.title.startsWith('2.5'));
    if (s25) s25.paras = (s25.paras || []).concat(extra.moreDesignAdmin);
  }
  // padMore/padBulk отключены — структура как у образца: 6–7 подглав
  return content;
}

async function main() {
  const content = mergeContent();
  const chars = countMainChars(content);
  console.log('Main chars:', chars, 'approx pages @1800:', (chars / 1800).toFixed(1));
  if (chars / 1800 < 30) {
    console.warn('WARNING: estimated pages < 30');
  }

  const logoBuf = fs.readFileSync(LOGO);
  const children = [];

  // Title
  children.push(
    new Paragraph({
      spacing: { line: 240, lineRule: 'auto' },
      indent: { firstLine: 0 },
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ type: 'png', data: logoBuf, transformation: { width: 70, height: 90 } })],
    }),
  );
  for (const line of [
    'Министерство образования и науки Российской Федерации',
    'федеральное государственное бюджетное образовательное учреждение',
    'высшего образования',
    '«Иркутский государственный университет»',
    '(ФГБОУ ВО «ИГУ»)',
    'Факультет бизнес-коммуникаций и информатики',
    'Кафедра естественнонаучных дисциплин',
  ]) {
    children.push(
      new Paragraph({
        spacing: { line: 240, lineRule: 'auto' },
        indent: { firstLine: 0 },
        alignment: AlignmentType.CENTER,
        children: [t(line, { size: SZ_SM })],
      }),
    );
  }
  children.push(empty(), empty());
  const bc = (text, size = SZ) =>
    new Paragraph({
      spacing: { line: 240, lineRule: 'auto' },
      indent: { firstLine: 0 },
      alignment: AlignmentType.CENTER,
      children: [t(text, { bold: true, size })],
    });
  children.push(bc('ОТЧЕТ ПО УЧЕБНОЙ ПРАКТИКЕ'));
  children.push(empty());
  children.push(
    new Paragraph({
      spacing: { line: 240, lineRule: 'auto' },
      indent: { firstLine: 0 },
      alignment: AlignmentType.CENTER,
      children: [t('на тему:', { italics: true, size: SZ_SM })],
    }),
  );
  children.push(
    new Paragraph({
      spacing: { line: 276, lineRule: 'auto', after: 200 },
      indent: { firstLine: 0 },
      alignment: AlignmentType.CENTER,
      children: [
        t(
          '«Разработка чат-бота для сбора и квалификации заявок строительной компании на платформе MAX»',
          { bold: true, size: SZ_SM },
        ),
      ],
    }),
  );
  children.push(bc('Б2.В.03(У) Научно-исследовательская работа', SZ_SM));
  children.push(bc('(получение первичных навыков научно-исследовательской работы)', SZ_SM));
  children.push(bc('по направлению 09.03.03 «Прикладная информатика»(прикладной бакалавриат)', SZ_SM));
  children.push(bc('Профиль «Прикладная информатика в дизайне»'));
  children.push(empty(), empty());
  for (const line of [
    'Студент 3 курса очной формыобучения, группа 14322-ДБ',
    '_________ Б.Д. Жамсаранжапов',
    'Руководитель: ст.преп.',
    '__________ О.А. Инешина',
    'Работа защищена:',
    '«_____» ___________ 2026 г.',
    'С оценкой _____________',
  ]) {
    children.push(
      new Paragraph({
        spacing: { line: 240, lineRule: 'auto' },
        indent: { firstLine: 0 },
        alignment: AlignmentType.LEFT,
        children: [t(line)],
      }),
    );
  }
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Оглавление как у Биктуловой: поле Word TOC с гиперссылками
  children.push(
    new Paragraph({
      spacing: { line: LINE, lineRule: 'auto', before: 240, after: 240 },
      indent: { firstLine: 0 },
      alignment: AlignmentType.CENTER,
      children: [t('ОГЛАВЛЕНИЕ', { bold: true })],
    }),
  );

  const tocCached = [
    { title: 'ВВЕДЕНИЕ', level: 1, page: 4, href: 'bm_intro' },
    {
      title:
        '1 ТЕОРЕТИЧЕСКИЕ ОСНОВЫ СБОРА И КВАЛИФИКАЦИИ ЗАЯВОК ЧЕРЕЗ ЧАТ-БОТЫ И MINI APPS В МЕССЕНДЖЕРАХ',
      level: 1,
      page: 6,
      href: 'bm_ch1',
    },
    {
      title: '1.1 Мессенджеры как канал цифровых сервисов и лидогенерации',
      level: 2,
      page: 6,
      href: 'bm_ch1_1',
    },
    {
      title: '1.2 Технические и бизнес-возможности платформы MAX',
      level: 2,
      page: 8,
      href: 'bm_ch1_2',
    },
    {
      title: '1.3 Специфика квалификации заявок строительной компании',
      level: 2,
      page: 10,
      href: 'bm_ch1_3',
    },
    {
      title: '1.4 Каталог проектов и Mini App как элементы воронки',
      level: 2,
      page: 12,
      href: 'bm_ch1_4',
    },
    {
      title: '1.5 Особенности проектирования интерфейсов мини-приложений мессенджеров',
      level: 2,
      page: 14,
      href: 'bm_ch1_5',
    },
    {
      title: '1.6 Анализ существующих решений и обоснование выбранного подхода',
      level: 2,
      page: 16,
      href: 'bm_ch1_6',
    },
    { title: 'Выводы по главе', level: 2, page: 18, href: 'bm_ch1_conc' },
    {
      title:
        '2 ПРАКТИЧЕСКАЯ РЕАЛИЗАЦИЯ ЧАТ-БОТА И MINI APP КАТАЛОГА ДЛЯ ПСК «ГЛАВА» НА ПЛАТФОРМЕ MAX',
      level: 1,
      page: 19,
      href: 'bm_ch2',
    },
    {
      title: '2.1 Общая характеристика приложения и постановка задачи',
      level: 2,
      page: 19,
      href: 'bm_ch2_1',
    },
    {
      title:
        '2.2 Реализация чат-бота: квалификация, калькулятор, сервисные сценарии и FAQ',
      level: 2,
      page: 21,
      href: 'bm_ch2_2',
    },
    {
      title: '2.3 Компонентная библиотека и проектирование экранов каталога в Figma',
      level: 2,
      page: 24,
      href: 'bm_ch2_3',
    },
    { title: '2.4 Реализация Mini App каталога', level: 2, page: 26, href: 'bm_ch2_4' },
    {
      title: '2.5 Админ-панель: управление каталогом, заявками и рассылками',
      level: 2,
      page: 28,
      href: 'bm_ch2_5',
    },
    {
      title: '2.6 Интеграция с MAX, архитектура, безопасность и развёртывание',
      level: 2,
      page: 31,
      href: 'bm_ch2_6',
    },
    { title: '2.7 Тестирование и результаты', level: 2, page: 33, href: 'bm_ch2_7' },
    { title: 'Выводы по главе', level: 2, page: 35, href: 'bm_ch2_conc' },
    { title: 'ЗАКЛЮЧЕНИЕ', level: 1, page: 36, href: 'bm_conclusion' },
    { title: 'СПИСОК ИСПОЛЬЗОВАННЫХ РЕСУРСОВ', level: 1, page: 37, href: 'bm_refs' },
    { title: 'ПРИЛОЖЕНИЯ', level: 1, page: 38, href: 'bm_apps' },
    { title: 'Приложение А', level: 2, page: 38, href: 'bm_app_a' },
    { title: 'Приложение Б', level: 2, page: 39, href: 'bm_app_b' },
  ];

  const sectionBookmarks = {
    '1.1': 'bm_ch1_1',
    '1.2': 'bm_ch1_2',
    '1.3': 'bm_ch1_3',
    '1.4': 'bm_ch1_4',
    '1.5': 'bm_ch1_5',
    '1.6': 'bm_ch1_6',
    '2.1': 'bm_ch2_1',
    '2.2': 'bm_ch2_2',
    '2.3': 'bm_ch2_3',
    '2.4': 'bm_ch2_4',
    '2.5': 'bm_ch2_5',
    '2.6': 'bm_ch2_6',
    '2.7': 'bm_ch2_7',
  };

  children.push(
    new TableOfContents('Table of Contents', {
      hyperlink: true,
      headingStyleRange: '1-3',
      hideTabAndPageNumbersInWebView: true,
      useAppliedParagraphOutlineLevel: true,
      beginDirty: true,
      cachedEntries: tocCached,
    }),
  );
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // INTRODUCTION
  children.push(h1('ВВЕДЕНИЕ', 'bm_intro'));
  for (const para of content.introduction) children.push(p(para));
  content.introductionTasks.forEach((task, i) => children.push(listItem(task, i + 1)));
  for (const para of content.introductionTail) children.push(p(para));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // CHAPTERS
  const chapterMeta = [
    { data: content.chapter1, id: 'bm_ch1', concId: 'bm_ch1_conc' },
    { data: content.chapter2, id: 'bm_ch2', concId: 'bm_ch2_conc' },
  ];
  for (const { data: ch, id: chId, concId } of chapterMeta) {
    children.push(h1(ch.title, chId));
    for (const section of ch.sections) {
      let bm = null;
      if (section.title.startsWith('Выводы')) bm = concId;
      else {
        const key = Object.keys(sectionBookmarks).find((k) => section.title.startsWith(k));
        bm = key ? sectionBookmarks[key] : null;
      }
      pushSection(children, section, bm);
    }
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // CONCLUSION (not counted in main 30)
  children.push(h1('ЗАКЛЮЧЕНИЕ', 'bm_conclusion'));
  children.push(
    p(
      'В ходе учебной практики была разработана и внедрена система сбора и квалификации заявок строительной компании ПСК «ГЛАВА» на платформе MAX. Решение включает чат-бота с сценариями квалификации и сервиса, Mini App каталога проектов и админ-панель сопровождения контента и лидов.',
    ),
  );
  children.push(
    p(
      'Поставленная цель достигнута: пользователь проходит первичный диалог, получает ориентир по стоимости и доступ к каталогу, оставляет контакт, а менеджер получает заявку с контекстом. Дизайн мини-приложения выполнен в Figma и реализован с поддержкой светлой и тёмной тем. Админ-панель обеспечивает актуальность каталога без постоянной помощи разработчика.',
    ),
  );
  children.push(
    p(
      'Перспективы развития связаны с аналитикой воронки, усилением модели доступа к админке при росте команды и уточнением единого источника данных для карточек бота и Mini App. Базовая продуктовая идея при этом сохраняется: довести квалифицированного клиента до менеджера в среде мессенджера MAX.',
    ),
  );
  children.push(new Paragraph({ children: [new PageBreak()] }));

  children.push(h1('СПИСОК ИСПОЛЬЗОВАННЫХ РЕСУРСОВ', 'bm_refs'));
  const refs = [
    'Mini App MAX: что это, зачем бизнесу и как проходит создание мини приложений [Электронный ресурс] // parsesite – URL: https://parsesite.ru/ru/blog/mini-app-maks-chto-eto-zachem-biznesu (дата обращения: 16.06.2026).',
    'WebApps для MAX [Электронный ресурс] // evmapps – URL: https://evmapps.ru/webapps-max/ (дата обращения: 17.06.2026).',
    'Как устроены веб-аппы и мини-аппы [Электронный ресурс] // РБК Компании – URL: https://companies.rbc.ru/news/wIDIoMYw0j/kak-ustroenyi-vebappy (дата обращения: 18.06.2026).',
    'Core Web Vitals [Электронный ресурс] // Google Search Central – URL: https://developers.google.com/search/docs/appearance/core-web-vitals (дата обращения: 18.06.2026).',
    '3M Visual Attention and Perception [Электронный ресурс] // 3M – URL: https://www.3m.com (дата обращения: 18.06.2026).',
    'MAX Web App SDK (max-web-app.js) [Электронный ресурс] // st.max.ru – URL: https://st.max.ru/js/max-web-app.js (дата обращения: 19.06.2026).',
    'Документация Express [Электронный ресурс] // expressjs.com – URL: https://expressjs.com/ (дата обращения: 20.06.2026).',
    'MDN Web Docs: HTML, CSS, JavaScript [Электронный ресурс] // developer.mozilla.org – URL: https://developer.mozilla.org (дата обращения: 22.06.2026).',
    'Node.js Documentation [Электронный ресурс] // nodejs.org – URL: https://nodejs.org/docs/ (дата обращения: 23.06.2026).',
    'Документация веб-сервера nginx [Электронный ресурс] // nginx.org – URL: https://nginx.org/ru/docs/ (дата обращения: 24.06.2026).',
    'PM2 Process Manager [Электронный ресурс] // pm2.keymetrics.io – URL: https://pm2.keymetrics.io/docs/ (дата обращения: 26.06.2026).',
    'Google Sheets API Node.js [Электронный ресурс] // developers.google.com – URL: https://developers.google.com/sheets/api (дата обращения: 27.06.2026).',
  ];
  refs.forEach((r, i) => {
    children.push(
      new Paragraph({
        spacing: { line: LINE, lineRule: 'auto', after: 120 },
        indent: { left: 720, hanging: 720 },
        alignment: AlignmentType.BOTH,
        children: [t(`${i + 1}. ${r}`)],
      }),
    );
  });
  children.push(new Paragraph({ children: [new PageBreak()] }));

  children.push(h1('ПРИЛОЖЕНИЯ', 'bm_apps'));
  children.push(h2('Приложение А', 'bm_app_a'));
  children.push(p('Структура проекта glava-pro-max-bot', { align: 'center', noIndent: true, bold: true }));
  for (const line of [
    'glava-pro-max-bot/',
    '├── src/index.js, app.js, config.js, maxApi.js',
    '├── src/handlers/updateHandler.js',
    '├── src/flows/ (menu, quiz, cost, catalog, excursion, faq, manager, siteEval)',
    '├── src/services/ (leads, pricing, state, media)',
    '├── src/data/ (projects, faq, constants)',
    '├── public/app/ (Mini App каталога)',
    '├── scripts/register-webhook.js',
    '└── data/leads.json',
  ]) {
    children.push(
      new Paragraph({
        spacing: { line: 276, lineRule: 'auto' },
        indent: { firstLine: 0 },
        children: [t(line, { size: 20 })],
      }),
    );
  }
  children.push(empty());
  children.push(
    p(
      'Фрагмент логики расчёта: база = цена_м² × mid_площади × коэффициент_комплектации; вилка = [0,95; 1,15] × база. Фрагмент безопасности webhook: сравнение X-Max-Bot-Api-Secret через crypto.timingSafeEqual, ответ 401 при ошибке и 200 OK с асинхронной обработкой update при успехе.',
    ),
  );

  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(h2('Приложение Б', 'bm_app_b'));
  children.push(p('Ежедневные записи студента по практике', { align: 'center', noIndent: true, bold: true }));
  children.push(
    makeTable(
      ['Дата', 'Описание работы, выполненной студентом', 'Отметка руководителя'],
      [
        ['15.06', 'Вводная лекция по практике. Ознакомление с программой и требованиями к отчёту.', ''],
        ['16.06–18.06', 'Изучение аналогов ботов и Mini Apps, сбор референсов по строительным сервисам.', ''],
        ['19.06–20.06', 'Анализ MAX Bot API и Web App SDK; пользовательские сценарии бота и Mini App.', ''],
        ['22.06–24.06', 'Проектирование архитектуры модулей; настройка Express и /health.', ''],
        ['25.06–27.06', 'Реализация меню, квиза подбора дома и сохранения лида.', ''],
        ['29.06–01.07', 'Калькулятор стоимости, каталог, экскурсия, FAQ.', ''],
        ['02.07–04.07', 'Mini App каталога, подключение max-web-app.js, фирменный UI.', ''],
        ['06.07–07.07', 'Webhook: секрет, асинхронная обработка, регистрация подписки.', ''],
        ['08.07–09.07', 'Деплой-контур, end-to-end тесты, доработка текстов.', ''],
        ['10.07–11.07', 'Оформление отчёта, нормоконтроль, защита.', ''],
      ],
      [1400, 6200, 2000],
    ),
  );

  const doc = new Document({
    features: {
      updateFields: true,
    },
    styles: {
      default: {
        document: {
          styles: [
            {
              id: 'Normal',
              name: 'Normal',
              run: { font: FONT, size: SZ },
              paragraph: {
                spacing: { line: LINE, lineRule: 'auto' },
                indent: { firstLine: FIRST },
                alignment: AlignmentType.BOTH,
              },
            },
          ],
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickStyle: true,
          paragraph: {
            spacing: { before: 240, after: 240, line: LINE, lineRule: 'auto' },
            indent: { firstLine: 0 },
            alignment: AlignmentType.CENTER,
            outlineLevel: 0,
          },
          run: { font: FONT, size: SZ, bold: true, smallCaps: true },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickStyle: true,
          paragraph: {
            spacing: { before: 200, after: 120, line: LINE, lineRule: 'auto' },
            indent: { firstLine: FIRST },
            outlineLevel: 1,
          },
          run: { font: FONT, size: SZ, bold: true },
        },
        {
          id: 'TOC1',
          name: 'toc 1',
          basedOn: 'Normal',
          next: 'Normal',
          paragraph: {
            spacing: { line: LINE, lineRule: 'auto', after: 60 },
            indent: { firstLine: 0, left: 0 },
          },
          run: { font: FONT, size: SZ },
        },
        {
          id: 'TOC2',
          name: 'toc 2',
          basedOn: 'Normal',
          next: 'Normal',
          paragraph: {
            spacing: { line: LINE, lineRule: 'auto' },
            indent: { firstLine: 0, left: 360 },
          },
          run: { font: FONT, size: SZ },
        },
        {
          id: 'TOC3',
          name: 'toc 3',
          basedOn: 'Normal',
          next: 'Normal',
          paragraph: {
            spacing: { line: LINE, lineRule: 'auto' },
            indent: { firstLine: 0, left: 720 },
          },
          run: { font: FONT, size: SZ },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11909, height: 16834 },
            margin: { top: 1134, right: 567, bottom: 1134, left: 1701, header: 720, footer: 720 },
            pageNumbers: { start: 1 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ font: FONT, size: SZ_SM, children: [PageNumber.CURRENT] })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT, buffer);
  console.log('Written', OUT, buffer.length);

  // copy next to Biktulova folder if present
  try {
    const downloads = 'c:/Users/Zhamb/Downloads';
    const folder = fs.readdirSync(downloads).find((n) => n.includes('Биктулова'));
    if (folder) {
      const inner = fs.readdirSync(`${downloads}/${folder}`)[0];
      const dest = `${downloads}/${folder}/${inner}/Отчёт_Жамсаранжапов_30стр.docx`;
      fs.copyFileSync(OUT, dest);
      console.log('Copied to', dest);
    }
  } catch (e) {
    console.log('Copy skipped:', e.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
