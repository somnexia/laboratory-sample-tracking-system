'use strict';

/**
 * Создание / подгонка таблиц (фаза 2.9).
 *
 * В учёбе: sequelize.sync({ alter: true }).
 * Для сдачи и production лучше миграции в server/migrations/ — sync alter
 * может переписать ENUM и не подходит как единственная стратегия.
 *
 * Запуск: npm run db:sync
 * На старте dev-сервера sync вызывается из bin/www, если NODE_ENV !== production.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../models');

async function ensureScoreCheck() {
  const [rows] = await db.sequelize.query(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'sample_ratings'
       AND CONSTRAINT_NAME = 'chk_sample_ratings_score'`
  );

  if (rows.length === 0) {
    await db.sequelize.query(
      `ALTER TABLE sample_ratings
       ADD CONSTRAINT chk_sample_ratings_score CHECK (score >= 1 AND score <= 5)`
    );
    console.log('Added CHECK chk_sample_ratings_score');
  }
}

async function syncDatabase() {
  await db.sequelize.authenticate();
  console.log('MySQL connection OK');

  await db.sequelize.sync({ alter: true });
  console.log('Tables synced (alter: true)');

  await ensureScoreCheck();
}

if (require.main === module) {
  syncDatabase()
    .then(() => {
      console.log('db:sync finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('db:sync failed:', error.message);
      process.exit(1);
    });
}

module.exports = { syncDatabase, ensureScoreCheck };
