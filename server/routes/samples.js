'use strict';

/**
 * /samples — фазы 4 и 5 (первая половина: статус, без history).
 *
 * GET  /samples и GET /samples/:id — без токена.
 * POST/PUT/DELETE — JWT + для изменения владелец.
 * PATCH /samples/:id/status — JWT + владелец, один шаг по карте статусов.
 *
 * /:id/status вешаем раньше /:id: иначе при появлении GET /:id/history
 * более общий шаблон не должен перехватывать «хвост» пути.
 * GET /:id/history — вторая половина фазы 5.
 */

const express = require('express');
const sampleController = require('../controllers/sampleController');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/', authRequired, sampleController.create);
router.get('/', sampleController.list);
router.patch('/:id/status', authRequired, sampleController.changeStatus);
router.get('/:id', sampleController.getById);
router.put('/:id', authRequired, sampleController.update);
router.delete('/:id', authRequired, sampleController.remove);

module.exports = router;
