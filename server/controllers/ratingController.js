'use strict';

/**
 * HTTP оценок (фаза 7, первая половина).
 *
 * POST /samples/:id/ratings — JWT, образец должен существовать.
 * GET  /samples/:id/rating  — открытое среднее (без «s»: это не список).
 * PUT/DELETE /ratings/:id — вторая половина.
 */

const ratingService = require('../services/ratingService');

function handleError(error, res, next) {
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }
  return next(error);
}

async function create(req, res, next) {
  try {
    const rating = await ratingService.create(
      req.user.id,
      req.params.id,
      req.body || {}
    );
    return res.status(201).json(rating);
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getAverage(req, res, next) {
  try {
    const summary = await ratingService.getAverage(req.params.id);
    return res.status(200).json(summary);
  } catch (error) {
    return handleError(error, res, next);
  }
}

module.exports = {
  create,
  getAverage,
};
