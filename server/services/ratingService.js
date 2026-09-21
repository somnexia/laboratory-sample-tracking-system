'use strict';

/**
 * Оценки качества образца (таблица sample_ratings), баллы 1–5.
 *
 * create / getAverage — поставить оценку и прочитать среднее.
 * update / remove — только user_id этой строки, не created_by образца.
 * UNIQUE (sample_id, user_id): один пользователь — одна оценка; после DELETE можно POST снова.
 *
 * Среднее не хранится в samples: его считает ratingStats (AVG) — то же число,
 * по которому сортирует GET /samples?sort=rating.
 */

const { SampleRating, SampleEvent, sequelize } = require('../models');
const sampleService = require('./sampleService');
const { AppError } = require('./appError');

function hasOwn(body, key) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

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

function parseComment(value) {
  if (value == null || value === '') {
    return null;
  }
  return String(value);
}

async function create(userId, sampleId, body) {
  const sample = await sampleService.findByIdOrThrow(sampleId);
  const payload = body || {};
  const score = parseScore(payload.score);
  const comment = parseComment(payload.comment);

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

async function findByIdOrThrow(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) {
    throw new AppError(404, 'Rating not found');
  }

  const row = await SampleRating.findByPk(numericId);
  if (!row) {
    throw new AppError(404, 'Rating not found');
  }

  return row;
}

/**
 * Меняем score и/или comment. sample_id и user_id из body не читаем:
 * нельзя «перевесить» чужую оценку на себя или на другой образец.
 */
async function update(userId, rating, body) {
  const payload = body || {};
  const previousScore = String(rating.score);

  if (hasOwn(payload, 'score')) {
    rating.score = parseScore(payload.score);
  }
  if (hasOwn(payload, 'comment')) {
    rating.comment = parseComment(payload.comment);
  }

  await sequelize.transaction(async (transaction) => {
    await rating.save({ transaction });
    await SampleEvent.create({
      sample_id: rating.sample_id,
      user_id: userId,
      action: 'RATING_UPDATED',
      old_value: previousScore,
      new_value: String(rating.score),
    }, { transaction });
  });

  return publicRating(rating);
}

async function remove(userId, rating) {
  const previousScore = String(rating.score);
  const sampleId = rating.sample_id;

  await sequelize.transaction(async (transaction) => {
    await SampleEvent.create({
      sample_id: sampleId,
      user_id: userId,
      action: 'RATING_DELETED',
      old_value: previousScore,
      new_value: null,
    }, { transaction });
    await rating.destroy({ transaction });
  });
}

module.exports = {
  create,
  getAverage,
  findByIdOrThrow,
  update,
  remove,
  publicRating,
};
