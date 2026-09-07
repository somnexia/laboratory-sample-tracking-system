# Контракт API (фаза 1.6)

Зафиксированные маршруты учебного Sample Tracking API. Реализация CRUD — следующие фазы; этот документ — вход/выход и коды ответов.

Общий формат ошибки:

```json
{ "error": "Human-readable message" }
```

Заголовок для защищённых маршрутов: `Authorization: Bearer <jwt>`.

Пароль и хеш в JSON **никогда** не возвращаются.

---

## Сводка кодов

| Код | Когда |
|---|---|
| 200 | успешное чтение или изменение |
| 201 | ресурс создан |
| 204 | успешное удаление (тело пустое) |
| 400 | валидация, дубликат, запрещённый переход статуса, повторная оценка |
| 401 | нет токена, токен невалиден, неверный логин/пароль |
| 403 | ресурс чужой (не владелец) |
| 404 | id не найден |

`GET` списка при пустом результате возвращает `[]` и **200**, не 404.

---

## Аутентификация

| Метод | Endpoint | Описание | Доступ | Коды |
|---|---|---|---|---|
| POST | `/auth/register` | регистрация | открытый | 201, 400 |
| POST | `/auth/login` | вход, JWT | открытый | 200, 400, 401 |
| GET | `/auth/me` | текущий пользователь | JWT | 200, 401 |

### POST /auth/register

Вход:

```json
{
  "username": "user1",
  "email": "user1@example.com",
  "password": "password123"
}
```

Выход `201`:

```json
{
  "id": 1,
  "username": "user1",
  "email": "user1@example.com",
  "created_at": "2026-09-04T09:30:00.000Z"
}
```

`400` — нет полей, невалидный email, пароль слишком короткий, email уже занят.

### POST /auth/login

Вход:

```json
{
  "email": "user1@example.com",
  "password": "password123"
}
```

Выход `200`:

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "username": "user1",
    "email": "user1@example.com"
  }
}
```

`401` — пользователь не найден или пароль неверный.

### GET /auth/me

Выход `200` — тот же объект пользователя, что при регистрации (без пароля).

---

## Samples

| Метод | Endpoint | Описание | Доступ | Коды |
|---|---|---|---|---|
| POST | `/samples` | создать образец | JWT | 201, 400, 401 |
| GET | `/samples` | список, фильтр, сортировка | открытый | 200 |
| GET | `/samples/:id` | один образец | открытый | 200, 404 |
| PUT | `/samples/:id` | изменить свои поля | владелец | 200, 400, 401, 403, 404 |
| DELETE | `/samples/:id` | удалить свой | владелец | 204, 401, 403, 404 |
| PATCH | `/samples/:id/status` | смена статуса по карте | владелец | 200, 400, 401, 403, 404 |
| GET | `/samples/:id/history` | лента `sample_events` | открытый | 200, 404 |

### POST /samples

Вход (JWT):

```json
{
  "name": "Blood sample",
  "type": "BIOLOGICAL",
  "description": "Whole blood, EDTA",
  "country": "USA",
  "location": "Receiving Area",
  "research_id": 15,
  "experiment_id": 31
}
```

- `name`, `type`, `country` — обязательные.
- `sample_code` клиент не присылает: сервер выдаёт `SAM-YYYY-NNNNNN`.
- `status` при создании всегда `RECEIVED`.
- Пишется событие `SAMPLE_CREATED`.

Выход `201` — объект sample, включая `id`, `sample_code`, `status`, `created_by`, даты.

`400` — нет обязательных полей, неизвестный `type`.

### GET /samples

Query:

| Параметр | Пример | Правило |
|---|---|---|
| `country` | `USA` | точное совпадение |
| `type` | `BIOLOGICAL` | точное совпадение, значение из ENUM |
| `status` | `STORED` | точное совпадение, значение из ENUM |
| `sort` | `rating` | см. ниже |

`sort`:

| Значение | Порядок |
|---|---|
| `rating` | средняя оценка по убыванию (по умолчанию для `rating`) |
| `rating_desc` | то же |
| `rating_asc` | средняя оценка по возрастанию |
| `created_at` | новые сверху |
| `created_at_desc` | новые сверху |
| `created_at_asc` | старые сверху |

Комбинация: `GET /samples?country=USA&type=BIOLOGICAL&sort=rating`.

В элементе списка поле `average_rating` (число или `null`, если оценок нет).

### GET /samples/:id

Объект sample + `average_rating` + `ratings_count`. `404`, если нет записи.

### PUT /samples/:id

Владелец. Можно менять: `name`, `type`, `description`, `country`, `location`, `research_id`, `experiment_id`.

Нельзя менять этим методом: `sample_code`, `status`, `created_by`. Статус — только `PATCH .../status`.

Если `location` изменился — событие `LOCATION_CHANGED`. Иначе `SAMPLE_UPDATED`.

`403` — `req.user.id !== created_by`.

### DELETE /samples/:id

Владелец. Каскад: documents, ratings, events. Ответ `204`.

### PATCH /samples/:id/status

```json
{ "status": "IN_ANALYSIS" }
```

Сервер проверяет карту из [erd.md § 1.5](./erd.md#15-enum-status-и-карта-переходов). Запрещённый переход (в том числе из `DESTROYED`) → `400` `{ "error": "Invalid status transition" }`. Успех → событие `STATUS_CHANGED` (`old_value` / `new_value`).

### GET /samples/:id/history

Массив событий по `created_at ASC`:

```json
[
  {
    "id": 1,
    "sample_id": 124,
    "user_id": 5,
    "action": "SAMPLE_CREATED",
    "old_value": null,
    "new_value": "SAM-2026-000124",
    "created_at": "2026-09-04T09:30:00.000Z"
  }
]
```

Нет `PUT/PATCH/DELETE` для событий.

---

## Documents

| Метод | Endpoint | Описание | Доступ | Коды |
|---|---|---|---|---|
| POST | `/samples/:id/documents` | загрузить файл | JWT | 201, 400, 401, 404 |
| GET | `/samples/:id/documents` | список файлов образца | открытый | 200, 404 |
| DELETE | `/documents/:id` | удалить свой файл | владелец файла | 204, 401, 403, 404 |

### POST /samples/:id/documents

`multipart/form-data`, поле файла: `file`. Образец должен существовать. Событие `DOCUMENT_UPLOADED`.

Выход `201`:

```json
{
  "id": 10,
  "sample_id": 124,
  "user_id": 5,
  "filename": "receipt.pdf",
  "file_path": "/uploads/receipt-....pdf",
  "created_at": "2026-09-04T10:00:00.000Z"
}
```

`400` — нет файла или недопустимый тип (только изображения и PDF).

### DELETE /documents/:id

Только `user_id` загрузившего. Файл снимается с диска. Событие `DOCUMENT_DELETED`. `204`.

---

## Ratings

| Метод | Endpoint | Описание | Доступ | Коды |
|---|---|---|---|---|
| POST | `/samples/:id/ratings` | поставить оценку | JWT | 201, 400, 401, 404 |
| GET | `/samples/:id/rating` | среднее | открытый | 200, 404 |
| GET | `/samples/:id/ratings` | список оценок | открытый | 200, 404 |
| PUT | `/ratings/:id` | изменить свою | владелец оценки | 200, 400, 401, 403, 404 |
| DELETE | `/ratings/:id` | удалить свою | владелец оценки | 204, 401, 403, 404 |

ТЗ требует среднее, добавление, изменение и удаление своей оценки. Список `GET .../ratings` — удобство, не ломает ТЗ.

### POST /samples/:id/ratings

```json
{
  "score": 5,
  "comment": "Sample suitable for analysis"
}
```

`score` целое 1–5. Повторная оценка того же пользователя → `400`. Событие `RATING_ADDED`. Unique `(sample_id, user_id)`.

### GET /samples/:id/rating

```json
{
  "sample_id": 124,
  "average_rating": 4.3,
  "ratings_count": 7
}
```

Нет оценок: `average_rating` = `null`, `ratings_count` = `0`, всё равно `200`.

### PUT /ratings/:id

```json
{ "score": 4, "comment": "Updated after visual check" }
```

Только своя оценка. Событие `RATING_UPDATED`.

### DELETE /ratings/:id

Только своя. Событие `RATING_DELETED`. `204`.

---

## Служебные (уже реализованы)

| Метод | Endpoint | Доступ | Коды |
|---|---|---|---|
| GET | `/health` | открытый | 200 |
| GET | `/api` | открытый | 200 |

---

## Что не входит в учебный API

Нет `/transfers`, `/custodian`, `/projects/:id/samples`, `/samples/pending`, `/samples/code/:code`, QR, GraphQL.
