'use strict';

/**
 * Подключение Swagger UI на /api-docs.
 *
 * swagger-ui-express раздаёт готовую HTML-страницу.
 * Спецификация — config/openapi.js (OpenAPI 3).
 * Маршрут вешаем до notFoundHandler, иначе UI получит 404 JSON.
 */

const swaggerUi = require('swagger-ui-express');
const openapi = require('../config/openapi');

function mountSwagger(app) {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openapi, {
      customSiteTitle: 'Sample Tracking API Docs',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
      },
    })
  );
}

module.exports = { mountSwagger };
