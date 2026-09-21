'use strict';

/**
 * Роутер /samples — привязка URL к handler'ам.
 *
 * Состав:
 *   express.Router() — мини-приложение для путей после /samples;
 *   router.METHOD(path, ...middleware, handler) — цепочка слева направо;
 *   app.use('/samples', этот роутер) в app.js.
 *
 * Middleware на маршрутах:
 *   authRequired   — JWT → req.user (middleware/auth.js);
 *   uploadDocument — multer, поле file → uploads/ (только POST documents);
 *   requireSample  — образец существует до записи файла на диск.
 *
 * Длинные пути (/:id/history, /:id/rating, /:id/documents) объявляем раньше /:id,
 * иначе Express принял бы «history» за значение param id.
 *
 * GET / — открытый список; query country/type/status/sort читает сервис.
 */

const express = require('express');
const sampleController = require('../controllers/sampleController');
const documentController = require('../controllers/documentController');
const ratingController = require('../controllers/ratingController');
const { authRequired } = require('../middleware/auth');
const { uploadDocument } = require('../middleware/upload');

const router = express.Router();

router.post('/', authRequired, sampleController.create);
router.get('/', sampleController.list);
router.patch('/:id/status', authRequired, sampleController.changeStatus);
router.get('/:id/history', sampleController.getHistory);
router.post(
  '/:id/documents',
  authRequired,
  documentController.requireSample,
  uploadDocument,
  documentController.create
);
router.get('/:id/documents', documentController.list);
router.post('/:id/ratings', authRequired, ratingController.create);
router.get('/:id/rating', ratingController.getAverage);
router.get('/:id', sampleController.getById);
router.put('/:id', authRequired, sampleController.update);
router.delete('/:id', authRequired, sampleController.remove);

module.exports = router;
