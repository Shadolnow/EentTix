import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sendOtp from './api/send-otp.js';
import verifyOtp from './api/verify-otp.js';
import sendTicket from './api/send-ticket.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Adapter for Vercel functions (req, res) => ... to Express
const adapt = (handler) => async (req, res) => {
    try {
        await handler(req, res);
    } catch (err) {
        console.error(err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};

app.all('/api/send-otp', adapt(sendOtp));
app.all('/api/verify-otp', adapt(verifyOtp));
app.all('/api/send-ticket', adapt(sendTicket));

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Local API Server running on http://localhost:${PORT}`);
});
