'use strict';

/**
 * HTTP для samples: CRUD (фаза 4), статус и history (фаза 5).
 *
 * GET карточки и GET /history — без токена (как просмотр landmark в ТЗ).
 * POST/PUT/DELETE/PATCH status — JWT; чужую запись режет ownerOnly → 403.
 * Менять и удалять строки sample_events этим контроллером нельзя.
 */

const sampleService = require('../services/sampleService');
const { ownerOnly } = require('../middleware/auth');

function handleError(error, res, next) {
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }
  return next(error);
}

/**
 * Загрузить образец и проверить владельца.
 * 404 — нет id; 403 — токен есть, но created_by другой.
 * null значит ответ уже отправлен (403/401).
 */
async function loadOwnedSample(req, res) {
  const sample = await sampleService.findByIdOrThrow(req.params.id);
  if (ownerOnly(req, sample.created_by, res)) {
    return null;
  }
  return sample;
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

async function update(req, res, next) {
  try {
    const sample = await loadOwnedSample(req, res);
    if (!sample) {
      return undefined;
    }
    const updated = await sampleService.update(req.user.id, sample, req.body || {});
    return res.status(200).json(updated);
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function remove(req, res, next) {
  try {
    const sample = await loadOwnedSample(req, res);
    if (!sample) {
      return undefined;
    }
    await sampleService.remove(sample);
    // 204 — успех без тела; json() сюда нельзя, клиент ждёт пустой ответ.
    return res.status(204).end();
  } catch (error) {
    return handleError(error, res, next);
  }
}

/** Смена status по карте. Тело: { "status": "REGISTERED" }. */
async function changeStatus(req, res, next) {
  try {
    const sample = await loadOwnedSample(req, res);
    if (!sample) {
      return undefined;
    }
    const updated = await sampleService.changeStatus(req.user.id, sample, req.body || {});
    return res.status(200).json(updated);
  } catch (error) {
    return handleError(error, res, next);
  }
}

/** Открытая лента. Нет authRequired: историю смотрят так же, как карточку. */
async function getHistory(req, res, next) {
  try {
    const events = await sampleService.getHistory(req.params.id);
    return res.status(200).json(events);
  } catch (error) {
    return handleError(error, res, next);
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  changeStatus,
  getHistory,
};
