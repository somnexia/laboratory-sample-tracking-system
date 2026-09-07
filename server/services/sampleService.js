'use strict';

/**
 * Создание и чтение образцов (первая половина фазы 4).
 *
 * Здесь: POST (JWT) + GET список + GET по id (открытые).
 * PUT / DELETE / PATCH status / фильтры — вторая половина фазы 4 и фазы 5–8.
 *
 * sample_code выдаёт сервер (SAM-YYYY-NNNNNN), status всегда RECEIVED.
 * Вместе с образцом пишется SAMPLE_CREATED в sample_events (одна транзакция).
 */

const { Op } = require('sequelize');
const { Sample, SampleEvent, SampleRating, sequelize } = require('../models');
const { isValidType } = require('../config/sampleTypes');
const { DEFAULT_STATUS } = require('../config/sampleStatuses');
const { AppError } = require('./appError');

function optionalInt(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new AppError(400, `${fieldName} must be an integer or null`);
  }
  return n;
}

function publicSample(sample) {
  return {
    id: sample.id,
    sample_code: sample.sample_code,
    name: sample.name,
    type: sample.type,
    description: sample.description,
    status: sample.status,
    country: sample.country,
    location: sample.location,
    research_id: sample.research_id,
    experiment_id: sample.experiment_id,
    created_by: sample.created_by,
    created_at: sample.created_at,
    updated_at: sample.updated_at,
  };
}

async function ratingStats(sampleId) {
  const row = await SampleRating.findOne({
    where: { sample_id: sampleId },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('score')), 'average_rating'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'ratings_count'],
    ],
    raw: true,
  });

  const count = Number(row && row.ratings_count ? row.ratings_count : 0);
  const avg = row && row.average_rating != null ? Number(row.average_rating) : null;

  return {
    average_rating: count > 0 ? Number(avg.toFixed(2)) : null,
    ratings_count: count,
  };
}

async function toResponse(sample) {
  const stats = await ratingStats(sample.id);
  return { ...publicSample(sample), ...stats };
}

/**
 * Следующий код в текущем UTC-году.
 * Seed уже занял SAM-2026-000124…128 — новый POST получит 000129 и дальше.
 */
async function nextSampleCode(transaction) {
  const year = new Date().getUTCFullYear();
  const prefix = `SAM-${year}-`;
  const last = await Sample.findOne({
    where: { sample_code: { [Op.like]: `${prefix}%` } },
    order: [['sample_code', 'DESC']],
    transaction,
  });

  let next = 1;
  if (last) {
    next = Number(last.sample_code.slice(prefix.length)) + 1;
  }
  if (!Number.isFinite(next) || next < 1) {
    next = 1;
  }

  return prefix + String(next).padStart(6, '0');
}

async function create(userId, body) {
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  const country = String(body.country || '').trim();
  const description = body.description == null ? null : String(body.description);
  const location = body.location == null || body.location === ''
    ? null
    : String(body.location).trim();

  if (!name || !type || !country) {
    throw new AppError(400, 'name, type and country are required');
  }
  if (!isValidType(type)) {
    throw new AppError(400, 'type is invalid');
  }

  const research_id = optionalInt(body.research_id, 'research_id');
  const experiment_id = optionalInt(body.experiment_id, 'experiment_id');

  const sample = await sequelize.transaction(async (transaction) => {
    const sample_code = await nextSampleCode(transaction);
    const created = await Sample.create({
      sample_code,
      name,
      type,
      description,
      status: DEFAULT_STATUS,
      country,
      location,
      research_id,
      experiment_id,
      created_by: userId,
    }, { transaction });

    await SampleEvent.create({
      sample_id: created.id,
      user_id: userId,
      action: 'SAMPLE_CREATED',
      old_value: null,
      new_value: sample_code,
    }, { transaction });

    return created;
  });

  return toResponse(sample);
}

/** Список без query-фильтров (фаза 8). Пустой результат — [] и 200. */
async function list() {
  const rows = await Sample.findAll({
    order: [['created_at', 'DESC']],
  });
  const result = [];
  for (const row of rows) {
    result.push(await toResponse(row));
  }
  return result;
}

async function getById(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) {
    throw new AppError(404, 'Sample not found');
  }

  const sample = await Sample.findByPk(numericId);
  if (!sample) {
    throw new AppError(404, 'Sample not found');
  }

  return toResponse(sample);
}

module.exports = {
  create,
  list,
  getById,
  publicSample,
};
