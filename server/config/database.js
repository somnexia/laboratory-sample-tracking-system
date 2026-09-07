'use strict';

/**
 * Подключение Sequelize к MySQL (фаза 2.1).
 *
 * Читает DB_* из server/.env. Само подключение к серверу MySQL здесь
 * не открывается — клиент создаётся лениво при первом запросе.
 *
 * Синхронизация таблиц (sync / миграции) — пункт 2.9, не этот файл.
 * Модели подключатся через models/index.js в пункте 2.8.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    // SQL в консоль только при NODE_ENV=development
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      underscored: true,
    },
  }
);

module.exports = sequelize;
