'use strict';

/**
 * Учебный жизненный цикл образца: одна линия.
 * DESTROYED — терминальный статус, переходов из него нет.
 */
const SAMPLE_STATUSES = [
  'RECEIVED',
  'REGISTERED',
  'STORED',
  'IN_ANALYSIS',
  'ANALYZED',
  'ARCHIVED',
  'DESTROYED',
];

const DEFAULT_STATUS = 'RECEIVED';

const ALLOWED_TRANSITIONS = {
  RECEIVED: ['REGISTERED'],
  REGISTERED: ['STORED'],
  STORED: ['IN_ANALYSIS'],
  IN_ANALYSIS: ['ANALYZED'],
  ANALYZED: ['ARCHIVED'],
  ARCHIVED: ['DESTROYED'],
  DESTROYED: [],
};

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
