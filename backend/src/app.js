import express from 'express';
import cookieParser from 'cookie-parser';

export const app = express();

app.use(express.json());
app.use(cookieParser());

// A simple route to check the server is alive
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Any /api URL that doesn't exist gets a clear JSON 404
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Catches any error that happens anywhere in the app
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Request body is not valid JSON' });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server' });
});