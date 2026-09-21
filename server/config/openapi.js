'use strict';

/**
 * OpenAPI-спецификация для Swagger UI (/api-docs).
 *
 * Это не Markdown-контракт: объект читает swagger-ui-express и рисует страницу.
 * Источник примеров — server/http/*.http и docs/api-contract.md.
 *
 * Состав файла:
 *   info / servers     — название API и базовый URL;
 *   tags               — группы в меню UI;
 *   components         — Bearer, общие схемы (Error, User, ENUM…);
 *   paths              — маршруты (наращиваем по этапам).
 *
 * ENUM type/status подтягиваем из config, чтобы не разъехаться с кодом.
 */

const { SAMPLE_TYPES } = require('../config/sampleTypes');
const { SAMPLE_STATUSES, DEFAULT_STATUS } = require('../config/sampleStatuses');

const port = process.env.PORT || 3000;
const serverUrl = `http://localhost:${port}`;

/** Общий ответ-ошибка: { "error": "..." }. */
const errorContent = {
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: { error: 'Human-readable message' },
    },
  },
};

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Laboratory Sample Tracking API',
    version: '0.0.0',
    description: [
      'Учебный REST API учёта лабораторных образцов.',
      'Текстовый контракт: docs/api-contract.md в репозитории.',
      'Авторизация: кнопка Authorize → вставить JWT из POST /auth/login (без слова Bearer — UI добавит сам).',
      `Seed: user1@example.com / password123.`,
    ].join('\n\n'),
  },
  servers: [
    {
      url: serverUrl,
      description: 'Локальный сервер (PORT из server/.env)',
    },
  ],
  tags: [
    { name: 'Health', description: 'Проверка сервера и MySQL' },
    { name: 'Auth', description: 'Регистрация, вход, текущий пользователь' },
    { name: 'Samples', description: 'CRUD образца, статус, история, фильтры (добавим следующим этапом)' },
    { name: 'Documents', description: 'Файлы образца (добавим следующим этапом)' },
    { name: 'Ratings', description: 'Оценки 1–5 (добавим следующим этапом)' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Токен из POST /auth/login → поле token',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string', example: 'Human-readable message' },
        },
      },
      SampleType: {
        type: 'string',
        description: 'Тип образца (ENUM samples.type)',
        enum: SAMPLE_TYPES,
        example: 'BIOLOGICAL',
      },
      SampleStatus: {
        type: 'string',
        description: 'Статус жизненного цикла (ENUM samples.status)',
        enum: SAMPLE_STATUSES,
        example: DEFAULT_STATUS,
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          username: { type: 'string', example: 'user1' },
          email: { type: 'string', format: 'email', example: 'user1@example.com' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, example: 'user1' },
          email: { type: 'string', format: 'email', example: 'user1@example.com' },
          password: { type: 'string', minLength: 8, example: 'password123' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user1@example.com' },
          password: { type: 'string', example: 'password123' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT для Authorize' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          database: { type: 'string', example: 'connected' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Проверка сервера и соединения с MySQL',
        responses: {
          200: {
            description: 'Сервер и БД доступны',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
          503: {
            description: 'MySQL недоступна',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
                example: { status: 'error', database: 'disconnected' },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Регистрация пользователя',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Пользователь создан (пароль в ответе не возвращается)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          400: {
            description: 'Валидация / email уже занят',
            ...errorContent,
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Вход: JWT + профиль',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Успешный вход',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          400: {
            description: 'Нет email или password',
            ...errorContent,
          },
          401: {
            description: 'Неверный email или пароль',
            ...errorContent,
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Текущий пользователь по JWT',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Профиль без password',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          401: {
            description: 'Нет или невалидный токен',
            ...errorContent,
          },
        },
      },
    },
  },
};

module.exports = openapi;
