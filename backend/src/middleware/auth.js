import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';

export async function requireAuth(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: 'Please sign in to continue' });
    }

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return res.status(401).json({ error: 'Your session is invalid or expired. Please sign in again' });
    }

    // Look the user up in the database so a deleted user can't keep using an old token
    const { rows } = await pool.query(
        'SELECT id, name, email, role FROM users WHERE id = $1',
        [payload.sub]
    );
    if (rows.length === 0) {
        return res.status(401).json({ error: 'Your session is invalid. Please sign in again' });
    }

    req.user = rows[0];
    next();
}