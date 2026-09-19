'use strict';

/**
 * /ratings — изменение и удаление своей оценки (фаза 7).
 *
 * POST живёт под /samples/:id/ratings: оценка всегда про образец.
 * PUT/DELETE вынесены сюда: id в URL — id оценки, не образца
 * (как /documents/:id и Photo в ТЗ).
 */

const express = require('express');
const ratingController = require('../controllers/ratingController');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.put('/:id', authRequired, ratingController.update);
router.delete('/:id', authRequired, ratingController.remove);

module.exports = router;
