import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { canTransition } from '../src/services/statusRules.js';

const PASSWORD = 'Password123!';

// Signs in and returns an "agent" that remembers the login cookie
async function loginAs(email) {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/login').send({ email, password: PASSWORD });
    expect(res.status).toBe(200);
    return agent;
}

// Unique subject each run so the duplicate rule never interferes
const validInquiry = () => ({
    customer_name: 'TEST_Customer',
    contact: '0771234567',
    subject: `Test subject ${Date.now()}-${Math.random()}`,
    description: 'Created by an automated test.',
});

let staff1, staff2, admin;

beforeAll(async () => {
    staff1 = await loginAs('staff1@example.com');
    staff2 = await loginAs('staff2@example.com');
    admin = await loginAs('admin@example.com');
});

afterAll(async () => {
    // Remove test data (history rows are deleted automatically) and close the DB connection
    await pool.query("DELETE FROM inquiries WHERE customer_name LIKE 'TEST_%'");
    await pool.end();
});

describe('status rules (pure logic)', () => {
    it('allows New -> In Progress and Resolved -> In Progress (reopen)', () => {
        expect(canTransition('New', 'In Progress')).toBe(true);
        expect(canTransition('Resolved', 'In Progress')).toBe(true);
    });

    it('rejects skipping straight from New to Resolved', () => {
        expect(canTransition('New', 'Resolved')).toBe(false);
    });
});

describe('authentication', () => {
    it('rejects requests with no login cookie', async () => {
        const res = await request(app).get('/api/inquiries');
        expect(res.status).toBe(401);
    });
});

describe('validation', () => {
    it('rejects an inquiry with missing fields and names the bad fields', async () => {
        const res = await staff1
            .post('/api/inquiries')
            .send({ customer_name: '', contact: '0771234567', subject: '', description: 'hi' });

        expect(res.status).toBe(400);
        const badFields = res.body.fields.map(f => f.field);
        expect(badFields).toContain('customer_name');
        expect(badFields).toContain('subject');
    });

    it('rejects a duplicate submitted twice in a row', async () => {
        const body = validInquiry();
        const first = await staff1.post('/api/inquiries').send(body);
        const second = await staff1.post('/api/inquiries').send(body);

        expect(first.status).toBe(201);
        expect(second.status).toBe(409);
    });

    it('returns 400 for an invalid inquiry ID', async () => {
        const res = await staff1.get('/api/inquiries/not-a-real-id');
        expect(res.status).toBe(400);
    });
});

describe('access rule', () => {
    it('hides one staff member\'s inquiry from another (404), but admin can see it', async () => {
        const created = await staff1.post('/api/inquiries').send(validInquiry());
        const id = created.body.inquiry.id;

        // Owner can open it
        expect((await staff1.get(`/api/inquiries/${id}`)).status).toBe(200);

        // Another staff member gets 404 when opening the direct link
        expect((await staff2.get(`/api/inquiries/${id}`)).status).toBe(404);

        // ...cannot change its status either
        const change = await staff2
            .patch(`/api/inquiries/${id}/status`)
            .send({ status: 'In Progress', version: 1 });
        expect(change.status).toBe(404);

        // ...and does not see it in their list
        const list = await staff2.get('/api/inquiries');
        expect(list.body.inquiries.some(i => i.id === id)).toBe(false);

        // Admin can see everything
        expect((await admin.get(`/api/inquiries/${id}`)).status).toBe(200);
    });
});

describe('status changes', () => {
    it('rejects an invalid transition with a clear code', async () => {
        const created = await staff1.post('/api/inquiries').send(validInquiry());
        const { id, version } = created.body.inquiry;

        const res = await staff1.patch(`/api/inquiries/${id}/status`).send({ status: 'Resolved', version });

        expect(res.status).toBe(409);
        expect(res.body.code).toBe('INVALID_TRANSITION');
    });

    it('rejects a change made from a stale version (two-tab case)', async () => {
        const created = await staff1.post('/api/inquiries').send(validInquiry());
        const { id, version } = created.body.inquiry;

        // "Tab A" changes the status first
        const first = await staff1.patch(`/api/inquiries/${id}/status`).send({ status: 'In Progress', version });
        expect(first.status).toBe(200);
        expect(first.body.inquiry.version).toBe(version + 1);

        // "Tab B" still holds the old version and tries to change it
        const stale = await staff1.patch(`/api/inquiries/${id}/status`).send({ status: 'In Progress', version });
        expect(stale.status).toBe(409);
        expect(stale.body.code).toBe('STALE_VERSION');
    });
});