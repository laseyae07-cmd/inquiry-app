import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

const users = [
    ['Admin User', 'admin@example.com', 'admin'],
    ['Staff One', 'staff1@example.com', 'staff'],
    ['Staff Two', 'staff2@example.com', 'staff'],
];
const hash = await bcrypt.hash('Password123!', 10);

for (const [name, email, role] of users) {
    await pool.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4)
     ON CONFLICT (email) DO NOTHING`, [name, email, hash, role]);
}
console.log('seeded');
await pool.end();