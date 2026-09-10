'use strict';

/**
 * Точка сборки Express.
 * Порядок важен: JSON-парсер → статическая консоль → роуты → 404 → errorHandler.
 * /auth подключается отдельно: часть путей открытая, GET /me закрыт внутри роутера.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const samplesRouter = require('./routes/samples');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(logger('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// Файлы с диска: GET /uploads/<имя> → server/uploads/<имя>. Не путать с JSON API.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/', indexRouter);
// Открытые register/login и защищённый GET /auth/me
app.use('/auth', authRouter);
// GET карточки, history и список документов — открытые.
// POST/PUT/DELETE/PATCH status и POST documents — JWT.
app.use('/samples', samplesRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
