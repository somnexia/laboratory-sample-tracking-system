'use strict';

/**
 * Проверка обязательных переменных окружения перед стартом сервера.
 * Запускается скриптом `npm run check-env` (и из `npm run dev` / `npm start`).
 *
 * Файл: server/.env  (шаблон — server/.env.example)
 * Без валидного JWT_SECRET и DB_* API не должен подниматься.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/** Имена, без которых приложение не имеет смысла запускать. */
const requiredVars = [
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
];

const missingVars = requiredVars.filter((name) => !process.env[name]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

if (Number.isNaN(Number(process.env.PORT))) {
  console.error('PORT must be a number');
  process.exit(1);
}

if (Number.isNaN(Number(process.env.DB_PORT))) {
  console.error('DB_PORT must be a number');
  process.exit(1);
}

// Слишком короткий секрет легко подобрать; 10 символов — нижняя граница для учёбы.
if (process.env.JWT_SECRET.length < 10) {
  console.error('JWT_SECRET is too short (min 10 characters)');
  process.exit(1);
}

console.log('All required environment variables are valid.');
