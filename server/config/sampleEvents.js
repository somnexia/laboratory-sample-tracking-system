'use strict';

/**
 * Значения sample_events.action (фаза 1.5).
 *
 * Строка события пишется только INSERT-ом из контроллера, который уже
 * изменил sample / document / rating. Маршрутов PUT/PATCH/DELETE /events нет.
 *
 * SAMPLE_CREATED     — POST /samples
 * SAMPLE_UPDATED     — PUT /samples/:id, location не менялся
 * LOCATION_CHANGED   — PUT /samples/:id, изменилось location
 * STATUS_CHANGED     — PATCH /samples/:id/status (фаза 5, первая половина)
 * DOCUMENT_UPLOADED  — POST .../documents
 * DOCUMENT_DELETED   — DELETE /documents/:id
 * RATING_ADDED       — POST .../ratings
 * RATING_UPDATED     — PUT /ratings/:id
 * RATING_DELETED     — DELETE /ratings/:id
 */

const EVENT_ACTIONS = [
  'SAMPLE_CREATED',
  'SAMPLE_UPDATED',
  'STATUS_CHANGED',
  'LOCATION_CHANGED',
  'DOCUMENT_UPLOADED',
  'DOCUMENT_DELETED',
  'RATING_ADDED',
  'RATING_UPDATED',
  'RATING_DELETED',
];

/**
 * @param {string} action
 * @returns {boolean}
 */
function isValidEventAction(action) {
  return EVENT_ACTIONS.includes(action);
}

module.exports = {
  EVENT_ACTIONS,
  isValidEventAction,
};
