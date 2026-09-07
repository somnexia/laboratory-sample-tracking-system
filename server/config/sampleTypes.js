'use strict';

/**
 * Типы лабораторного образца (фаза 1.4 / колонка samples.type).
 *
 * Отдельной таблицы типов нет — это ENUM в MySQL.
 * Неизвестная строка при POST/PUT → 400 (проверка в контроллере, фаза 4).
 */

const SAMPLE_TYPES = [
  'BIOLOGICAL',
  'CHEMICAL',
  'ENVIRONMENTAL',
  'FOOD',
  'WATER',
  'SOIL',
  'TISSUE',
  'DNA',
  'RNA',
  'CELL',
  'OTHER',
];

/**
 * @param {string} type значение из тела запроса
 * @returns {boolean}
 */
function isValidType(type) {
  return SAMPLE_TYPES.includes(type);
}

module.exports = {
  SAMPLE_TYPES,
  isValidType,
};
