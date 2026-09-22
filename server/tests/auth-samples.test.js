'use strict';

// До подключения app: иначе возьмётся DB_NAME из .env (рабочая база).
process.env.DB_NAME = 'sample_tracking_test';

const request = require('supertest');
const app = require('../app');

async function login(email) {
  const response = await request(app)
    .post('/auth/login')
    .send({ email, password: 'password123' });
  return response.body.token;
}

describe('образцы', () => {
  test('без токена сервер отвечает 401', async () => {
    const response = await request(app).get('/auth/me');
    expect(response.status).toBe(401);
  });
});