'use strict';

/**
 * /samples — фаза 4.
 *
 * GET  /samples и GET /samples/:id — без токена (как GET /landmarks в ТЗ).
 * POST /samples — JWT: иначе любой создал бы запись «от чужого имени».
 * PUT  /samples/:id и DELETE /samples/:id — JWT + владелец (403 чужому).
 *
 * PATCH /:id/status и GET /:id/history здесь не вешаем — фаза 5.
 * Порядок: сначала '/', потом '/:id', чтобы литерал не съел id.
 */

const express = require('express');
const sampleController = require('../controllers/sampleController');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/', authRequired, sampleController.create);
router.get('/', sampleController.list);
router.get('/:id', sampleController.getById);
router.put('/:id', authRequired, sampleController.update);
router.delete('/:id', authRequired, sampleController.remove);

module.exports = router;
