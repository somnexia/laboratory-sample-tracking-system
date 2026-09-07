'use strict';

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

module.exports = {
  register,
  login,
};
