import express from 'express';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth.js';
import { inquiriesRouter } from './routes/inquiries.js'; // NEW

export const app = express();

app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/inquiries', inquiriesRouter); // NEW

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Request body is not valid JSON' });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server' });
});