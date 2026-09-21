'use strict';

/**
 * HTTP-слой samples (контроллер).
 *
 * Из чего состоит:
 *   - читает req (params, body, query, user от middleware);
 *   - вызывает sampleService;
 *   - ставит статус 200/201/204 и JSON;
 *   - ошибки с error.status → { error: "..." }, остальное → next(errorHandler).
 *
 * Здесь нет SQL и нет правил «можно ли перейти в STORED» — это сервис.
 * JWT проверяет middleware/auth до входа в create/update/remove/changeStatus.
 *
 * list: req.query → { country?, type?, status?, sort? } целиком уходит в service.list.
 */

const sampleService = require('../services/sampleService');
const { ownerOnly } = require('../middleware/auth');

/**
 * Разбор ошибок сервиса.
 * AppError несёт .status (400, 403, 404…).
 * Без .status — неожиданная ошибка, errorHandler отдаст 500.
 */
function handleError(error, res, next) {
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }
  return next(error);
}

/**
 * Загрузить образец и проверить владельца (PUT / DELETE / PATCH status).
 *
 * 1) findByIdOrThrow → 404, если id нет;
 * 2) ownerOnly(req, sample.created_by, res) → true = уже ответили 401/403.
 *
 * Почему не middleware: владельца узнаём только после SELECT по :id.
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

/**
 * Открытый список. Токен не нужен.
 * Фильтр и сортировка — целиком в sampleService.list(req.query).
 */
async function list(req, res, next) {
  try {
    const samples = await sampleService.list(req.query);
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
    // 204 — успех без тела; клиент ждёт пустой ответ.
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

/** Открытая лента событий. Без authRequired — как просмотр карточки. */
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
