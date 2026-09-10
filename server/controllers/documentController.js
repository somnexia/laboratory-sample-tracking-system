'use strict';

/**
 * HTTP документов образца (фаза 6, POST + GET).
 *
 * POST: authRequired → образец существует → multer → сервис.
 * Проверка sample до multer: иначе 404 на несуществующий id оставил бы файл в uploads/.
 * GET список — открытый, как GET /samples/:id.
 */

const documentService = require('../services/documentService');
const sampleService = require('../services/sampleService');

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

module.exports = {
  requireSample,
  create,
  list,
};
