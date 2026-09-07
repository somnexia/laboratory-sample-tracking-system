'use strict';

function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
  });
}

function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const payload = {
    error: err.message || 'Internal Server Error',
  };

  if (req.app.get('env') === 'development' && status >= 500) {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
