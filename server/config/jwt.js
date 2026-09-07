'use strict';

/**
 * Секрет и срок JWT. Значения только из .env, файл в git не попадает.
 *
 * secret    — ключ HMAC; без него любой мог бы подделать токен.
 * expiresIn — после истечения authRequired ответит 401 Token expired.
 *
 * Payload токена: { id, username }. Пароль туда не пишем.
 */

module.exports = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
};
