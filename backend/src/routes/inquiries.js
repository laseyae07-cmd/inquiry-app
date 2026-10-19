import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { canSeeAll, canAccess } from '../services/access.js';

export const inquiriesRouter = Router();

// Every route in this file requires a signed-in user
inquiriesRouter.use(requireAuth);

const STATUSES = ['New', 'In Progress', 'Resolved'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createSchema = z.object({
    customer_name: z.string().trim().min(1, 'Customer name is required').max(100, 'Keep the name under 100 characters'),
    contact: z.string().trim().min(1, 'A way to contact the customer is required').max(200, 'Keep the contact under 200 characters'),
    subject: z.string().trim().min(1, 'Subject is required').max(150, 'Keep the subject under 150 characters'),
    description: z.string().trim().min(1, 'Description is required').max(2000, 'Keep the description under 2000 characters'),
});

function validationError(res, error) {
    return res.status(400).json({
        error: 'Please fix the highlighted fields',
        fields: error.issues.map(i => ({ field: i.path[0], message: i.message })),
    });
}

// CREATE an inquiry
inquiriesRouter.post('/', async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);
    const { customer_name, contact, subject, description } = parsed.data;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Duplicate policy: same person, same contact, same subject within 5 minutes
        const dup = await client.query(
            `SELECT id FROM inquiries
       WHERE created_by = $1 AND lower(contact) = lower($2) AND lower(subject) = lower($3)
         AND created_at > now() - interval '5 minutes'
       LIMIT 1`,
            [req.user.id, contact, subject]
        );
        if (dup.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: 'This looks like a duplicate of an inquiry you just submitted',
                existing_id: dup.rows[0].id,
            });
        }

        const { rows } = await client.query(
            `INSERT INTO inquiries (customer_name, contact, subject, description, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [customer_name, contact, subject, description, req.user.id]
        );
        const inquiry = rows[0];

        await client.query(
            `INSERT INTO inquiry_events (inquiry_id, user_id, from_status, to_status)
       VALUES ($1, $2, NULL, 'New')`,
            [inquiry.id, req.user.id]
        );

        await client.query('COMMIT');
        res.status(201).json({ inquiry });
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
});

// LIST inquiries (optional ?status=New and ?q=search text)
inquiriesRouter.get('/', async (req, res) => {
    const { status, q } = req.query;

    if (status !== undefined && !STATUSES.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(', ')}` });
    }

    // Escape % and _ so they are searched literally
    const search = typeof q === 'string' && q.trim()
        ? `%${q.trim().replace(/[\\%_]/g, '\\$&')}%`
        : null;

    const { rows } = await pool.query(
        `SELECT i.id, i.customer_name, i.contact, i.subject, i.status, i.version,
            i.created_at, i.updated_at, u.name AS created_by_name
     FROM inquiries i
     JOIN users u ON u.id = i.created_by
     WHERE ($1::boolean OR i.created_by = $2)
       AND ($3::text IS NULL OR i.status = $3)
       AND ($4::text IS NULL OR i.customer_name ILIKE $4 OR i.subject ILIKE $4 OR i.contact ILIKE $4)
     ORDER BY i.created_at DESC
     LIMIT 100`,
        [canSeeAll(req.user), req.user.id, status ?? null, search]
    );

    res.json({ inquiries: rows });
});

// OPEN one inquiry, with its history
inquiriesRouter.get('/:id', async (req, res) => {
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
        return res.status(400).json({ error: 'That is not a valid inquiry ID' });
    }

    const { rows } = await pool.query(
        `SELECT i.*, u.name AS created_by_name
     FROM inquiries i JOIN users u ON u.id = i.created_by
     WHERE i.id = $1`,
        [id]
    );
    const inquiry = rows[0];

    // Same answer whether it doesn't exist or you aren't allowed to see it
    if (!inquiry || !canAccess(req.user, inquiry)) {
        return res.status(404).json({ error: 'Inquiry not found' });
    }

    const events = await pool.query(
        `SELECT e.id, e.from_status, e.to_status, e.created_at, u.name AS user_name
     FROM inquiry_events e JOIN users u ON u.id = e.user_id
     WHERE e.inquiry_id = $1
     ORDER BY e.created_at ASC`,
        [id]
    );

    res.json({ inquiry, events: events.rows });
});