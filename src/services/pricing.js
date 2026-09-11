const {
  TECHNOLOGIES,
  AREAS,
  COMPLETION,
} = require('../data/constants');

function calculatePriceRange(technologyKey, areaKey, completionKey) {
  const tech = TECHNOLOGIES[technologyKey];
  const area = AREAS[areaKey];
  const completion = COMPLETION[completionKey];

  if (!tech || !area || !completion) {
    return null;
  }

  const base = tech.pricePerSqm * area.mid * completion.factor;
  const min = Math.round(base * 0.95);
  const max = Math.round(base * 1.15);

  return { min, max, midSqm: area.mid };
}

function formatPrice(value) {
  return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
}

module.exports = {
  calculatePriceRange,
  formatPrice,
};
