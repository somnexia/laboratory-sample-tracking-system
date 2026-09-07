'use strict';

/**
 * /samples — первая половина фазы 4.
 *
 * GET  /samples и GET /samples/:id — без токена (как GET /landmarks в ТЗ).
 * POST /samples — только JWT: иначе любой мог бы создать запись «от чужого имени».
 *
 * Порядок маршрутов: сначала '/', потом '/:id', чтобы «samples» не съел id.
 */

const express = require('express');
const sampleController = require('../controllers/sampleController');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/', authRequired, sampleController.create);
router.get('/', sampleController.list);
router.get('/:id', sampleController.getById);

module.exports = router;
