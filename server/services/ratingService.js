'use strict';

/**
 * Оценки образца 1–5 (фаза 7, первая половина: поставить и прочитать среднее).
 *
 * Один пользователь — одна строка на образец (UNIQUE sample_id + user_id).
 * Повторный POST → 400, не вторая звезда. Иначе среднее считалось бы дважды.
 *
 * PUT/DELETE своей оценки — вторая половина фазы 7.
 */

const { SampleRating, SampleEvent, sequelize } = require('../models');
const sampleService = require('./sampleService');
const { AppError } = require('./appError');

function publicRating(row) {
  return {
    id: row.id,
    sample_id: row.sample_id,
    user_id: row.user_id,
    score: row.score,
    comment: row.comment,
    created_at: row.created_at,
  };
}

function parseScore(value) {
  const score = Number(value);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new AppError(400, 'score must be an integer from 1 to 5');
  }
  return score;
}

async function create(userId, sampleId, body) {
  const sample = await sampleService.findByIdOrThrow(sampleId);
  const payload = body || {};
  const score = parseScore(payload.score);
  const comment = payload.comment == null || payload.comment === ''
    ? null
    : String(payload.comment);

  const existing = await SampleRating.findOne({
    where: { sample_id: sample.id, user_id: userId },
  });
  if (existing) {
    throw new AppError(400, 'You have already rated this sample');
  }

  try {
    const created = await sequelize.transaction(async (transaction) => {
      const row = await SampleRating.create({
        sample_id: sample.id,
        user_id: userId,
        score,
        comment,
      }, { transaction });

      await SampleEvent.create({
        sample_id: sample.id,
        user_id: userId,
        action: 'RATING_ADDED',
        old_value: null,
        new_value: String(score),
      }, { transaction });

      return row;
    });

    return publicRating(created);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError(400, 'You have already rated this sample');
    }
    throw error;
  }
}

/**
 * Среднее по SQL AVG, не «поле в samples».
 * Нет оценок → null и 0, статус всё равно 200: пустое ≠ «образец не найден».
 */
async function getAverage(sampleId) {
  const sample = await sampleService.findByIdOrThrow(sampleId);
  const stats = await sampleService.ratingStats(sample.id);
  return {
    sample_id: sample.id,
    average_rating: stats.average_rating,
    ratings_count: stats.ratings_count,
  };
}

module.exports = {
  create,
  getAverage,
  publicRating,
};
