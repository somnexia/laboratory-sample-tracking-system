'use strict';

/**
 * Повторно безопасный seed (фаза 2.10).
 *
 * 2 пользователя: user1, user2 (пароль password123, как в api-contract.md).
 * 5 образцов с разными country / status / type.
 * Документы, оценки и события SAMPLE_CREATED — findOrCreate, без дублей.
 *
 * Запуск: npm run db:seed  (после npm run db:sync)
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../models');

const SEED_PASSWORD = 'password123';

const USERS = [
  { username: 'user1', email: 'user1@example.com', password: SEED_PASSWORD },
  { username: 'user2', email: 'user2@example.com', password: SEED_PASSWORD },
];

function sampleRows(user1Id, user2Id) {
  return [
    {
      sample_code: 'SAM-2026-000124',
      name: 'Blood sample',
      type: 'BIOLOGICAL',
      description: 'Whole blood, EDTA',
      status: 'RECEIVED',
      country: 'USA',
      location: 'Receiving Area',
      research_id: 15,
      experiment_id: 31,
      created_by: user1Id,
    },
    {
      sample_code: 'SAM-2026-000125',
      name: 'Water sample',
      type: 'WATER',
      description: 'Tap water, 500 ml',
      status: 'STORED',
      country: 'Germany',
      location: 'Freezer FZ-03',
      research_id: 15,
      experiment_id: null,
      created_by: user1Id,
    },
    {
      sample_code: 'SAM-2026-000126',
      name: 'Soil sample',
      type: 'SOIL',
      description: 'Topsoil, site A',
      status: 'IN_ANALYSIS',
      country: 'France',
      location: 'Laboratory A',
      research_id: 16,
      experiment_id: 32,
      created_by: user2Id,
    },
    {
      sample_code: 'SAM-2026-000127',
      name: 'DNA extract',
      type: 'DNA',
      description: 'Extract after PCR prep',
      status: 'ANALYZED',
      country: 'USA',
      location: 'Freezer FZ-03',
      research_id: 15,
      experiment_id: 31,
      created_by: user1Id,
    },
    {
      sample_code: 'SAM-2026-000128',
      name: 'Tissue sample',
      type: 'TISSUE',
      description: 'Archived after project close',
      status: 'ARCHIVED',
      country: 'UK',
      location: 'Archive shelf 2',
      research_id: null,
      experiment_id: null,
      created_by: user2Id,
    },
  ];
}

function ensureSeedFile(filename, contents) {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  const fullPath = path.join(uploadsDir, filename);
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, contents);
  }
  return path.posix.join('uploads', filename);
}

async function seedUsers() {
  const created = {};
  for (const row of USERS) {
    const [user] = await db.User.findOrCreate({
      where: { email: row.email },
      defaults: row,
    });
    created[row.username] = user;
    console.log('User', user.email, 'id=', user.id);
  }
  return created;
}

async function seedSamples(users) {
  const byCode = {};
  for (const row of sampleRows(users.user1.id, users.user2.id)) {
    const [sample] = await db.Sample.findOrCreate({
      where: { sample_code: row.sample_code },
      defaults: row,
    });
    byCode[sample.sample_code] = sample;
    console.log('Sample', sample.sample_code, sample.status);
  }
  return byCode;
}

async function seedDocuments(users, samples) {
  const receiptPath = ensureSeedFile('seed-receipt.pdf', '%PDF-1.1 seed receipt\n');
  const labelPath = ensureSeedFile('seed-label.txt', 'SAM-2026-000125 label\n');

  const rows = [
    {
      sample_id: samples['SAM-2026-000124'].id,
      user_id: users.user1.id,
      filename: 'receipt.pdf',
      file_path: receiptPath,
    },
    {
      sample_id: samples['SAM-2026-000125'].id,
      user_id: users.user1.id,
      filename: 'label.txt',
      file_path: labelPath,
    },
  ];

  for (const row of rows) {
    const [, created] = await db.SampleDocument.findOrCreate({
      where: { sample_id: row.sample_id, filename: row.filename },
      defaults: row,
    });
    if (created) {
      console.log('Document', row.filename);
    }
  }
}

async function seedRatings(users, samples) {
  const rows = [
    {
      sample_id: samples['SAM-2026-000124'].id,
      user_id: users.user1.id,
      score: 5,
      comment: 'Sample suitable for analysis',
    },
    {
      sample_id: samples['SAM-2026-000124'].id,
      user_id: users.user2.id,
      score: 4,
      comment: 'Good quality',
    },
    {
      sample_id: samples['SAM-2026-000125'].id,
      user_id: users.user1.id,
      score: 3,
      comment: 'Acceptable',
    },
  ];

  for (const row of rows) {
    const [, created] = await db.SampleRating.findOrCreate({
      where: { sample_id: row.sample_id, user_id: row.user_id },
      defaults: row,
    });
    if (created) {
      console.log('Rating sample', row.sample_id, 'user', row.user_id, 'score', row.score);
    }
  }
}

async function seedEvents(users, samples) {
  const rows = [
    {
      sample_id: samples['SAM-2026-000124'].id,
      user_id: users.user1.id,
      action: 'SAMPLE_CREATED',
      old_value: null,
      new_value: 'SAM-2026-000124',
    },
    {
      sample_id: samples['SAM-2026-000125'].id,
      user_id: users.user1.id,
      action: 'SAMPLE_CREATED',
      old_value: null,
      new_value: 'SAM-2026-000125',
    },
    {
      sample_id: samples['SAM-2026-000125'].id,
      user_id: users.user1.id,
      action: 'STATUS_CHANGED',
      old_value: 'RECEIVED',
      new_value: 'STORED',
    },
    {
      sample_id: samples['SAM-2026-000126'].id,
      user_id: users.user2.id,
      action: 'SAMPLE_CREATED',
      old_value: null,
      new_value: 'SAM-2026-000126',
    },
    {
      sample_id: samples['SAM-2026-000127'].id,
      user_id: users.user1.id,
      action: 'SAMPLE_CREATED',
      old_value: null,
      new_value: 'SAM-2026-000127',
    },
    {
      sample_id: samples['SAM-2026-000128'].id,
      user_id: users.user2.id,
      action: 'SAMPLE_CREATED',
      old_value: null,
      new_value: 'SAM-2026-000128',
    },
    {
      sample_id: samples['SAM-2026-000124'].id,
      user_id: users.user1.id,
      action: 'RATING_ADDED',
      old_value: null,
      new_value: '5',
    },
    {
      sample_id: samples['SAM-2026-000124'].id,
      user_id: users.user1.id,
      action: 'DOCUMENT_UPLOADED',
      old_value: null,
      new_value: 'receipt.pdf',
    },
  ];

  for (const row of rows) {
    const [, created] = await db.SampleEvent.findOrCreate({
      where: {
        sample_id: row.sample_id,
        user_id: row.user_id,
        action: row.action,
        new_value: row.new_value,
      },
      defaults: row,
    });
    if (created) {
      console.log('Event', row.action, row.new_value);
    }
  }
}

async function seed() {
  await db.sequelize.authenticate();
  const users = await seedUsers();
  const samples = await seedSamples(users);
  await seedDocuments(users, samples);
  await seedRatings(users, samples);
  await seedEvents(users, samples);
}

if (require.main === module) {
  seed()
    .then(() => {
      console.log('db:seed finished (safe to run again)');
      process.exit(0);
    })
    .catch((error) => {
      console.error('db:seed failed:', error.message);
      process.exit(1);
    });
}

module.exports = { seed };
