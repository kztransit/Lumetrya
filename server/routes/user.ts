import express from 'express';
import { prisma } from '../index';

const router = express.Router();

// 🆔 Используем фиксированный ID для демо-пользователя
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

// Вспомогательная функция для инициализации юзера, если его нет
async function ensureUser() {
    return await prisma.user.upsert({
        where: { email: 'demo@lumetrya.com' },
        update: {},
        create: {
            id: DEFAULT_USER_ID,
            email: 'demo@lumetrya.com',
            name: 'Demo User',
            password: 'hashed_password_here',
            initials: 'DU'
        }
    });
}

// 📥 ПОЛУЧЕНИЕ ДАННЫХ (Сборка монолита из таблиц)
router.get('/user-data', async (req, res) => {
    try {
        await ensureUser();
        const user = await prisma.user.findUnique({
            where: { id: DEFAULT_USER_ID },
            include: {
                companyProfile: true,
                reports: { orderBy: { createdAt: 'desc' } }, // Сортируем для удобства
                proposals: true,
                campaigns: true,
                links: true,
                files: true,
                payments: true,
                otherReports: true
            }
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        // Превращаем реляционные данные обратно в формат, который ждет фронтенд
        res.json({
            companyProfile: user.companyProfile || {},
            reports: user.reports || [],
            proposals: user.proposals || [],
            campaigns: user.campaigns || [],
            links: user.links || [],
            files: user.files || [],
            payments: user.payments || [],
            otherReports: user.otherReports || [],
            knowledgeBase: []
        });
    } catch (error) {
        console.error("Fetch error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// 📤 СОХРАНЕНИЕ ДАННЫХ (Распределение монолита по таблицам)
router.post('/user-data', async (req, res) => {
    const data = req.body;

    // Проверка на пустой body, чтобы не падать с SyntaxError
    if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ error: "Empty data received" });
    }

    try {
        await ensureUser();

        // Обработка транзакции с явным указанием типа (tx: any) для фикса ошибки билда
        await prisma.$transaction(async (tx: any) => {
            // 1. Профиль компании
            if (data.companyProfile) {
                await tx.companyProfile.upsert({
                    where: { userId: DEFAULT_USER_ID },
                    update: { ...data.companyProfile },
                    create: { ...data.companyProfile, userId: DEFAULT_USER_ID }
                });
            }

            // 2. Обновление отчетов (Delete + Create)
            if (Array.isArray(data.reports)) {
                await tx.report.deleteMany({ where: { userId: DEFAULT_USER_ID } });
                if (data.reports.length > 0) {
                    await tx.report.createMany({
                        data: data.reports.map((r: any) => ({ ...r, userId: DEFAULT_USER_ID }))
                    });
                }
            }

            // 3. Коммерческие предложения (с фиксом дат)
            if (Array.isArray(data.proposals)) {
                await tx.commercialProposal.deleteMany({ where: { userId: DEFAULT_USER_ID } });
                if (data.proposals.length > 0) {
                    await tx.commercialProposal.createMany({
                        data: data.proposals.map((p: any) => ({
                            ...p,
                            userId: DEFAULT_USER_ID,
                            date: p.date ? new Date(p.date) : new Date(),
                            invoiceDate: p.invoiceDate ? new Date(p.invoiceDate) : null,
                            paymentDate: p.paymentDate ? new Date(p.paymentDate) : null
                        }))
                    });
                }
            }

            // 4. Платежи (с фиксом дат)
            if (Array.isArray(data.payments)) {
                await tx.payment.deleteMany({ where: { userId: DEFAULT_USER_ID } });
                if (data.payments.length > 0) {
                    await tx.payment.createMany({
                        data: data.payments.map((p: any) => ({
                            ...p,
                            userId: DEFAULT_USER_ID,
                            lastPaymentDate: p.lastPaymentDate ? new Date(p.lastPaymentDate) : new Date(),
                            nextPaymentDate: p.nextPaymentDate ? new Date(p.nextPaymentDate) : new Date()
                        }))
                    });
                }
            }

            // 5. Кампании
            if (Array.isArray(data.campaigns)) {
                await tx.adCampaign.deleteMany({ where: { userId: DEFAULT_USER_ID } });
                if (data.campaigns.length > 0) {
                    await tx.adCampaign.createMany({
                        data: data.campaigns.map((c: any) => ({ ...c, userId: DEFAULT_USER_ID }))
                    });
                }
            }
        });

        res.json({ success: true });
    } catch (error: any) {
        console.error("Save error details:", error);
        res.status(500).json({
            error: "Failed to sync with database",
            details: error.message
        });
    }
});

export default router;