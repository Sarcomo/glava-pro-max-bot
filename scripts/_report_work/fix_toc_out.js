const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

// Fix introduction order: move narrative paras out from before task list
delete require.cache[require.resolve('./report_content.js')];
const content = require('./report_content.js');
const move = [];
content.introduction = content.introduction.filter((p) => {
  if (p.startsWith('Практика шла не линейно') || p.startsWith('Писал от первого лица')) {
    move.push(p);
    return false;
  }
  return true;
});
for (const p of move) {
  if (!content.introductionTail.includes(p)) content.introductionTail.push(p);
}
fs.writeFileSync(path.join(ROOT, 'report_content.js'), 'module.exports = ' + JSON.stringify(content, null, 2) + ';\n');

// Extra volume (~3+ pages)
delete require.cache[require.resolve('./report_pad_bulk.js')];
const bulk = require('./report_pad_bulk.js');
const more = [
  ['2.71 Прогон глазами менеджера', [
    'Отдельно проходил путь не как клиент, а как менеджер: открыл заявки, понял ли контекст без подсказок разработчика, смог ли поправить карточку.',
    'Где спотыкался сам — упрощал подписи и поля. Админка должна читаться без инструкции на десять страниц.',
    'Если менеджеру стыдно открыть панель коллеге — значит, UI ещё сырой.',
  ]],
  ['2.72 Что считаю лишним в пилоте', [
    'Лишним было бы городить роли, сложные статусы лидов и тяжёлую аналитику до первых живых заявок.',
    'Лишним — обещать автосмету «как в договоре» из трёх ответов бота.',
    'Не лишним оказались Figma, тёмная тема и журнал заявок: без них продукт быстро выглядит учебной поделкой.',
  ]],
  ['2.73 Как бот помогает сайту, а не спорит с ним', [
    'Сайт остаётся витриной глубокого контента. Бот забирает быстрый интерес и квалификацию.',
    'Ссылки на sip.glava.pro рядом уместны: человек может уйти почитать и вернуться в чат.',
    'Мне важно, чтобы каналы не конкурировали, а подстраховывали друг друга.',
  ]],
  ['2.74 Ещё раз про PDF и доверие семьи', [
    'Стройка редко решается одним человеком. PDF и пересылаемые карточки как раз про семейное обсуждение.',
    'Поэтому файл в чате для меня не «фича ради галочки», а способ не потерять интерес на этапе «надо посоветоваться».',
    'После PDF снова оставляю путь к менеджеру — чтобы обсуждение дома заканчивалось контактом, а не тишиной.',
  ]],
  ['2.75 Коротко про то, чему научила практика', [
    'Научила держать продуктовую цель в голове, пока пишешь код. Иначе легко увлечься красивой каруселью и забыть про заявку.',
    'Научила резать scope без чувства вины: лучше рабочий контур, чем идеальная мечта на слайде.',
    'И научила уважать сопровождение: админка и справочники важны не меньше «вау»-экрана.',
  ]],
];
const have = new Set(bulk.map((x) => x.title));
for (const [title, paras] of more) {
  if (have.has(title)) continue;
  bulk.push({
    title,
    paras: paras.concat([
      'Всё это укладывается в тему работы: собрать и квалифицировать заявку строительной компании в MAX так, чтобы менеджеру было с чем работать.',
    ]),
  });
}
fs.writeFileSync(path.join(ROOT, 'report_pad_bulk.js'), 'module.exports = ' + JSON.stringify(bulk, null, 2) + ';\n');

function buildToc() {
  delete require.cache[require.resolve('./report_content.js')];
  delete require.cache[require.resolve('./report_extra.js')];
  delete require.cache[require.resolve('./report_pad_more.js')];
  delete require.cache[require.resolve('./report_pad_bulk.js')];
  const content = require('./report_content.js');
  const extra = require('./report_extra.js');
  const padMore = require('./report_pad_more.js');
  const padBulk = require('./report_pad_bulk.js');

  const titles = ['ВВЕДЕНИЕ', content.chapter1.title];
  for (const s of content.chapter1.sections) titles.push(s.title);
  titles.push(content.chapter2.title);
  const body = content.chapter2.sections.filter((s) => !s.title.startsWith('Выводы'));
  const conc = content.chapter2.sections.find((s) => s.title.startsWith('Выводы'));
  for (const s of body) titles.push(s.title);
  for (const s of extra.padSections || []) titles.push(s.title);
  for (const s of padMore || []) titles.push(s.title);
  for (const s of padBulk || []) titles.push(s.title);
  if (conc) titles.push(conc.title);
  titles.push('ЗАКЛЮЧЕНИЕ', 'СПИСОК ИСПОЛЬЗОВАННЫХ РЕСУРСОВ', 'ПРИЛОЖЕНИЯ');

  let page = 4;
  return titles.map((title) => {
    const row = [title, String(page)];
    page += title === 'ВВЕДЕНИЕ' ? 2 : 1;
    return row;
  });
}

let s = fs.readFileSync(path.join(ROOT, 'build_report.js'), 'utf8');
s = s.replace(/const OUT = '[^']+';/, "const OUT = 'c:/Users/Zhamb/glava-pro-max-bot/Отчёт_Жамсаранжапов_живой.docx';");
s = s.replace(
  /Анализ MAX Bot API и Web App SDK; формулирование ТЗ и пользовательских сценариев\./,
  'Анализ MAX Bot API и Web App SDK; пользовательские сценарии бота и Mini App.',
);

const toc = buildToc();
const tocLit =
  'const toc = [\r\n' +
  toc.map(([t, p]) => `    ['${t.replace(/'/g, "\\'")}', '${p}']`).join(',\r\n') +
  '\r\n  ]';

const re = /const toc = \[[\s\S]*?\];\r?\n  for \(const \[title, page\] of toc\)/;
if (!re.test(s)) throw new Error('toc regex failed');
s = s.replace(re, tocLit + ';\r\n  for (const [title, page] of toc)');
fs.writeFileSync(path.join(ROOT, 'build_report.js'), s);

let n = 0;
const add = (x) => {
  if (typeof x === 'string') n += x.length;
};
const c = require('./report_content.js');
const e = require('./report_extra.js');
const pm = require('./report_pad_more.js');
const pb = require('./report_pad_bulk.js');
c.introduction.forEach(add);
c.introductionTasks.forEach(add);
c.introductionTail.forEach(add);
for (const ch of [c.chapter1, c.chapter2]) {
  add(ch.title);
  ch.sections.forEach((sec) => {
    add(sec.title);
    (sec.paras || []).forEach(add);
    (sec.parasAfter || []).forEach(add);
  });
}
(e.padSections || []).forEach((sec) => {
  add(sec.title);
  sec.paras.forEach(add);
});
(e.moreTheory || []).forEach(add);
(e.moreDesignAdmin || []).forEach(add);
pm.forEach((sec) => {
  add(sec.title);
  sec.paras.forEach(add);
});
pb.forEach((sec) => {
  add(sec.title);
  sec.paras.forEach(add);
});
console.log('TOC', toc.length, 'est pages', (n / 1800).toFixed(1), 'chars', n);
console.log('sample toc', toc.slice(0, 8));
