'use strict';

/**
 * Жизненный цикл образца (фаза 1.5, используется в фазе 5.1–5.4).
 *
 * Одна линия, без веток IN_TRANSIT и QUALITY_FAILED.
 * POST /samples всегда ставит DEFAULT_STATUS (RECEIVED).
 * PUT /samples/:id статус не читает — иначе можно было бы перепрыгнуть карту.
 * Смена только PATCH /samples/:id/status: canTransition() == false → 400
 * «Invalid status transition». DESTROYED — тупик, массив TO пустой.
 */

/** Допустимые значения колонки samples.status (MySQL ENUM). */
const SAMPLE_STATUSES = [
  'RECEIVED',
  'REGISTERED',
  'STORED',
  'IN_ANALYSIS',
  'ANALYZED',
  'ARCHIVED',
  'DESTROYED',
];

/** Статус новой записи. Клиент не выбирает его при POST. */
const DEFAULT_STATUS = 'RECEIVED';

/**
 * Карта: из какого статуса в какие можно шагнуть.
 * Ключ — текущее значение, значение — список разрешённых следующих.
 */
const ALLOWED_TRANSITIONS = {
  RECEIVED: ['REGISTERED'],
  REGISTERED: ['STORED'],
  STORED: ['IN_ANALYSIS'],
  IN_ANALYSIS: ['ANALYZED'],
  ANALYZED: ['ARCHIVED'],
  ARCHIVED: ['DESTROYED'],
  DESTROYED: [],
};

/**
 * @param {string} from текущий status
 * @param {string} to   запрошенный status
 * @returns {boolean} true, только если переход есть в ALLOWED_TRANSITIONS
 */
function canTransition(from, to) {
  const allowed = ALLOWED_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

module.exports = {
  SAMPLE_STATUSES,
  DEFAULT_STATUS,
  ALLOWED_TRANSITIONS,
  canTransition,
};
