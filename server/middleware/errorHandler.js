'use strict';

/**
 * Ошибки API всегда JSON, не HTML (Jade отключён в фазе 0).
 * Формат: { "error": "..." } — как в docs/api-contract.md.
 *
 * Multer кидает MulterError без поля status (лимит размера, чужое имя поля).
 * fileFilter у нас отдаёт AppError(400) — его ловит ветка error.status.
 */

const multer = require('multer');

function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
  });
}

function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File is too large (max 5 MB)'
      : err.message;
    return res.status(400).json({ error: message });
  }

  const status = err.status || err.statusCode || 500;
  const payload = {
    error: err.message || 'Internal Server Error',
  };

  if (req.app.get('env') === 'development' && status >= 500) {
    payload.stack = err.stack;
  }

  return res.status(status).json(payload);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
