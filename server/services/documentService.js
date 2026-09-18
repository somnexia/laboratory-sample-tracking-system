'use strict';

/**
 * Документы образца (фаза 6, упрощённая: POST + GET + DELETE).
 *
 * Владелец файла — кто загрузил (user_id), не created_by образца.
 * POST доступен любому с JWT, если образец существует.
 * DELETE — только user_id файла: строка, событие, байты с диска.
 */

const path = require('path');
const fs = require('fs/promises');
const { SampleDocument, SampleEvent, sequelize } = require('../models');
const sampleService = require('./sampleService');
const { AppError } = require('./appError');
const { UPLOADS_DIR } = require('../middleware/upload');

function truncateName(name) {
  const text = String(name || 'upload').trim() || 'upload';
  return text.length > 255 ? text.slice(0, 255) : text;
}

/**
 * В БД seed лежит «uploads/file.pdf», контракт отдаёт «/uploads/file.pdf» —
 * нормализуем, чтобы GET file_path сразу открывался в браузере.
 */
function toPublicPath(stored) {
  const value = String(stored || '').replace(/\\/g, '/');
  if (value.startsWith('/uploads/')) {
    return value;
  }
  if (value.startsWith('uploads/')) {
    return `/${value}`;
  }
  return `/uploads/${path.posix.basename(value)}`;
}

function publicDocument(doc) {
  return {
    id: doc.id,
    sample_id: doc.sample_id,
    user_id: doc.user_id,
    filename: doc.filename,
    file_path: toPublicPath(doc.file_path),
    created_at: doc.created_at,
  };
}

async function create(userId, sampleId, file) {
  if (!file) {
    throw new AppError(400, 'file is required');
  }

  const filename = truncateName(file.originalname);
  const file_path = `/uploads/${file.filename}`;

  try {
    const created = await sequelize.transaction(async (transaction) => {
      const row = await SampleDocument.create({
        sample_id: sampleId,
        user_id: userId,
        filename,
        file_path,
      }, { transaction });

      await SampleEvent.create({
        sample_id: sampleId,
        user_id: userId,
        action: 'DOCUMENT_UPLOADED',
        old_value: null,
        new_value: filename,
      }, { transaction });

      return row;
    });

    return publicDocument(created);
  } catch (error) {
    // Multer уже записал байты. Если INSERT не прошёл — не оставляем сироту на диске.
    if (file.path) {
      await fs.unlink(file.path).catch(() => {});
    }
    throw error;
  }
}

async function listBySample(sampleId) {
  const sample = await sampleService.findByIdOrThrow(sampleId);
  const rows = await SampleDocument.findAll({
    where: { sample_id: sample.id },
    order: [
      ['created_at', 'ASC'],
      ['id', 'ASC'],
    ],
  });
  return rows.map(publicDocument);
}

async function findByIdOrThrow(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) {
    throw new AppError(404, 'Document not found');
  }

  const doc = await SampleDocument.findByPk(numericId);
  if (!doc) {
    throw new AppError(404, 'Document not found');
  }

  return doc;
}

/**
 * Только basename: в file_path лежит URL /uploads/имя, не полный путь Windows.
 * path.relative не даёт выйти из uploads/, даже если в БД записали «../».
 */
function absoluteDiskPath(filePath) {
  const base = path.basename(String(filePath || ''));
  if (!base || base === '.' || base === '..') {
    return null;
  }

  const full = path.resolve(UPLOADS_DIR, base);
  const relative = path.relative(UPLOADS_DIR, full);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

  return full;
}

/**
 * Сначала БД (событие + строка), потом диск.
 * Если unlink не удался — 204 всё равно: записи уже нет, сирота в uploads gitignore.
 */
async function remove(userId, doc) {
  const diskPath = absoluteDiskPath(doc.file_path);
  const filename = doc.filename;
  const sampleId = doc.sample_id;

  await sequelize.transaction(async (transaction) => {
    await SampleEvent.create({
      sample_id: sampleId,
      user_id: userId,
      action: 'DOCUMENT_DELETED',
      old_value: filename,
      new_value: null,
    }, { transaction });

    await doc.destroy({ transaction });
  });

  if (diskPath) {
    await fs.unlink(diskPath).catch(() => {});
  }
}

module.exports = {
  create,
  listBySample,
  findByIdOrThrow,
  remove,
  publicDocument,
};
