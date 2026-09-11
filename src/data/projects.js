const path = require('path');

const assets = (...parts) => path.join(__dirname, '..', '..', 'assets', 'catalog', ...parts);

const SITE_BASE = {
  domokomplekt: 'https://sip.glava.pro/projects',
  ready: 'https://ecodom.glava.pro/projects',
};

const PROJECT_SITE_SLUGS = {
  shogoi: 'shogoy',
};

function getProjectSiteUrl(project) {
  const slug = PROJECT_SITE_SLUGS[project.id] || project.id;
  const base = SITE_BASE[project.category];
  return base ? `${base}/${slug}` : null;
}

const projects = [
  {
    id: 'shogoi',
    name: 'Домокомплект «Шогой»',
    area: 23,
    floors: '1 этаж',
    rooms: 1,
    bedrooms: 1,
    priceFrom: 227300,
    priceLabel: 'от 227 300 ₽',
    technology: 'sip',
    imagePath: assets('shogoi.jpg'),
    description:
      'Компактный домокомплект **23 м²** со свободной планировкой: гостевой дом, тёплая беседка, ' +
      'садовый офис или хозблок. Лёгкая сборка за несколько дней, подходит простой фундамент на сваях.',
    options: [
      { name: 'Пиломатериал сухой', price: 39000 },
      { name: 'Пена монтажная', price: 23400 },
      { name: 'Крепеж', price: 7500 },
    ],
    category: 'domokomplekt',
  },
  {
    id: 'selenga',
    name: 'Домокомплект «Селенга»',
    area: 50,
    floors: '1 этаж',
    rooms: 3,
    bedrooms: 2,
    priceFrom: 437800,
    priceLabel: 'от 437 800 ₽',
    technology: 'sip',
    imagePath: assets('selenga.jpg'),
    description:
      'Домокомплект **50 м²** с односкатной крышей — **2 спальни** и просторная кухня-гостиная. ' +
      'Потолки от 2 до 3 м, проверенная архитектура, можно добавить террасу.',
    options: [
      { name: 'Пиломатериал сухой', price: 126300 },
      { name: 'Пена монтажная', price: 52780 },
      { name: 'Крепеж', price: 14500 },
    ],
    category: 'domokomplekt',
  },
  {
    id: 'alla',
    name: 'Домокомплект «Алла»',
    area: 48,
    floors: '1 этаж',
    rooms: 2,
    bedrooms: 2,
    priceFrom: 490300,
    priceLabel: 'от 490 300 ₽',
    technology: 'sip',
    imagePath: assets('alla.jpg'),
    description:
      'Стильный СИП-домокомплект **48 м²** с высокими потолками и выходом на террасу. ' +
      'Энергоэффективные стены, сборка за 7–10 дней, строительство в любой сезон.',
    options: [
      { name: 'Сухой пиломатериал', price: 104000 },
      { name: 'Пена монтажная', price: 46800 },
      { name: 'Крепеж', price: 12500 },
    ],
    category: 'domokomplekt',
  },
  {
    id: 'ilogir',
    name: 'Домокомплект «Илогирь»',
    area: 86,
    floors: '2 этажа',
    rooms: 6,
    bedrooms: 4,
    priceFrom: 668000,
    priceLabel: 'от 668 000 ₽',
    technology: 'sip',
    imagePath: assets('ilogir.jpg'),
    description:
      'Двухэтажный домокомплект **86 м²** — **4 спальни** на втором этаже. ' +
      'Безотходный раскрой СИП-панелей, потолки 1-го этажа **2,8 м**, для постоянного проживания.',
    options: [
      { name: 'Пиломатериал сухой', price: 182000 },
      { name: 'Пена монтажная', price: 54600 },
      { name: 'Крепеж', price: 21000 },
    ],
    category: 'domokomplekt',
  },
  {
    id: 'angara',
    name: 'Домокомплект «Ангара»',
    area: 100,
    floors: '1 этаж',
    rooms: 3,
    bedrooms: 2,
    priceFrom: 705700,
    priceLabel: 'от 705 700 ₽',
    technology: 'sip',
    imagePath: assets('angara.jpg'),
    description:
      'Домокомплект **100 м²** с кухней-гостиной **36 м²** и двумя спальнями. ' +
      'Потолки **2,8 м**, двускатная или вальмовая крыша, сборка от 2 недель.',
    options: [
      { name: 'Сухой пиломатериал', price: 247000 },
      { name: 'Пена монтажная', price: 80990 },
      { name: 'Крепеж', price: 22250 },
    ],
    category: 'domokomplekt',
  },
  {
    id: 'barguzin',
    name: 'Домокомплект «Баргузин»',
    area: 112,
    floors: '1 этаж',
    rooms: 4,
    bedrooms: 3,
    priceFrom: 784400,
    priceLabel: 'от 784 400 ₽',
    technology: 'sip',
    imagePath: assets('barguzin.jpg'),
    description:
      'Одноэтажный дом **112 м²** для постоянного проживания. Размеры подогнаны под стандартный ' +
      'раскрой СИП-панелей: без обрезков и лишних расходов. Потолки **2,8 м**, быстрая сухая сборка.',
    options: [
      { name: 'Сухой пиломатериал', price: 247000 },
      { name: 'Пена монтажная', price: 91000 },
      { name: 'Крепёж', price: 24500 },
    ],
    category: 'domokomplekt',
  },
  {
    id: 'chernorud',
    name: 'Проект «Черноруд»',
    area: 46,
    floors: '1 этаж',
    rooms: 3,
    bedrooms: 2,
    priceFrom: 4500000,
    priceLabel: 'от 4 500 000 ₽',
    technology: 'timber',
    imagePath: assets('chernorud.jpg'),
    description:
      'Компактный дом **46 м²** в классическом стиле: брус вакуумной сушки, узел «Сила», ' +
      'потолки **3 м**, парные панорамные окна, **2 спальни** и кухня-гостиная.',
    category: 'ready',
  },
  {
    id: 'sobol',
    name: 'Проект «Соболь»',
    area: 60,
    floors: '1 этаж',
    rooms: 3,
    bedrooms: 2,
    priceFrom: 4950000,
    priceLabel: 'от 4 950 000 ₽',
    technology: 'timber',
    imagePath: assets('sobol.jpg'),
    description:
      'Классический дом **60 м²** из бруса вакуумной сушки. Кухня-гостиная, **2 спальни**, ' +
      'потолки **3 м**, узел «Сила», 6-камерное остекление и дверь с терморазрывом.',
    category: 'ready',
  },
  {
    id: 'arshan',
    name: 'Проект «Аршан»',
    area: 69,
    floors: '2 этажа',
    rooms: 4,
    bedrooms: 2,
    priceFrom: 3990000,
    priceLabel: 'от 3 990 000 ₽',
    technology: 'timber',
    imagePath: assets('arshan.jpg'),
    description:
      'Авторский дом **69 м²** в формате 6×6: брус 1-го этажа, каркас 2-го, кухня-гостиная **3 м**, ' +
      '2 спальни, кабинет и чердак. ЖБ-плита, лестница в комплекте.',
    options: [
      { name: 'Тёплый контур 2-го этажа', price: 151000 },
    ],
    category: 'ready',
  },
  {
    id: 'mamay',
    name: 'Проект «Мамай»',
    area: 76,
    floors: '2 этажа',
    rooms: 4,
    bedrooms: 2,
    priceFrom: 5400000,
    priceLabel: 'от 5 400 000 ₽',
    technology: 'timber',
    imagePath: assets('mamay.jpg'),
    description:
      'Современный дом **76 м²**: брус вакуумной сушки, кухня-гостиная **3 м** с выходом на террасу, ' +
      'мансарда **24 м²**, панорамные окна «графит», 6-камерное остекление.',
    options: [
      { name: 'Тёплый контур 2-го этажа', price: 420000 },
    ],
    category: 'ready',
  },
  {
    id: 'oymur',
    name: 'Проект «Оймур»',
    area: 89,
    floors: '2 этажа',
    rooms: 4,
    bedrooms: 3,
    priceFrom: 5850000,
    priceLabel: 'от 5 850 000 ₽',
    technology: 'timber',
    imagePath: assets('oymur.jpg'),
    description:
      'Дом **89 м²** в классическом стиле: брус 1-го этажа, мансарда из сухой доски, ' +
      'кухня-гостиная, потолки **3 м**, панорамное остекление «графит».',
    options: [
      { name: 'Тёплый контур 2-го этажа', price: 315000 },
    ],
    category: 'ready',
  },
  {
    id: 'sarma',
    name: 'Проект «Сарма»',
    area: 92,
    floors: '2 этажа',
    rooms: 6,
    bedrooms: 5,
    priceFrom: 5050000,
    priceLabel: 'от 5 050 000 ₽',
    technology: 'timber',
    imagePath: assets('sarma.jpg'),
    description:
      'Двухэтажный дом **92 м²** формата 6×8: брус вакуумной сушки, **5 спален**, кухня-гостиная, ' +
      'потолки **3 м**, остекление «графит», чердак для хранения.',
    options: [
      { name: 'Тёплый контур 2-го этажа', price: 420000 },
    ],
    category: 'ready',
  },
  {
    id: 'kotokel',
    name: 'Проект «Котокель»',
    area: 96,
    floors: '2 этажа',
    rooms: 5,
    bedrooms: 3,
    priceFrom: 6200000,
    priceLabel: 'от 6 200 000 ₽',
    technology: 'timber',
    imagePath: assets('kotokel.jpg'),
    description:
      'Авторский дом **96 м²**: брус вакуумной сушки, кухня-гостиная **27 м²**, **3 спальни**, ' +
      'лофт-этаж **18 м²**, потолки 1-го этажа **3 м**, графитовое остекление.',
    options: [
      { name: 'Тёплый контур лофт-этажа', price: 210000 },
    ],
    category: 'ready',
  },
  {
    id: 'dulaan',
    name: 'Проект «Дулаан»',
    area: 104,
    floors: '2 этажа',
    rooms: 4,
    bedrooms: 3,
    priceFrom: 6480000,
    priceLabel: 'от 6 480 000 ₽',
    technology: 'timber',
    imagePath: assets('dulaan.jpg'),
    description:
      'Дом **104 м²** в стиле «новая классика»: брус 170 мм, кухня-гостиная **40 м²**, ' +
      '**3 спальни** на 2-м этаже, чердак, ЖБ-плита, лестница в комплекте.',
    options: [
      { name: 'Тёплый контур 2-го этажа', price: 300000 },
    ],
    category: 'ready',
  },
  {
    id: 'olkhon',
    name: 'Проект «Ольхон»',
    area: 111,
    floors: '1 этаж',
    rooms: 4,
    bedrooms: 3,
    priceFrom: 8000000,
    priceLabel: 'от 8 000 000 ₽',
    technology: 'timber',
    imagePath: assets('olkhon.jpg'),
    description:
      'Современный дом **111 м²** + терраса **20 м²**: кухня-гостиная **30 м²**, **3 спальни**, ' +
      'раздельные санузлы, брус вакуумной сушки, тёплый алюминий и 6-камерные окна.',
    category: 'ready',
  },
];

const CATALOG_CATEGORIES = {
  domokomplekt: { label: '📦 Домокомплекты', fn: (p) => p.category === 'domokomplekt' },
  ready: { label: '🏡 Готовые проекты', fn: (p) => p.category === 'ready' },
};

const AREA_FILTERS = {
  area_up_100: { label: '📐 до 100 м²', fn: (p) => p.area <= 100 },
  area_100_150: { label: '📐 100–150 м²', fn: (p) => p.area >= 100 && p.area <= 150 },
  area_from_150: { label: '📐 от 150 м²', fn: (p) => p.area >= 150 },
};

const PRICE_FILTERS = {
  price_up_1m: { label: '💵 до 1 млн ₽', fn: (p) => p.priceFrom <= 1_000_000 },
  price_from_1m: {
    label: '💵 от 1 млн ₽',
    fn: (p) => p.priceFrom >= 1_000_000 && p.priceFrom < 5_000_000,
  },
  price_from_5m: { label: '💵 от 5 млн ₽', fn: (p) => p.priceFrom >= 5_000_000 },
};

module.exports = projects;
module.exports.AREA_FILTERS = AREA_FILTERS;
module.exports.PRICE_FILTERS = PRICE_FILTERS;
module.exports.CATALOG_CATEGORIES = CATALOG_CATEGORIES;
module.exports.getProjectSiteUrl = getProjectSiteUrl;
