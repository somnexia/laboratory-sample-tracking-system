'use strict';

/**
 * HTTP оценок (фаза 7).
 *
 * POST /samples/:id/ratings и GET /samples/:id/rating — в роутере samples.
 * PUT/DELETE /ratings/:id — JWT + ownerOnly по user_id оценки.
 */

const ratingService = require('../services/ratingService');
const { ownerOnly } = require('../middleware/auth');

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

async function update(req, res, next) {
  try {
    const rating = await ratingService.findByIdOrThrow(req.params.id);
    if (ownerOnly(req, rating.user_id, res)) {
      return undefined;
    }
    const updated = await ratingService.update(req.user.id, rating, req.body || {});
    return res.status(200).json(updated);
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function remove(req, res, next) {
  try {
    const rating = await ratingService.findByIdOrThrow(req.params.id);
    if (ownerOnly(req, rating.user_id, res)) {
      return undefined;
    }
    await ratingService.remove(req.user.id, rating);
    return res.status(204).end();
  } catch (error) {
    return handleError(error, res, next);
  }
}

module.exports = {
  create,
  getAverage,
  update,
  remove,
};
