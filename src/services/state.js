const { calculatePriceRange, formatPrice } = require('./pricing');

const userStates = new Map();

function getState(userId) {
  if (!userStates.has(userId)) {
    userStates.set(userId, {
      flow: null,
      step: 0,
      data: {},
    });
  }
  return userStates.get(userId);
}

function resetState(userId) {
  userStates.set(userId, { flow: null, step: 0, data: {} });
}

function setFlow(userId, flow, data = {}) {
  const state = getState(userId);
  state.flow = flow;
  state.step = 0;
  state.data = { ...data };
  return state;
}

function nextStep(userId, patch = {}) {
  const state = getState(userId);
  state.step += 1;
  state.data = { ...state.data, ...patch };
  return state;
}

function setStep(userId, step, patch = {}) {
  const state = getState(userId);
  state.step = step;
  state.data = { ...state.data, ...patch };
  return state;
}

function getLabel(map, key) {
  return map[key]?.label || key || '';
}

function buildLeadFromState(userId, state, leadType, extra = {}) {
  const d = state.data;
  const priceRange = d.technology && d.area && d.completion
    ? calculatePriceRange(d.technology, d.area, d.completion)
    : null;

  let comment = extra.comment || '';
  if (priceRange) {
    comment += (comment ? ' | ' : '') +
      `Расчёт: от ${formatPrice(priceRange.min)} до ${formatPrice(priceRange.max)}`;
  }
  if (d.projectId) {
    comment += (comment ? ' | ' : '') + `Проект: ${d.projectId}`;
  }
  if (d.excursionFormat) {
    comment += (comment ? ' | ' : '') + `Экскурсия: ${d.excursionFormat}`;
  }
  if (d.excursionDay) {
    comment += (comment ? ' | ' : '') + `День: ${d.excursionDay}`;
  }
  if (d.excursionTime) {
    comment += (comment ? ' | ' : '') + `Время: ${d.excursionTime}`;
  }
  if (d.utilities) {
    comment += (comment ? ' | ' : '') + `Коммуникации: ${d.utilities}`;
  }
  if (d.slope) {
    comment += (comment ? ' | ' : '') + `Уклон: ${d.slope}`;
  }
  if (d.soil) {
    comment += (comment ? ' | ' : '') + `Грунт: ${d.soil}`;
  }
  if (d.region) {
    comment += (comment ? ' | ' : '') + `Регион: ${d.region}`;
  }
  if (d.distance) {
    comment += (comment ? ' | ' : '') + `Расстояние: ${d.distance}`;
  }

  return {
    datetime: new Date().toISOString(),
    user_id: userId,
    name: d.name || extra.name || '',
    phone: d.phone || extra.phone || '',
    email: d.email || extra.email || '',
    technology: d.technologyLabel || d.technology || '',
    area: d.areaLabel || d.area || '',
    floors: d.floorsLabel || d.floors || '',
    bedrooms: d.bedroomsLabel || d.bedrooms || '',
    completion: d.completionLabel || d.completion || '',
    budget: d.budgetLabel || d.budget || '',
    plot: d.plotLabel || d.plot || '',
    source: 'MAX bot',
    lead_type: leadType,
    comment: comment.trim(),
  };
}

module.exports = {
  getState,
  resetState,
  setFlow,
  nextStep,
  setStep,
  getLabel,
  buildLeadFromState,
};
