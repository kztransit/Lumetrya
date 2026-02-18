import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import configRoutes from './routes/config';
import userRoutes from './routes/user';

dotenv.config();

const app = express();
export const prisma = new PrismaClient();

const PORT = Number(process.env.PORT) || 8080;

// Логгер для проверки входящих запросов в логах Google
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

/* =========================
   Middleware (CORS)
========================= */
app.use(cors({
    // Явно указываем адрес вашего фронтенда
    origin: [
        'https://lumetrya-web-334812937330.europe-west1.run.app',
        'http://localhost:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 204 // Важно для корректной обработки preflight запросов
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

/* =========================
   Routes
========================= */
app.use('/api', userRoutes);
app.use('/api/config', configRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'lumetrya-server' });
});

app.get('/api/db-check', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ ok: true, db: 'connected' });
    } catch (e: any) {
        res.status(500).json({ ok: false, error: e?.message });
    }
});

app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('CRITICAL SERVER ERROR:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server started on port ${PORT}`);
});

const shutdown = async () => {
    await prisma.$disconnect();
    server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);