'use strict';

/**
 * /documents — только удаление своего файла (фаза 6).
 *
 * Список и загрузка живут под /samples/:id/documents: файл всегда про образец.
 * DELETE вынесен сюда, как Photo в ТЗ: /photos/:id, не /landmarks/:id/photos/:id.
 */

const express = require('express');
const documentController = require('../controllers/documentController');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.delete('/:id', authRequired, documentController.remove);

module.exports = router;
