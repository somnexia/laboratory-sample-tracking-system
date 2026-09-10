'use strict';

/**
 * /samples — фазы 4–6 (карточка, статус, история, документы).
 *
 * GET  /samples, /:id, /:id/history, /:id/documents — без токена.
 * POST/PUT/DELETE/PATCH status — JWT; чужую карточку режет ownerOnly.
 * POST /:id/documents — JWT, образец должен существовать (владелец образца не обязателен).
 *
 * Более длинные пути объявляем раньше /:id.
 * DELETE /documents/:id — отдельный роутер, вторая половина фазы 6.
 */

const express = require('express');
const sampleController = require('../controllers/sampleController');
const documentController = require('../controllers/documentController');
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
router.get('/:id', sampleController.getById);
router.put('/:id', authRequired, sampleController.update);
router.delete('/:id', authRequired, sampleController.remove);

module.exports = router;
