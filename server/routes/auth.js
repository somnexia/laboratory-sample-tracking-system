'use strict';

/**
 * Маршруты /auth
 *
 * POST /auth/register, POST /auth/login — открытые (без токена).
 * GET  /auth/me — только с JWT: сначала authRequired, потом контроллер.
 */

const express = require('express');
const authController = require('../controllers/authController');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authRequired, authController.me);

module.exports = router;
