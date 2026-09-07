'use strict';

/**
 * Бизнес-логика регистрации и входа (фаза 3).
 *
 * Контроллер только принимает HTTP и отдаёт JSON.
 * Здесь: валидация, поиск пользователя, bcrypt, выпуск JWT.
 *
 * Пароль в ответах не возвращаем — только publicUser() без поля password.
 * Хеш пишет модель User (хуки beforeCreate / beforeUpdate), не этот файл.
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const jwtConfig = require('../config/jwt');

const MIN_PASSWORD_LENGTH = 8;
const MIN_USERNAME_LENGTH = 3;

/** Ошибка с HTTP-статусом, чтобы контроллер не гадал 400 vs 401. */
class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Публичный профиль: те же поля, что в ТЗ, без password. */
function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    created_at: user.created_at,
  };
}

/**
 * Подпись JWT. В payload только id и username:
 * этого хватает, чтобы узнать «кто вошёл», пароль и хеш в токен не кладём.
 * Срок жизни — JWT_EXPIRES_IN (например 1h).
 */
function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function register({ username, email, password }) {
  const name = String(username || '').trim();
  const mail = normalizeEmail(email);
  const pass = String(password || '');

  if (!name || !mail || !pass) {
    throw new AuthError(400, 'username, email and password are required');
  }
  if (name.length < MIN_USERNAME_LENGTH || name.length > 50) {
    throw new AuthError(400, 'username must be 3–50 characters');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    throw new AuthError(400, 'email is invalid');
  }
  if (pass.length < MIN_PASSWORD_LENGTH) {
    throw new AuthError(400, 'password must be at least 8 characters');
  }

  const existing = await User.findOne({ where: { email: mail } });
  if (existing) {
    throw new AuthError(400, 'email is already registered');
  }

  try {
    const user = await User.create({
      username: name,
      email: mail,
      password: pass,
    });
    return publicUser(user);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AuthError(400, 'email is already registered');
    }
    if (error.name === 'SequelizeValidationError') {
      throw new AuthError(400, error.errors[0] ? error.errors[0].message : 'Invalid data');
    }
    throw error;
  }
}

/**
 * Одинаковое сообщение при «нет пользователя» и «неверный пароль»:
 * иначе по ответу можно понять, зарегистрирован ли email.
 */
async function login({ email, password }) {
  const mail = normalizeEmail(email);
  const pass = String(password || '');

  if (!mail || !pass) {
    throw new AuthError(400, 'email and password are required');
  }

  const user = await User.findOne({ where: { email: mail } });
  if (!user) {
    throw new AuthError(401, 'Invalid email or password');
  }

  const matches = await bcrypt.compare(pass, user.password);
  if (!matches) {
    throw new AuthError(401, 'Invalid email or password');
  }

  return {
    token: signToken(user),
    user: publicUser(user),
  };
}

/** Для GET /auth/me: свежие поля из БД, не только то, что зашито в JWT. */
async function getById(id) {
  const user = await User.findByPk(id);
  if (!user) {
    return null;
  }
  return publicUser(user);
}

module.exports = {
  AuthError,
  publicUser,
  signToken,
  register,
  login,
  getById,
  MIN_PASSWORD_LENGTH,
};
