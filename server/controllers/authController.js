'use strict';

/**
 * HTTP-слой auth: статус-коды и JSON.
 * Правила «как регистрировать / логинить» живут в services/authService.js.
 *
 * GET /me идёт после authRequired: сюда попадаем только с req.user.
 */

const authService = require('../services/authService');

function handleAuthError(error, res, next) {
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }
  return next(error);
}

async function register(req, res, next) {
  try {
    const user = await authService.register(req.body || {});
    return res.status(201).json(user);
  } catch (error) {
    return handleAuthError(error, res, next);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    return handleAuthError(error, res, next);
  }
}

/** Текущий пользователь по id из JWT. Если строку в users уже удалили — 401. */
async function me(req, res, next) {
  try {
    const user = await authService.getById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }
    return res.status(200).json(user);
  } catch (error) {
    return handleAuthError(error, res, next);
  }
}

module.exports = {
  register,
  login,
  me,
};
