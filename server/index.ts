import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import configRoutes from './routes/config';
import userRoutes from './routes/user';

dotenv.config();

const app = express();
// Создаем один экземпляр Prisma
export const prisma = new PrismaClient();

// РАЗРЕШАЕМ ВСЕМУ (для Vercel это безопаснее, так как фронт и бэк на одном домене)
app.use(cors());

app.use(express.json({ limit: '50mb' }));

/* =========================
   Routes
========================= */
// На Vercel прокси уже перенаправляет /api сюда, поэтому убедитесь, 
// что пути в роутах соответствуют или добавьте обработку префикса
app.use('/api', userRoutes);
app.use('/api/config', configRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'lumetrya-server' });
});

app.get('/api/db-check', async (req, res) => {
    try {
        await prisma.$connect();
        await prisma.$queryRaw`SELECT 1`;
        res.json({ ok: true, db: 'connected' });
    } catch (e: any) {
        res.status(500).json({ ok: false, error: e?.message });
    }
});

// Экспортируем приложение для Vercel (это ОЧЕНЬ важно)
export default app;

// Оставляем listen только для локальной разработки
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => console.log(`🚀 Local server on ${PORT}`));
}