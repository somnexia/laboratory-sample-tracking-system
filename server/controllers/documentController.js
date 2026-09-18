'use strict';

/**
 * HTTP документов (фаза 6, упрощённая).
 *
 * POST: authRequired → образец существует → multer → сервис.
 * GET список — открытый. DELETE /documents/:id — JWT + user_id файла (не created_by образца).
 */

const documentService = require('../services/documentService');
const sampleService = require('../services/sampleService');
const { ownerOnly } = require('../middleware/auth');

function handleError(error, res, next) {
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }
  return next(error);
}

async function requireSample(req, res, next) {
  try {
    await sampleService.findByIdOrThrow(req.params.id);
    return next();
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function create(req, res, next) {
  try {
    const doc = await documentService.create(
      req.user.id,
      Number(req.params.id),
      req.file
    );
    return res.status(201).json(doc);
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function list(req, res, next) {
  try {
    const docs = await documentService.listBySample(req.params.id);
    return res.status(200).json(docs);
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function remove(req, res, next) {
  try {
    const doc = await documentService.findByIdOrThrow(req.params.id);
    if (ownerOnly(req, doc.user_id, res)) {
      return undefined;
    }
    await documentService.remove(req.user.id, doc);
    return res.status(204).end();
  } catch (error) {
    return handleError(error, res, next);
  }
}

module.exports = {
  requireSample,
  create,
  list,
  remove,
};
