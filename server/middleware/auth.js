'use strict';

/**
 * Безопасность запросов (фаза 3).
 *
 * Два разных отказа:
 *   401 — «кто ты?»  нет/битый JWT (authRequired)
 *   403 — «ты не владелец»  токен валидный, но запись чужая (ownerOnly)
 *
 * Цепочка для PUT/DELETE/PATCH status образца:
 *   authRequired → контроллер грузит sample → ownerOnly(req, sample.created_by, res)
 *
 * Для файла/оценки сравнивают user_id, не created_by образца.
 */

const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

/**
 * Проверяет Authorization: Bearer <jwt>.
 * Cookie не читаем — в ТЗ только заголовок Bearer.
 *
 * Успех: req.user = { id, username } из payload (пароля там нет).
 * Дальше контроллер может искать пользователя в БД по id.
 */
function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  try {
    const payload = jwt.verify(token, jwtConfig.secret);
    req.user = {
      id: payload.id,
      username: payload.username,
    };
    return next();
  } catch (error) {
    const message = error.name === 'TokenExpiredError'
      ? 'Token expired'
      : 'Invalid or expired token';
    return res.status(401).json({ error: message });
  }
}

/**
 * Сравнение id из токена с владельцем записи.
 * ownerId — samples.created_by, documents.user_id или ratings.user_id.
 */
function isOwner(userId, ownerId) {
  return Number(userId) === Number(ownerId);
}

/**
 * Если текущий пользователь не владелец — отвечает 403 и возвращает true
 * (контроллер должен сразу выйти). Иначе false — можно менять запись.
 *
 * Зачем отдельный хелпер, а не middleware: владельца узнаём только после
 * SELECT по :id. Middleware не видит sample, пока контроллер его не загрузил.
 *
 * @example
 *   if (ownerOnly(req, sample.created_by, res)) return;
 */
function ownerOnly(req, ownerId, res) {
  if (!req.user) {
    res.status(401).json({ error: 'Authorization required' });
    return true;
  }

  if (!isOwner(req.user.id, ownerId)) {
    res.status(403).json({ error: 'Forbidden: you can only modify your own records' });
    return true;
  }

  return false;
}

module.exports = {
  authRequired,
  isOwner,
  ownerOnly,
};
