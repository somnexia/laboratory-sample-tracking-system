# Laboratory Sample Tracking System

REST API для регистрации лабораторных образцов, смены статуса, загрузки документов, оценок качества и чтения истории действий. Учебный модуль под требования курса (JWT, CRUD с владельцем, файлы, рейтинг, фильтры). В большом LIMS этот же контур станет Sample Tracking & Chain of Custody.

Для любого образца API должен отвечать: что это, когда зарегистрирован, где сейчас, кто создал, какой статус, какая средняя оценка и что уже происходило.

## Стек

- Node.js + Express
- MySQL + Sequelize
- JWT + bcrypt
- Multer (файлы)
- Swagger (будет добавлен позже)

Клиентского SPA нет: ответы API — JSON. «Картинка» для разработки и защиты: браузер (`GET`), статическая консоль на `/`, позже Swagger UI, Postman/curl.

## Структура сервера

```
server/
  bin/www
  config/          database, env, jwt, статусы образца
  models/          фаза 1–2
  middleware/      JSON-ошибки; auth и upload — следующие фазы
  routes/
  controllers/
  services/
  migrations/
  seeders/
  uploads/
  public/          статическая консоль API (не Jade)
  app.js
```

## Установка и запуск

Нужны Node.js и MySQL.

1. Клонировать репозиторий.
2. Создать базу:

```sql
CREATE DATABASE sample_tracking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. Скопировать переменные окружения:

```bash
cp server/.env.example server/.env
```

На Windows (PowerShell):

```powershell
Copy-Item server/.env.example server/.env
```

4. Заполнить `server/.env`: `DB_*`, `JWT_SECRET` (не короче 10 символов), `PORT`.
5. Установить зависимости и запустить:

```bash
cd server
npm install
npm run dev
```

Сервер слушает `http://localhost:3000`.

| Что открыть | Зачем |
|---|---|
| http://localhost:3000 | Консоль: живой JSON `/health` |
| http://localhost:3000/health | `{ "status": "ok" }` |
| http://localhost:3000/api | Каталог запланированных endpoint |

Проверка без браузера:

```bash
curl http://localhost:3000/health
```

Ожидаемый ответ: `{ "status": "ok" }`.

## Как смотреть ответы без views

Jade/Pug **не используется**. API не рендерит HTML из шаблонов.

- **GET в браузере** — Chrome/Firefox показывают JSON (`/health`, `/api`).
- **Консоль на `/`** — статическая страница из `server/public`, она сама вызывает `/health`.
- **Swagger UI `/api-docs`** — появится в фазе документации; через него удобно гонять POST/PUT и JWT.
- **Postman или curl** — обязательны для тел запросов и загрузки файлов.

## Примеры запросов

Пока реализованы только служебные endpoint. Остальные появятся вместе с моделями, JWT и CRUD.

### GET /health

```http
GET /health
```

```json
{ "status": "ok" }
```

### GET /api

```http
GET /api
```

Каталог будущих маршрутов: auth, samples, documents, ratings.

### Запланированные endpoint (ещё не реализованы)

| Метод | Endpoint | Доступ |
|---|---|---|
| POST | `/auth/register` | открытый |
| POST | `/auth/login` | открытый |
| GET | `/auth/me` | JWT |
| POST | `/samples` | JWT |
| GET | `/samples` | открытый |
| GET | `/samples/:id` | открытый |
| PUT | `/samples/:id` | владелец |
| DELETE | `/samples/:id` | владелец |
| PATCH | `/samples/:id/status` | владелец |
| GET | `/samples/:id/history` | открытый |
| GET | `/samples?country=&sort=rating` | открытый |
| POST | `/samples/:id/documents` | JWT |
| GET | `/samples/:id/documents` | открытый |
| DELETE | `/documents/:id` | владелец файла |
| POST | `/samples/:id/ratings` | JWT |
| GET | `/samples/:id/rating` | открытый |
| PUT | `/ratings/:id` | владелец оценки |
| DELETE | `/ratings/:id` | владелец оценки |

Примеры тел запросов будут добавлены после реализации каждого ресурса.

## Модель данных (план)

Пять таблиц: `users`, `samples`, `sample_documents`, `sample_ratings`, `sample_events`.

Схема Sequelize и ERD — следующая фаза.

## Команда

Роли будут указаны после распределения:

- Backend + Database
- API + Security + Tests
