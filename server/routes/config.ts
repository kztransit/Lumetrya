
import express from 'express';
import { prisma } from '../index';

const router = express.Router();

// Get API Key (masked)
router.get('/gemini-key', async (req, res) => {
    try {
        const config = await prisma.systemConfig.findUnique({
            where: { key: 'GEMINI_API_KEY' }
        });
        if (config) {
            // Return masked key for security
            const masked = config.value.replace(/.(?=.{4})/g, '*');
            res.json({ configured: true, maskedKey: masked });
        } else {
            res.json({ configured: false });
        }
    } catch (error) {
        console.error('Error fetching API key:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get API Key (raw for backend usage)
router.get('/gemini-key-raw', async (req, res) => {
    try {
        const config = await prisma.systemConfig.findUnique({
            where: { key: 'GEMINI_API_KEY' }
        });
        if (config) {
            res.json({ apiKey: config.value });
        } else {
            // Fallback to environment variable if not in database
            const envKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
            if (envKey) {
                res.json({ apiKey: envKey });
            } else {
                res.status(404).json({ error: 'Not configured' });
            }
        }
    } catch (error) {
        console.error('Error fetching raw API key:', error);
        // Fallback to environment variable on database error
        const envKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
        if (envKey) {
            res.json({ apiKey: envKey });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Update API Key
router.post('/gemini-key', async (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) {
        return res.status(400).json({ error: 'API Key is required' });
    }

    try {
        await prisma.systemConfig.upsert({
            where: { key: 'GEMINI_API_KEY' },
            update: { value: apiKey },
            create: { key: 'GEMINI_API_KEY', value: apiKey }
        });
        res.json({ success: true, message: 'API Key updated successfully' });
    } catch (error) {
        console.error('Error updating API key:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
