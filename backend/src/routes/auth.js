import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const loginSchema = z.object({
    email: z.string().trim().email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
});

authRouter.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: 'Invalid login details',
            fields: parsed.error.issues.map(i => ({ field: i.path[0], message: i.message })),
        });
    }
    const { email, password } = parsed.data;

    const { rows } = await pool.query(
        'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
        [email.toLowerCase()]
    );
    const user = rows[0];

    // Same message for "no such email" and "wrong password" so attackers can't tell which emails exist
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) {
        return res.status(401).json({ error: 'Incorrect email or password' });
    }

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.cookie('token', token, {
        httpOnly: true,                                  // JavaScript in the browser can't read it
        sameSite: 'lax',                                 // basic protection against cross-site requests
        secure: process.env.NODE_ENV === 'production',   // HTTPS only when deployed
        maxAge: 8 * 60 * 60 * 1000,
    });

    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

authRouter.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ ok: true });
});

// Lets the frontend ask "who am I?" when the page loads
authRouter.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
});