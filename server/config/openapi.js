'use strict';

/**
 * OpenAPI-спецификация для Swagger UI (/api-docs).
 *
 * Файл НЕ рисует HTML сам. Он экспортирует обычный JS-объект (словарь).
 * Библиотека swagger-ui-express берёт этот объект и на своей готовой
 * HTML/JS-странице строит меню, формы и кнопку Try it out.
 *
 * Состав объекта OpenAPI 3:
 *   openapi, info, servers — метаданные;
 *   tags                   — группы в левом меню UI;
 *   components.schemas     — «формы» JSON (поля, типы, enum, example);
 *   components.securitySchemes — как передавать JWT (Bearer);
 *   paths                  — URL → get/post/put/patch/delete → параметры и ответы.
 *
 * $ref: '#/components/schemas/Sample' — ссылка «возьми схему Sample отсюда»,
 * чтобы не копировать один и тот же объект в десяти местах.
 *
 * ENUM type/status/action — из config/, чтобы совпадали с кодом сервера.
 */

const { SAMPLE_TYPES } = require('../config/sampleTypes');
const { SAMPLE_STATUSES, DEFAULT_STATUS } = require('../config/sampleStatuses');
const { EVENT_ACTIONS } = require('../config/sampleEvents');

const port = process.env.PORT || 3000;
const serverUrl = `http://localhost:${port}`;

/** Общий JSON-ответ ошибки для responses 400/401/403/404. */
const errorContent = {
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: { error: 'Human-readable message' },
    },
  },
};

/** Path-параметр :id образца. */
const sampleIdParam = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'id строки samples',
  schema: { type: 'integer', minimum: 1, example: 1 },
};

/** Path-параметр :id документа (не образца). */
const documentIdParam = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'id строки sample_documents',
  schema: { type: 'integer', minimum: 1, example: 10 },
};

/** Path-параметр :id оценки (не образца). */
const ratingIdParam = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'id строки sample_ratings',
  schema: { type: 'integer', minimum: 1, example: 3 },
};

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Laboratory Sample Tracking API',
    version: '0.0.0',
    description: [
      'Учебный REST API учёта лабораторных образцов.',
      'Текстовый контракт: docs/api-contract.md в репозитории.',
      'Авторизация: Authorize → JWT из POST /auth/login (поле token; слово Bearer UI добавит сам).',
      'Seed: user1@example.com / password123.',
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
    {
      name: 'Samples',
      description: 'CRUD карточки, смена статуса, история, фильтры и сортировка списка',
    },
    { name: 'Documents', description: 'Загрузка, список и удаление файлов образца (PDF / изображения)' },
    { name: 'Ratings', description: 'Оценка качества 1–5: поставить, среднее, изменить и удалить свою' },
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
        description: 'Тип образца (колонка samples.type)',
        enum: SAMPLE_TYPES,
        example: 'BIOLOGICAL',
      },
      SampleStatus: {
        type: 'string',
        description: 'Статус жизненного цикла (колонка samples.status)',
        enum: SAMPLE_STATUSES,
        example: DEFAULT_STATUS,
      },
      EventAction: {
        type: 'string',
        description: 'Действие в ленте sample_events',
        enum: EVENT_ACTIONS,
        example: 'SAMPLE_CREATED',
      },
      SortOption: {
        type: 'string',
        description: 'Сортировка GET /samples',
        enum: [
          'rating',
          'rating_desc',
          'rating_asc',
          'created_at',
          'created_at_desc',
          'created_at_asc',
        ],
        example: 'rating',
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
      Sample: {
        type: 'object',
        description: 'Карточка образца + среднее оценок',
        properties: {
          id: { type: 'integer', example: 1 },
          sample_code: { type: 'string', example: 'SAM-2026-000124' },
          name: { type: 'string', example: 'Blood sample' },
          type: { $ref: '#/components/schemas/SampleType' },
          description: { type: 'string', nullable: true, example: 'Whole blood, EDTA' },
          status: { $ref: '#/components/schemas/SampleStatus' },
          country: { type: 'string', example: 'USA' },
          location: { type: 'string', nullable: true, example: 'Receiving Area' },
          research_id: { type: 'integer', nullable: true, example: 15 },
          experiment_id: { type: 'integer', nullable: true, example: 31 },
          created_by: { type: 'integer', example: 1 },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          average_rating: {
            type: 'number',
            nullable: true,
            example: 4.5,
            description: 'null, если оценок ещё нет',
          },
          ratings_count: { type: 'integer', example: 2 },
        },
      },
      CreateSampleRequest: {
        type: 'object',
        required: ['name', 'type', 'country'],
        properties: {
          name: { type: 'string', example: 'Blood sample' },
          type: { $ref: '#/components/schemas/SampleType' },
          description: { type: 'string', example: 'Whole blood, EDTA' },
          country: { type: 'string', example: 'USA' },
          location: { type: 'string', example: 'Receiving Area' },
          research_id: { type: 'integer', nullable: true, example: 15 },
          experiment_id: { type: 'integer', nullable: true, example: 31 },
        },
      },
      UpdateSampleRequest: {
        type: 'object',
        description: 'Любое подмножество полей. sample_code, status, created_by игнорируются.',
        properties: {
          name: { type: 'string', example: 'Blood sample updated' },
          type: { $ref: '#/components/schemas/SampleType' },
          description: { type: 'string', nullable: true },
          country: { type: 'string', example: 'USA' },
          location: { type: 'string', nullable: true, example: 'Freezer FZ-01' },
          research_id: { type: 'integer', nullable: true },
          experiment_id: { type: 'integer', nullable: true },
        },
      },
      StatusPatchRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { $ref: '#/components/schemas/SampleStatus' },
        },
        example: { status: 'REGISTERED' },
      },
      SampleEvent: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          sample_id: { type: 'integer', example: 1 },
          user_id: { type: 'integer', example: 1 },
          action: { $ref: '#/components/schemas/EventAction' },
          old_value: { type: 'string', nullable: true, example: null },
          new_value: { type: 'string', nullable: true, example: 'SAM-2026-000124' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      SampleDocument: {
        type: 'object',
        description: 'Метаданные файла. Сами байты — GET file_path (статика /uploads/…)',
        properties: {
          id: { type: 'integer', example: 10 },
          sample_id: { type: 'integer', example: 1 },
          user_id: {
            type: 'integer',
            example: 1,
            description: 'Кто загрузил (= владелец файла для DELETE)',
          },
          filename: { type: 'string', example: 'receipt.pdf' },
          file_path: { type: 'string', example: '/uploads/1789-abc.pdf' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      SampleRating: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 3 },
          sample_id: { type: 'integer', example: 1 },
          user_id: { type: 'integer', example: 1 },
          score: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
          comment: {
            type: 'string',
            nullable: true,
            example: 'Sample suitable for analysis',
          },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateRatingRequest: {
        type: 'object',
        required: ['score'],
        properties: {
          score: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
          comment: { type: 'string', nullable: true, example: 'Sample suitable for analysis' },
        },
      },
      UpdateRatingRequest: {
        type: 'object',
        properties: {
          score: { type: 'integer', minimum: 1, maximum: 5, example: 4 },
          comment: {
            type: 'string',
            nullable: true,
            example: 'Updated after visual check',
          },
        },
      },
      RatingAverage: {
        type: 'object',
        properties: {
          sample_id: { type: 'integer', example: 1 },
          average_rating: {
            type: 'number',
            nullable: true,
            example: 4.5,
            description: 'null, если оценок нет',
          },
          ratings_count: { type: 'integer', example: 2 },
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
          400: { description: 'Валидация / email уже занят', ...errorContent },
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
          400: { description: 'Нет email или password', ...errorContent },
          401: { description: 'Неверный email или пароль', ...errorContent },
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
          401: { description: 'Нет или невалидный токен', ...errorContent },
        },
      },
    },
    '/samples': {
      get: {
        tags: ['Samples'],
        summary: 'Список образцов (фильтр + сортировка)',
        description: 'Открытый. Пустой результат — [] и 200. Примеры: server/http/filters.http',
        parameters: [
          {
            name: 'country',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'USA' },
            description: 'Точное совпадение country',
          },
          {
            name: 'type',
            in: 'query',
            required: false,
            schema: { $ref: '#/components/schemas/SampleType' },
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { $ref: '#/components/schemas/SampleStatus' },
          },
          {
            name: 'sort',
            in: 'query',
            required: false,
            schema: { $ref: '#/components/schemas/SortOption' },
            description: 'По умолчанию created_at DESC (новые сверху)',
          },
        ],
        responses: {
          200: {
            description: 'Массив образцов',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Sample' },
                },
              },
            },
          },
          400: { description: 'Невалидный type, status или sort', ...errorContent },
        },
      },
      post: {
        tags: ['Samples'],
        summary: 'Создать образец',
        description: 'sample_code и status=RECEIVED выдаёт сервер. Событие SAMPLE_CREATED.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateSampleRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Образец создан',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Sample' },
              },
            },
          },
          400: { description: 'Нет обязательных полей / неверный type', ...errorContent },
          401: { description: 'Нет JWT', ...errorContent },
        },
      },
    },
    '/samples/{id}': {
      get: {
        tags: ['Samples'],
        summary: 'Один образец по id',
        parameters: [sampleIdParam],
        responses: {
          200: {
            description: 'Карточка + average_rating + ratings_count',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Sample' },
              },
            },
          },
          404: { description: 'Образец не найден', ...errorContent },
        },
      },
      put: {
        tags: ['Samples'],
        summary: 'Изменить свои поля карточки',
        description: 'Только created_by. status меняют через PATCH .../status.',
        security: [{ bearerAuth: [] }],
        parameters: [sampleIdParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateSampleRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Обновлённая карточка',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Sample' },
              },
            },
          },
          400: { description: 'Валидация (пустые поля, type)', ...errorContent },
          401: { description: 'Нет JWT', ...errorContent },
          403: { description: 'Чужой образец', ...errorContent },
          404: { description: 'Образец не найден', ...errorContent },
        },
      },
      delete: {
        tags: ['Samples'],
        summary: 'Удалить свой образец',
        description: 'Каскад: documents, ratings, events. Тело ответа пустое.',
        security: [{ bearerAuth: [] }],
        parameters: [sampleIdParam],
        responses: {
          204: { description: 'Удалено' },
          401: { description: 'Нет JWT', ...errorContent },
          403: { description: 'Чужой образец', ...errorContent },
          404: { description: 'Образец не найден', ...errorContent },
        },
      },
    },
    '/samples/{id}/status': {
      patch: {
        tags: ['Samples'],
        summary: 'Сменить статус по карте переходов',
        description: 'Один шаг: RECEIVED→REGISTERED→…→DESTROYED. Иначе 400 Invalid status transition.',
        security: [{ bearerAuth: [] }],
        parameters: [sampleIdParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StatusPatchRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Карточка с новым status + событие STATUS_CHANGED',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Sample' },
              },
            },
          },
          400: { description: 'Запрещённый переход', ...errorContent },
          401: { description: 'Нет JWT', ...errorContent },
          403: { description: 'Чужой образец', ...errorContent },
          404: { description: 'Образец не найден', ...errorContent },
        },
      },
    },
    '/samples/{id}/history': {
      get: {
        tags: ['Samples'],
        summary: 'Лента sample_events',
        description: 'Открытый. Порядок created_at ASC. События только INSERT, без PUT/DELETE.',
        parameters: [sampleIdParam],
        responses: {
          200: {
            description: 'Массив событий (может быть [])',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/SampleEvent' },
                },
              },
            },
          },
          404: { description: 'Образец не найден', ...errorContent },
        },
      },
    },
    '/samples/{id}/documents': {
      get: {
        tags: ['Documents'],
        summary: 'Список файлов образца',
        description: 'Открытый. Пустой список — [] и 200, если образец есть.',
        parameters: [sampleIdParam],
        responses: {
          200: {
            description: 'Массив документов',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/SampleDocument' },
                },
              },
            },
          },
          404: { description: 'Образец не найден', ...errorContent },
        },
      },
      post: {
        tags: ['Documents'],
        summary: 'Загрузить PDF или изображение',
        description: [
          'multipart/form-data, поле формы обязательно называется file.',
          'Только image/* и application/pdf, до 5 МБ.',
          'Событие DOCUMENT_UPLOADED. Примеры: server/http/documents.http',
        ].join(' '),
        security: [{ bearerAuth: [] }],
        parameters: [sampleIdParam],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Файл (PDF / jpeg / png / gif / webp)',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Метаданные сохранённого файла',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SampleDocument' },
              },
            },
          },
          400: { description: 'Нет файла / неверный тип / слишком большой', ...errorContent },
          401: { description: 'Нет JWT', ...errorContent },
          404: { description: 'Образец не найден', ...errorContent },
        },
      },
    },
    '/documents/{id}': {
      delete: {
        tags: ['Documents'],
        summary: 'Удалить свой файл',
        description: 'Владелец — user_id загрузившего, не обязательно created_by образца. 204 без тела.',
        security: [{ bearerAuth: [] }],
        parameters: [documentIdParam],
        responses: {
          204: { description: 'Файл и строка удалены' },
          401: { description: 'Нет JWT', ...errorContent },
          403: { description: 'Чужой файл', ...errorContent },
          404: { description: 'Документ не найден', ...errorContent },
        },
      },
    },
    '/samples/{id}/ratings': {
      post: {
        tags: ['Ratings'],
        summary: 'Поставить оценку 1–5',
        description: 'Один пользователь — одна оценка на образец. Повтор → 400. Событие RATING_ADDED.',
        security: [{ bearerAuth: [] }],
        parameters: [sampleIdParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateRatingRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Оценка создана',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SampleRating' },
              },
            },
          },
          400: { description: 'score не 1–5 / уже оценивали', ...errorContent },
          401: { description: 'Нет JWT', ...errorContent },
          404: { description: 'Образец не найден', ...errorContent },
        },
      },
    },
    '/samples/{id}/rating': {
      get: {
        tags: ['Ratings'],
        summary: 'Среднее и число оценок',
        description: 'Открытый. Без оценок: average_rating null, ratings_count 0, всё равно 200.',
        parameters: [sampleIdParam],
        responses: {
          200: {
            description: 'Сводка',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RatingAverage' },
              },
            },
          },
          404: { description: 'Образец не найден', ...errorContent },
        },
      },
    },
    '/ratings/{id}': {
      put: {
        tags: ['Ratings'],
        summary: 'Изменить свою оценку',
        description: 'Только user_id этой строки. Событие RATING_UPDATED.',
        security: [{ bearerAuth: [] }],
        parameters: [ratingIdParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateRatingRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Обновлённая оценка',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SampleRating' },
              },
            },
          },
          400: { description: 'score вне 1–5', ...errorContent },
          401: { description: 'Нет JWT', ...errorContent },
          403: { description: 'Чужая оценка', ...errorContent },
          404: { description: 'Оценка не найдена', ...errorContent },
        },
      },
      delete: {
        tags: ['Ratings'],
        summary: 'Удалить свою оценку',
        description: 'После DELETE тот же пользователь может снова POST. Событие RATING_DELETED.',
        security: [{ bearerAuth: [] }],
        parameters: [ratingIdParam],
        responses: {
          204: { description: 'Оценка удалена' },
          401: { description: 'Нет JWT', ...errorContent },
          403: { description: 'Чужая оценка', ...errorContent },
          404: { description: 'Оценка не найдена', ...errorContent },
        },
      },
    },
  },
};

module.exports = openapi;
