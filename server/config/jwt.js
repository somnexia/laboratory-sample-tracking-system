'use strict';

/**
 * Параметры JWT (фаза 3 будет подписывать и проверять токены).
 *
 * secret     — ключ HMAC из .env, не коммитить.
 * expiresIn  — срок жизни токена, например '1h'.
 *
 * В payload позже: { id, username }. Пароль в токен не кладётся.
 */

module.exports = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
};
