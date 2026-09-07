'use strict';

/**
 * Ошибка с HTTP-статусом. Контроллеры смотрят error.status
 * и отдают { error: message }, без 500 на ожидаемых 400/404.
 */
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = { AppError };
