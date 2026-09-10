'use strict';

/**
 * Документы образца (фаза 6, загрузка и список).
 *
 * Владелец файла — кто загрузил (user_id), не created_by образца.
 * POST доступен любому с JWT, если образец существует (в контракте нет 403 на upload).
 * DELETE своего файла — вторая половина фазы 6.
 */

const path = require('path');
const fs = require('fs/promises');
const { SampleDocument, SampleEvent, sequelize } = require('../models');
const sampleService = require('./sampleService');
const { AppError } = require('./appError');

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

module.exports = {
  create,
  listBySample,
  publicDocument,
};
