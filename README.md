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
5. Установить зависимости, создать таблицы и наполнить seed:

```bash
cd server
npm install
npm run db:sync
npm run db:seed
npm run dev
```

`db:sync` в development также выполняется при старте сервера (`sequelize.sync({ alter: true })`). Seed можно гонять повторно — дублей не будет.

Seed-пользователи: `user1@example.com` / `user2@example.com`, пароль `password123`.

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

## Документация фазы 1

| Файл | Содержание |
|---|---|
| [docs/erd.md](docs/erd.md) | ERD, поля, ограничения, ENUM type/status |
| [docs/api-contract.md](docs/api-contract.md) | endpoints, тела запросов, коды 201/400/401/403/404 |
| [docs/erd.drawio](docs/erd.drawio) | схемы и таблицы фазы 1 в draw.io |

## Примеры запросов

Пока реализованы служебные endpoint. Полный контракт остальных — в `docs/api-contract.md`.

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

Каталог маршрутов, ENUM типов и статусов, карта переходов.

Остальные методы (auth, samples, documents, ratings) появятся в фазах 3–8. Коды ответов уже зафиксированы: 201 создание, 400 валидация, 401 нет JWT, 403 чужая запись, 404 нет ресурса.

## Модель данных

Пять таблиц: `users`, `samples`, `sample_documents`, `sample_ratings`, `sample_events`.

Подробности и ERD: [docs/erd.md](docs/erd.md). Редактор схем: откройте `docs/erd.drawio` в diagrams.net.

## Команда

Роли будут указаны после распределения:

- Backend + Database
- API + Security + Tests
