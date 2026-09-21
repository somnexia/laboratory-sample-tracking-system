'use strict';

/**
 * Сервис образцов — бизнес-правила для таблицы samples.
 *
 * Слои приложения (запрос идёт сверху вниз):
 *   routes      — какой URL вызывает какой handler
 *   middleware  — JWT, multer, единый JSON-формат ошибок
 *   controllers — HTTP-статусы и чтение req / запись res
 *   services    — этот файл: валидация, транзакции, Sequelize
 *   models      — описание колонок и связей MySQL
 *
 * average_rating не колонка samples: его считают из sample_ratings (AVG).
 * Поэтому сортировка «по рейтингу» использует SQL-подзапрос, а не ORDER BY samples.xxx.
 */

const { Op } = require('sequelize');
const { Sample, SampleEvent, SampleRating, sequelize } = require('../models');
const { isValidType } = require('../config/sampleTypes');
const { DEFAULT_STATUS, canTransition, isValidStatus } = require('../config/sampleStatuses');
const { AppError } = require('./appError');

/** Есть ли у объекта собственный ключ (даже если значение null). */
function hasOwn(body, key) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

/**
 * Целое число или null для research_id / experiment_id.
 * Пустая строка и отсутствие поля → null; «abc» → 400.
 */
function optionalInt(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new AppError(400, `${fieldName} must be an integer or null`);
  }
  return n;
}

/**
 * Нормализация места хранения.
 * undefined — «поле в запросе не присылали» (при PUT не трогаем).
 * null / '' / пробелы — «места нет», в БД пишем null.
 */
function normalizeLocation(value) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === '') {
    return null;
  }
  const text = String(value).trim();
  return text === '' ? null : text;
}

/** Значение для sample_events.old_value / new_value (лимит VARCHAR 255). */
function eventValue(value) {
  if (value == null) {
    return null;
  }
  const text = String(value);
  return text.length > 255 ? text.slice(0, 255) : text;
}

/**
 * Публичные поля карточки без «внутренностей» Sequelize.
 * Пароль сюда не попадает: его нет у Sample.
 */
function publicSample(sample) {
  return {
    id: sample.id,
    sample_code: sample.sample_code,
    name: sample.name,
    type: sample.type,
    description: sample.description,
    status: sample.status,
    country: sample.country,
    location: sample.location,
    research_id: sample.research_id,
    experiment_id: sample.experiment_id,
    created_by: sample.created_by,
    created_at: sample.created_at,
    updated_at: sample.updated_at,
  };
}

/**
 * Среднее и число оценок для одного образца.
 *
 * Состав SQL: AVG(score), COUNT(id) по sample_ratings WHERE sample_id = ?
 * Нет строк → average_rating null, ratings_count 0 (не «ноль баллов»).
 * toFixed(2) — удобный JSON (4.5), без длинного хвоста float.
 */
async function ratingStats(sampleId) {
  const row = await SampleRating.findOne({
    where: { sample_id: sampleId },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('score')), 'average_rating'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'ratings_count'],
    ],
    raw: true,
  });

  const count = Number(row && row.ratings_count ? row.ratings_count : 0);
  const avg = row && row.average_rating != null ? Number(row.average_rating) : null;

  return {
    average_rating: count > 0 ? Number(avg.toFixed(2)) : null,
    ratings_count: count,
  };
}

/** Карточка + average_rating + ratings_count — один формат для GET :id и элемента списка. */
async function toResponse(sample) {
  const stats = await ratingStats(sample.id);
  return { ...publicSample(sample), ...stats };
}

/**
 * Следующий уникальный код SAM-YYYY-NNNNNN в текущем UTC-году.
 * Берём максимальный код с префиксом года и +1; seed уже занял часть номеров.
 */
async function nextSampleCode(transaction) {
  const year = new Date().getUTCFullYear();
  const prefix = `SAM-${year}-`;
  const last = await Sample.findOne({
    where: { sample_code: { [Op.like]: `${prefix}%` } },
    order: [['sample_code', 'DESC']],
    transaction,
  });

  let next = 1;
  if (last) {
    next = Number(last.sample_code.slice(prefix.length)) + 1;
  }
  if (!Number.isFinite(next) || next < 1) {
    next = 1;
  }

  return prefix + String(next).padStart(6, '0');
}

/**
 * Создание образца.
 * Обязательны name, type, country. Код и статус выдаёт сервер (RECEIVED).
 * created_by — из JWT (userId), не из body.
 * В одной транзакции: INSERT samples + событие SAMPLE_CREATED.
 */
async function create(userId, body) {
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  const country = String(body.country || '').trim();
  const description = body.description == null ? null : String(body.description);
  const location = body.location == null || body.location === ''
    ? null
    : String(body.location).trim();

  if (!name || !type || !country) {
    throw new AppError(400, 'name, type and country are required');
  }
  if (!isValidType(type)) {
    throw new AppError(400, 'type is invalid');
  }

  const research_id = optionalInt(body.research_id, 'research_id');
  const experiment_id = optionalInt(body.experiment_id, 'experiment_id');

  const sample = await sequelize.transaction(async (transaction) => {
    const sample_code = await nextSampleCode(transaction);
    const created = await Sample.create({
      sample_code,
      name,
      type,
      description,
      status: DEFAULT_STATUS,
      country,
      location,
      research_id,
      experiment_id,
      created_by: userId,
    }, { transaction });

    await SampleEvent.create({
      sample_id: created.id,
      user_id: userId,
      action: 'SAMPLE_CREATED',
      old_value: null,
      new_value: sample_code,
    }, { transaction });

    return created;
  });

  return toResponse(sample);
}

/**
 * Сборка WHERE для GET /samples из query-параметров.
 *
 * Вход: req.query, например { country: 'USA', type: 'WATER' }.
 * Выход: объект для Sequelize.findAll({ where }).
 *
 * Правила:
 *   - параметра нет или пустая строка → поле не добавляем (не фильтруем);
 *   - country — точное совпадение строки;
 *   - type / status — только значения из ENUM (config), иначе 400;
 *   - несколько ключей сразу → AND (все условия вместе).
 *
 * Это «какие строки», не «в каком порядке» (порядок — parseListSort).
 */
function buildListWhere(query) {
  const where = {};
  const q = query || {};

  if (q.country != null && String(q.country).trim() !== '') {
    where.country = String(q.country).trim();
  }

  if (q.type != null && String(q.type).trim() !== '') {
    const type = String(q.type).trim();
    if (!isValidType(type)) {
      throw new AppError(400, 'type is invalid');
    }
    where.type = type;
  }

  if (q.status != null && String(q.status).trim() !== '') {
    const status = String(q.status).trim();
    if (!isValidStatus(status)) {
      throw new AppError(400, 'status is invalid');
    }
    where.status = status;
  }

  return where;
}

/**
 * Разбор ?sort=… в понятную структуру { kind, direction }.
 *
 * kind:
 *   created_at — колонка samples.created_at
 *   rating     — среднее из sample_ratings (подзапрос AVG)
 * direction: 'ASC' | 'DESC'
 *
 * Алиасы контракта:
 *   (нет) / created_at / created_at_desc → дата, новые сверху
 *   created_at_asc                       → дата, старые сверху
 *   rating / rating_desc                  → среднее, выше сверху
 *   rating_asc                            → среднее, ниже сверху
 *   иное                                  → 400 sort is invalid
 *
 * Зачем не сразу массив order: для даты и рейтинга разные SQL ORDER BY.
 */
function parseListSort(query) {
  const raw = query && query.sort != null ? String(query.sort).trim() : '';

  if (!raw || raw === 'created_at' || raw === 'created_at_desc') {
    return { kind: 'created_at', direction: 'DESC' };
  }
  if (raw === 'created_at_asc') {
    return { kind: 'created_at', direction: 'ASC' };
  }
  if (raw === 'rating' || raw === 'rating_desc') {
    return { kind: 'rating', direction: 'DESC' };
  }
  if (raw === 'rating_asc') {
    return { kind: 'rating', direction: 'ASC' };
  }

  throw new AppError(400, 'sort is invalid');
}

/**
 * SQL-подзапрос: AVG(score) для текущей строки списка.
 *
 * Коррелированный подзапрос: для каждой строки MySQL считает среднее
 * по sample_ratings с тем же sample_id.
 * Число совпадает с GET /samples/:id/rating → average_rating.
 *
 * Во внешнем SELECT Sequelize даёт таблице алиас `Sample` (modelName),
 * поэтому сравниваем с `Sample`.`id`, а не с именем таблицы samples.
 */
function averageRatingSql() {
  return `(
    SELECT AVG(\`sample_ratings\`.\`score\`)
    FROM \`sample_ratings\`
    WHERE \`sample_ratings\`.\`sample_id\` = \`Sample\`.\`id\`
  )`;
}

/**
 * ORDER BY по дате создания.
 * Вторичный ключ id — при одинаковой секунде created_at порядок стабильный.
 */
function orderByCreatedAt(direction) {
  return [
    ['created_at', direction],
    ['id', direction],
  ];
}

/**
 * ORDER BY по среднему рейтингу.
 *
 * Три уровня:
 *   1) (avg IS NULL) ASC — сначала образцы С оценками (false/0),
 *      потом без оценок (true/1). Иначе в MySQL при DESC NULL
 *      «всплывают» вверх как самые маленькие значения.
 *   2) сам AVG — DESC (лучшие сверху) или ASC (худшие сверху).
 *   3) id — тай-брейк при равном среднем.
 *
 * sequelize.literal — вставить SQL как есть.
 * direction берём только из parseListSort ('ASC'|'DESC'), не сырую строку клиента.
 */
function orderByAverageRating(direction) {
  const avg = averageRatingSql();
  return [
    [sequelize.literal(`(${avg}) IS NULL`), 'ASC'],
    [sequelize.literal(avg), direction],
    ['id', direction],
  ];
}

/**
 * Открытый список образцов.
 *
 * Шаги:
 *   1. buildListWhere — фильтр (WHERE)
 *   2. parseListSort  — какой вид сортировки
 *   3. orderBy*       — массив для Sequelize order
 *   4. findAll        — один SELECT
 *   5. toResponse     — к каждой строке среднее и счётчик оценок
 *
 * Пустой набор → [] (контроллер отдаёт 200, не 404).
 */
async function list(query) {
  const where = buildListWhere(query);
  const sort = parseListSort(query);

  const order = sort.kind === 'rating'
    ? orderByAverageRating(sort.direction)
    : orderByCreatedAt(sort.direction);

  const rows = await Sample.findAll({
    where,
    order,
    // Иначе Sequelize может обернуть SELECT во вложенный запрос,
    // и алиас Sample в ORDER BY / подзапросе перестанет быть виден.
    subQuery: false,
  });
  const result = [];
  for (const row of rows) {
    result.push(await toResponse(row));
  }
  return result;
}

/**
 * Модель Sample по id или 404.
 * Нужна контроллеру до ownerOnly: сначала «есть ли запись», потом «твоя ли».
 */
async function findByIdOrThrow(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) {
    throw new AppError(404, 'Sample not found');
  }

  const sample = await Sample.findByPk(numericId);
  if (!sample) {
    throw new AppError(404, 'Sample not found');
  }

  return sample;
}

async function getById(id) {
  return toResponse(await findByIdOrThrow(id));
}

/**
 * Обновление полей карточки владельцем.
 * sample_code / status / created_by из body игнорируем:
 *   код выдаёт сервер, статус — только changeStatus, владельца нельзя сменить.
 * Сменилось location → LOCATION_CHANGED, иначе SAMPLE_UPDATED.
 */
async function update(userId, sample, body) {
  const previousLocation = normalizeLocation(sample.location) ?? null;

  if (hasOwn(body, 'name')) {
    const name = String(body.name || '').trim();
    if (!name) {
      throw new AppError(400, 'name cannot be empty');
    }
    sample.name = name;
  }

  if (hasOwn(body, 'type')) {
    const type = String(body.type || '').trim();
    if (!isValidType(type)) {
      throw new AppError(400, 'type is invalid');
    }
    sample.type = type;
  }

  if (hasOwn(body, 'description')) {
    sample.description = body.description == null ? null : String(body.description);
  }

  if (hasOwn(body, 'country')) {
    const country = String(body.country || '').trim();
    if (!country) {
      throw new AppError(400, 'country cannot be empty');
    }
    sample.country = country;
  }

  let locationChanged = false;
  if (hasOwn(body, 'location')) {
    const nextLocation = normalizeLocation(body.location);
    locationChanged = previousLocation !== nextLocation;
    sample.location = nextLocation;
  }

  if (hasOwn(body, 'research_id')) {
    sample.research_id = optionalInt(body.research_id, 'research_id');
  }

  if (hasOwn(body, 'experiment_id')) {
    sample.experiment_id = optionalInt(body.experiment_id, 'experiment_id');
  }

  await sequelize.transaction(async (transaction) => {
    await sample.save({ transaction });

    if (locationChanged) {
      await SampleEvent.create({
        sample_id: sample.id,
        user_id: userId,
        action: 'LOCATION_CHANGED',
        old_value: eventValue(previousLocation),
        new_value: eventValue(sample.location),
      }, { transaction });
      return;
    }

    await SampleEvent.create({
      sample_id: sample.id,
      user_id: userId,
      action: 'SAMPLE_UPDATED',
      old_value: null,
      new_value: sample.sample_code,
    }, { transaction });
  });

  return toResponse(sample);
}

/**
 * Удаление владельцем.
 * Отдельного SAMPLE_DELETED нет: documents, ratings, events уходят CASCADE.
 */
async function remove(sample) {
  await sample.destroy();
}

/**
 * Один шаг статуса по карте ALLOWED_TRANSITIONS.
 * Прыжок или шаг из DESTROYED → 400 «Invalid status transition».
 * Успех: новая колонка status + событие STATUS_CHANGED (old/new).
 */
async function changeStatus(userId, sample, body) {
  const nextStatus = String((body && body.status) || '').trim();
  const previous = sample.status;

  if (!canTransition(previous, nextStatus)) {
    throw new AppError(400, 'Invalid status transition');
  }

  sample.status = nextStatus;

  await sequelize.transaction(async (transaction) => {
    await sample.save({ transaction });
    await SampleEvent.create({
      sample_id: sample.id,
      user_id: userId,
      action: 'STATUS_CHANGED',
      old_value: previous,
      new_value: nextStatus,
    }, { transaction });
  });

  return toResponse(sample);
}

/** Поля события для JSON. update/destroy для Event не вызываем (лента только INSERT). */
function publicEvent(event) {
  return {
    id: event.id,
    sample_id: event.sample_id,
    user_id: event.user_id,
    action: event.action,
    old_value: event.old_value,
    new_value: event.new_value,
    created_at: event.created_at,
  };
}

/**
 * Лента sample_events по времени.
 * Сначала проверяем, что образец есть (иначе 404, а не путаница с «истории нет»).
 * Нет событий → [] и 200. Порядок created_at ASC, при равенстве id ASC.
 */
async function getHistory(id) {
  const sample = await findByIdOrThrow(id);

  const rows = await SampleEvent.findAll({
    where: { sample_id: sample.id },
    order: [
      ['created_at', 'ASC'],
      ['id', 'ASC'],
    ],
  });

  return rows.map(publicEvent);
}

module.exports = {
  create,
  list,
  getById,
  findByIdOrThrow,
  update,
  remove,
  changeStatus,
  getHistory,
  publicSample,
  ratingStats,
};
