'use strict';

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

function isValidType(type) {
  return SAMPLE_TYPES.includes(type);
}

module.exports = {
  SAMPLE_TYPES,
  isValidType,
};
