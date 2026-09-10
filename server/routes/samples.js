'use strict';

/**
 * /samples — фазы 4 и 5 (карточка, статус, история).
 *
 * GET  /samples, GET /samples/:id, GET /samples/:id/history — без токена.
 * POST/PUT/DELETE — JWT + для изменения владелец.
 * PATCH /samples/:id/status — JWT + владелец, один шаг по карте статусов.
 *
 * Более длинные пути (/:id/status, /:id/history) объявляем раньше /:id,
 * чтобы «history» не попал в param id, если кто-то позже добавит catch-all.
 *
 * Роутов PUT/PATCH/DELETE /events нет: лента INSERT-only (фаза 5.7).
 */

const express = require('express');
const sampleController = require('../controllers/sampleController');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/', authRequired, sampleController.create);
router.get('/', sampleController.list);
router.patch('/:id/status', authRequired, sampleController.changeStatus);
router.get('/:id/history', sampleController.getHistory);
router.get('/:id', sampleController.getById);
router.put('/:id', authRequired, sampleController.update);
router.delete('/:id', authRequired, sampleController.remove);

module.exports = router;
