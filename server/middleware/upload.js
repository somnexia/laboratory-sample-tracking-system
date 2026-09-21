'use strict';

/**
 * Приём бинарных файлов (PDF / изображения) через multer.
 *
 * Express.json() читает только текстовый JSON. Файл приходит как
 * multipart/form-data; multer вытаскивает поле формы и пишет байты на диск.
 *
 * Состав модуля:
 *   UPLOADS_DIR   — папка server/uploads на диске;
 *   EXT_BY_MIME   — какие Content-Type принимаем;
 *   fileFilter    — отказ → AppError 400 до записи;
 *   storage       — куда и под каким именем сохранить;
 *   uploadDocument — готовый middleware .single('file') для роутера.
 *
 * Имя на диске ≠ исходное filename: иначе два receipt.pdf перезапишут друг друга,
 * а путь «../../» мог бы выйти из uploads/.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { AppError } = require('../services/appError');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** MIME → расширение файла на диске. */
const EXT_BY_MIME = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/** Расширение: из имени клиента, иначе из MIME. */
function extensionFor(file) {
  const fromName = path.extname(file.originalname || '').toLowerCase();
  if (/^\.(pdf|jpe?g|png|gif|webp)$/.test(fromName)) {
    return fromName === '.jpeg' ? '.jpg' : fromName;
  }
  return EXT_BY_MIME[file.mimetype] || '';
}

/**
 * Фильтр multer: true — принять, иначе callback с ошибкой.
 * AppError(400) поймает errorHandler (у ошибки есть .status).
 */
function fileFilter(req, file, cb) {
  if (EXT_BY_MIME[file.mimetype]) {
    cb(null, true);
    return;
  }
  cb(new AppError(400, 'Only images and PDF are allowed'));
}

/**
 * Куда писать и как назвать файл на диске.
 * destination — всегда UPLOADS_DIR;
 * filename — timestamp + случайные байты + расширение.
 */
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
 * Один файл, имя поля формы строго `file` (контракт API).
 * Другое имя поля → MulterError LIMIT_UNEXPECTED_FILE → 400 в errorHandler.
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
