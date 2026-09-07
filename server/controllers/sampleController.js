'use strict';

/**
 * HTTP для samples: создание (JWT) и чтение (открытое).
 * PUT/DELETE с ownerOnly — вторая половина фазы 4.
 */

const sampleService = require('../services/sampleService');

function handleError(error, res, next) {
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }
  return next(error);
}

async function create(req, res, next) {
  try {
    const sample = await sampleService.create(req.user.id, req.body || {});
    return res.status(201).json(sample);
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function list(req, res, next) {
  try {
    const samples = await sampleService.list();
    return res.status(200).json(samples);
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getById(req, res, next) {
  try {
    const sample = await sampleService.getById(req.params.id);
    return res.status(200).json(sample);
  } catch (error) {
    return handleError(error, res, next);
  }
}

module.exports = {
  create,
  list,
  getById,
};
