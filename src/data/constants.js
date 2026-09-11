const TECHNOLOGIES = {
  sip: { label: '🧱 СИП-панели', pricePerSqm: 35000 },
  frame: { label: '🪵 Каркас', pricePerSqm: 40000 },
  timber: { label: '🌲 Брус', pricePerSqm: 45000 },
  aerated: { label: '🧊 Газобетон', pricePerSqm: 55000 },
  lstk: { label: '🔩 ЛСТК', pricePerSqm: 42000 },
  unknown: { label: '🤔 Не знаю, нужна консультация', pricePerSqm: 40000 },
};

const AREAS = {
  up_to_80: { label: '📐 до 80 м²', mid: 70 },
  '80_100': { label: '📐 80–100 м²', mid: 90 },
  '100_150': { label: '📐 100–150 м²', mid: 125 },
  '150_200': { label: '📐 150–200 м²', mid: 175 },
  over_200: { label: '📐 более 200 м²', mid: 220 },
};

const FLOORS = {
  one: { label: '1 этаж' },
  two: { label: '2 этажа' },
};

const BEDROOMS = {
  '1_2': { label: '🛏 1–2' },
  '3': { label: '🛏 3' },
  '4': { label: '🛏 4' },
  '5_plus': { label: '🛏 5+' },
};

const COMPLETION = {
  rough: { label: '🔨 Черновая', factor: 1 },
  prefinish: { label: '🎨 Под чистовую', factor: 1.35 },
  turnkey: { label: '🔑 Под ключ', factor: 1.75 },
};

const BUDGETS = {
  up_to_3m: { label: '💵 до 3 млн ₽' },
  '3_5m': { label: '💵 3–5 млн ₽' },
  '5_8m': { label: '💵 5–8 млн ₽' },
  '8_12m': { label: '💵 8–12 млн ₽' },
  over_12m: { label: '💵 более 12 млн ₽' },
};

const PLOT = {
  has_plot: { label: '✅ Уже есть' },
  searching: { label: '🔍 Подбираю' },
  need_help: { label: '📍 Нужна помощь с оценкой участка' },
};

const QUIZ_STEPS = [
  {
    key: 'technology',
    question: 'Выберите технологию строительства:',
    options: Object.entries(TECHNOLOGIES).map(([id, v]) => ({ id, label: v.label })),
    prefix: 'quiz:tech',
  },
  {
    key: 'area',
    question: 'Какая площадь дома вам нужна?',
    options: Object.entries(AREAS).map(([id, v]) => ({ id, label: v.label })),
    prefix: 'quiz:area',
  },
  {
    key: 'floors',
    question: 'Сколько этажей планируете?',
    options: Object.entries(FLOORS).map(([id, v]) => ({ id, label: v.label })),
    prefix: 'quiz:floors',
  },
  {
    key: 'bedrooms',
    question: 'Сколько спален нужно?',
    options: Object.entries(BEDROOMS).map(([id, v]) => ({ id, label: v.label })),
    prefix: 'quiz:bedrooms',
  },
  {
    key: 'completion',
    question: 'Какая комплектация вас интересует?',
    options: Object.entries(COMPLETION).map(([id, v]) => ({ id, label: v.label })),
    prefix: 'quiz:completion',
  },
  {
    key: 'budget',
    question: 'Какой у вас ориентировочный бюджет?',
    options: Object.entries(BUDGETS).map(([id, v]) => ({ id, label: v.label })),
    prefix: 'quiz:budget',
  },
  {
    key: 'plot',
    question: 'Есть ли у вас участок?',
    options: Object.entries(PLOT).map(([id, v]) => ({ id, label: v.label })),
    prefix: 'quiz:plot',
  },
];

module.exports = {
  TECHNOLOGIES,
  AREAS,
  FLOORS,
  BEDROOMS,
  COMPLETION,
  BUDGETS,
  PLOT,
  QUIZ_STEPS,
};
