'use strict';

/**
 * Загрузка файлов образца (фаза 6, первая половина).
 *
 * JSON-парсер Express не читает файлы: клиент шлёт multipart/form-data,
 * multer вытаскивает поле `file` и кладёт байты на диск.
 *
 * Имя на диске не равно исходному: иначе два «report.pdf» перезапишут друг друга,
 * а «../../etc/passwd» мог бы выйти из папки uploads/.
 *
 * DELETE файла — вторая половина фазы 6.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { AppError } = require('../services/appError');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** MIME, которые принимает учебный API (ТЗ: картинки и PDF). */
const EXT_BY_MIME = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function extensionFor(file) {
  const fromName = path.extname(file.originalname || '').toLowerCase();
  if (/^\.(pdf|jpe?g|png|gif|webp)$/.test(fromName)) {
    return fromName === '.jpeg' ? '.jpg' : fromName;
  }
  return EXT_BY_MIME[file.mimetype] || '';
}

function fileFilter(req, file, cb) {
  if (EXT_BY_MIME[file.mimetype]) {
    cb(null, true);
    return;
  }
  cb(new AppError(400, 'Only images and PDF are allowed'));
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename(req, file, cb) {
    const ext = extensionFor(file);
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

/**
 * Один файл, поле формы строго `file` (как в api-contract.md).
 * Другое имя поля → MulterError LIMIT_UNEXPECTED_FILE → 400.
 */
const uploadDocument = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
}).single('file');

module.exports = {
  UPLOADS_DIR,
  MAX_FILE_SIZE,
  uploadDocument,
};
