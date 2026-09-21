'use strict';

/**
 * Подключение Swagger UI на путь /api-docs.
 *
 * Здесь нет HTML-разметки. Функции библиотеки:
 *   swaggerUi.serve  — middleware: отдаёт готовые статику/скрипты UI
 *                      (CSS/JS, которые уже лежат внутри npm-пакета);
 *   swaggerUi.setup(spec, options) — middleware: вшивает ваш объект openapi
 *                      в страницу; браузерский JS UI читает spec и рисует формы.
 *
 * mountSwagger(app) — одна точка: app.use('/api-docs', serve, setup(...)).
 * Вешать до notFoundHandler, иначе Express ответит JSON 404 вместо UI.
 *
 * options:
 *   customSiteTitle      — заголовок вкладки браузера;
 *   persistAuthorization — после F5 токен в Authorize не сбрасывается;
 *   docExpansion: 'list' — группы свёрнуты до клика;
 *   filter: true         — поиск по методам в UI.
 */

const swaggerUi = require('swagger-ui-express');
const openapi = require('./openapi');

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
