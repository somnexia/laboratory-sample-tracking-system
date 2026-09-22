'use strict'

process.env.DB_NAME = 'sample_tracking_test';

const request = require('supertest');
const app = require("../app");

async function login(email) {
    const response = await request(app)
        .post('/auth/login')
        .send({ email, password: 'password123' });

    return response.body.token;
}

async function findByCode(sampleCode) {
    const response = await request(app).get('/samples')
    return response.body.find((row) => row.sample_code === sampleCode);
}

describe("rating and filter of list", () => {
    test("repeated rating of the same user -400", async () => {
        const token = await login('user1@example.com');
        const sample = await findByCode('SAM-2026-000124');

        const response = await request(app)
            .post('/samples/' + sample.id + '/ratings')
            .set('Authorization', 'Bearer ' + token)
            .send({ score: 5 });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("You have already rated this sample");

    });

});

test("USA list by decline in average rate", async () => {
    const response = await request(app)
        .get('/samples')
        .query({ country: 'USA', sort: 'rating' });
    expect(response.status).toBe(200);

    const codes = response.body.map((row) => row.sample_code);
    const ratedIndex = codes.indexOf('SAM-2026-000124');
    const unratedIndex = codes.indexOf("SAM-2026-000127");

    expect(ratedIndex).toBeGreaterThanOrEqual(0);
    expect(unratedIndex).toBe(response.body.length - 1);
    expect(ratedIndex).toBeLessThan(unratedIndex);

    expect(response.body[ratedIndex].average_rating).toBe(4.5);
    expect(response.body[unratedIndex].average_rating).toBeNull();
    
    response.body.forEach((row) => {
        expect(row.country).toBe('USA');
    });

});

