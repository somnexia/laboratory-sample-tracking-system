# Laboratory Sample Tracking System

REST API для учёта лабораторных образцов: карточка, статус, документы, оценка качества и история действий. Ответы — JSON. Отдельного клиентского приложения нет.

Для любого образца API отвечает, что это, когда зарегистрирован, где находится, кто создал, какой статус, какая средняя оценка и какие действия уже записаны.

## Стек

- Node.js и Express
- MySQL и Sequelize
- JWT и bcrypt
- Multer для файлов
- Swagger UI
- Jest и Supertest

## Как устроен сервер

Запрос проходит слои по порядку. `routes` выбирает путь. `middleware` проверяет JWT и принимает файл. `controllers` читает HTTP и отдаёт статус и JSON. `services` содержат правила: код образца, переходы статуса, владельца, среднюю оценку. `models` описывают таблицы.

```
server/
  bin/www              старт HTTP и подключение к MySQL
  app.js               сборка Express
  config/              база, JWT, ENUM, OpenAPI
  models/              таблицы Sequelize
  routes/              пути
  controllers/         HTTP
  services/            правила
  middleware/          JWT, загрузка файла, ошибки
  seeders/             создание таблиц и учебные данные
  tests/               автоматические сценарии
  http/                примеры для REST Client
  public/              страница на /
  uploads/             файлы документов на диске
```

Контракт запросов и схема таблиц лежат в `docs/`.

## Требования

- Node.js
- MySQL (подойдёт XAMPP)

## Установка

1. Клонировать репозиторий.
2. Создать базу:

```sql
CREATE DATABASE sample_tracking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. Пользователь приложения должен иметь права на эту базу. В phpMyAdmin под `root`:

```sql
CREATE USER 'sample_tracking_user'@'localhost' IDENTIFIED BY 'change_me';
GRANT ALL PRIVILEGES ON sample_tracking.* TO 'sample_tracking_user'@'localhost';
FLUSH PRIVILEGES;
```

Если пользователь уже есть, достаточно `GRANT`.

4. Скопировать шаблон окружения и заполнить его. Пароль базы и `JWT_SECRET` в Git не коммитятся: рабочий файл `server/.env` указан в `.gitignore`.

Windows (PowerShell), из корня репозитория:

```powershell
Copy-Item server/.env.example server/.env
```

macOS и Linux:

```bash
cp server/.env.example server/.env
```

В `server/.env` задаются `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET` (не короче 10 символов) и `PORT`. В шаблоне порт `3000`.

5. Установить зависимости, создать таблицы и залить учебные данные. Команды из папки `server`:

```bash
cd server
npm install
npm run db:sync
npm run db:seed
npm run dev
```

`db:sync` создаёт таблицы по моделям (`sequelize.sync({ alter: true })`). `npm run dev` вызывает ту же синхронизацию при старте, если `NODE_ENV` не равен `production`. `db:seed` можно запускать повторно: те же пользователи и образцы не дублируются.

Сервер слушает `http://localhost:<PORT>` из `server/.env`.

## Учебные данные

| Email | Пароль |
|---|---|
| user1@example.com | password123 |
| user2@example.com | password123 |

Пять образцов: `SAM-2026-000124` … `SAM-2026-000128`, страны USA, Germany, France, UK. У `SAM-2026-000124` уже есть оценки user1 (5) и user2 (4). Повторный `POST` оценки от user1 на этот образец возвращает `400`.

## Куда зайти

Подставьте свой `PORT`.

| Адрес | Зачем |
|---|---|
| http://localhost:3000/ | короткая страница, она вызывает `/health` |
| http://localhost:3000/health | связь с MySQL: `{ "status": "ok", "database": "connected" }` |
| http://localhost:3000/api | список путей и ENUM |
| http://localhost:3000/api-docs | Swagger UI |

В Swagger кнопка **Authorize** принимает JWT. Схема: `Bearer <token>`. Токен берётся из `POST /auth/login`.

Ручные запросы без Swagger лежат в `server/http/*.http` (REST Client в VS Code или Cursor). В начале файла `@baseUrl` должен совпадать с `PORT`.

## Доступ

- Открытые пути: регистрация, вход, список и карточка образца, история, список документов, средняя оценка, `/health`, `/api`, `/api-docs`.
- `401` — нет или неверен заголовок `Authorization: Bearer <token>`.
- `403` — токен есть, но запись чужая. У образца владелец — `created_by`. У документа и оценки владелец — `user_id` этой строки.
- Ошибка всегда в виде `{ "error": "текст" }`.

## Основные пути

| Метод | Путь | Кто |
|---|---|---|
| POST | `/auth/register` | все |
| POST | `/auth/login` | все |
| GET | `/auth/me` | вошедший |
| POST | `/samples` | вошедший |
| GET | `/samples` | все |
| GET | `/samples/:id` | все |
| PUT | `/samples/:id` | владелец |
| DELETE | `/samples/:id` | владелец |
| PATCH | `/samples/:id/status` | владелец |
| GET | `/samples/:id/history` | все |
| POST | `/samples/:id/documents` | вошедший |
| GET | `/samples/:id/documents` | все |
| DELETE | `/documents/:id` | владелец файла |
| POST | `/samples/:id/ratings` | вошедший |
| GET | `/samples/:id/rating` | все |
| PUT | `/ratings/:id` | владелец оценки |
| DELETE | `/ratings/:id` | владелец оценки |

`POST /samples` принимает `name`, `type` и `country`. Код `SAM-YYYY-NNNNNN` и статус `RECEIVED` выдаёт сервер. Статус меняется только через `PATCH /samples/:id/status`, по цепочке `RECEIVED → REGISTERED → STORED → IN_ANALYSIS → ANALYZED → ARCHIVED → DESTROYED`. Неверный переход: `400` и текст `Invalid status transition`. Каждое изменение пишет строку в историю. События отдельно не редактируются.

`GET /samples` фильтрует точным совпадением `country`, `type`, `status`. Неизвестные `type`, `status` или `sort` дают `400`. Неизвестная страна даёт пустой массив и `200`. `sort`: `created_at` и `created_at_desc` — новые сверху, `created_at_asc` — старые сверху, `rating` и `rating_desc` — выше средняя оценка, `rating_asc` — ниже. Образцы без оценок в обоих порядках по рейтингу стоят в конце. Пример: `GET /samples?country=USA&sort=rating`.

Документ загружается как `multipart/form-data`, поле формы называется `file`. Принимаются PDF и изображения, размер до 5 МБ. Файл отдаётся по пути `/uploads/<имя>`.

Оценка — целое `score` от 1 до 5. Один пользователь оценивает образец один раз. Повтор: `400`, текст `You have already rated this sample`. После `DELETE` своей оценки можно поставить её снова. Средняя считается запросом к базе и приходит в карточке и в списке как `average_rating`. Если оценок нет, поле равно `null`, а `ratings_count` равен `0`.

## Тесты

Тесты ходят в отдельную базу `sample_tracking_test`, не в рабочую. MySQL должен быть запущен.

```sql
CREATE DATABASE sample_tracking_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON sample_tracking_test.* TO 'sample_tracking_user'@'localhost';
FLUSH PRIVILEGES;
```

Таблицы и сиды в тестовую базу, из папки `server`. Имя базы задаётся только на эти две команды:

Windows (PowerShell):

```powershell
npx cross-env DB_NAME=sample_tracking_test npm run db:sync
npx cross-env DB_NAME=sample_tracking_test npm run db:seed
npm test
```

macOS и Linux:

```bash
DB_NAME=sample_tracking_test npm run db:sync
DB_NAME=sample_tracking_test npm run db:seed
npm test
```

`npm test` запускает Jest. Файлы `server/tests/*.test.js` сами выставляют `DB_NAME=sample_tracking_test` до подключения приложения и в конце закрывают соединение. Сервер `npm run dev` для прогона не нужен.

## Документация

| Файл | Содержание |
|---|---|
| [docs/erd.md](docs/erd.md) | таблицы, связи, ENUM, переходы статуса |
| [docs/erd.drawio](docs/erd.drawio) | те же схемы в draw.io |
| [docs/api-contract.md](docs/api-contract.md) | тела запросов и коды ответов |
| `/api-docs` | тот же контракт в Swagger UI на запущенном сервере |
