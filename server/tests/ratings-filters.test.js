 'use strict'

 process.env.DB_NAME = 'sample_tracking_test';

 const request = require('supertest');
 const app = require("../app");

async function login(email){
    const response = await request(app)
        .post('/auth/login')
        .send({email, password: 'password123'});

    return response.body.token;
}

async function findByCode(sampleCode){
    const responce = await request(app).get('/sample')
    return responce.body.find((row)=> row.sample_code === sampleCode);
}

describe("rating and filter of list",() => {
    test("repeated rating of the same user -400", async() => {
        const token = await login('user1@example.com');
        const sample = await findByCode('SAM-2026-000124');

        const responce =  await request(app)
            .post('/samples' +  sample.id + 'ratings')
            .set('Authorization', 'Bearer' + token)
            .send({score:  5});
        
        expect(responce.status).toBe(400);
        expect(responce.body.error).toBe("You have already rated this sample");

    });

});