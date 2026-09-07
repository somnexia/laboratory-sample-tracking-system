'use strict';

/**
 * JWT middleware (фаза 3.3).
 *
 * Ожидает заголовок: Authorization: Bearer <token>
 * При успехе пишет req.user = { id, username }.
 * Cookie не используются — в учебном ТЗ только Bearer.
 */

const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

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

module.exports = {
  authRequired,
};
