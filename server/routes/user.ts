import express from 'express';
import { prisma } from '../index';

const router = express.Router();

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

async function ensureUser() {
    return await prisma.user.upsert({
        where: { email: 'demo@lumetrya.com' },
        update: {},
        create: {
            id: DEFAULT_USER_ID,
            email: 'demo@lumetrya.com',
            name: 'Demo User',
            password: 'hashed_password_here',
            initials: 'DU',
        },
    });
}

// UI CompanyProfile может содержать: details/contacts/employees
function mapCompanyProfileFromUI(raw: any) {
    const cp = raw ?? {};
    const details = cp.details ?? {};
    const contacts = cp.contacts ?? {};

    const companyName =
        typeof cp.companyName === 'string' && cp.companyName.trim()
            ? cp.companyName.trim()
            : '—';

    const phones =
        Array.isArray(contacts.phones) ? contacts.phones :
            Array.isArray(cp.phones) ? cp.phones :
                [];

    const websites = Array.isArray(cp.websites) ? cp.websites : [];
    const socialMedia = Array.isArray(cp.socialMedia) ? cp.socialMedia : [];

    return {
        companyName,

        legalName: details.legalName ?? cp.legalName ?? null,
        tin: details.tin ?? cp.tin ?? null,
        kpp: details.kpp ?? cp.kpp ?? null,
        ogrn: details.ogrn ?? cp.ogrn ?? null,
        legalAddress: details.legalAddress ?? cp.legalAddress ?? null,

        bankName: details.bankName ?? cp.bankName ?? null,
        bic: details.bic ?? cp.bic ?? null,
        correspondentAccount: details.correspondentAccount ?? cp.correspondentAccount ?? null,
        checkingAccount: details.checkingAccount ?? cp.checkingAccount ?? null,

        phones,
        email: contacts.email ?? cp.email ?? null,
        address: contacts.address ?? cp.address ?? null,

        about: cp.about ?? null,
        aiSystemInstruction: cp.aiSystemInstruction ?? null,
        darkModeEnabled: typeof cp.darkModeEnabled === 'boolean' ? cp.darkModeEnabled : false,
        language: cp.language ?? 'ru',

        websites,
        socialMedia,
    };
}

function safeJson(v: any) {
    // Prisma Json не любит undefined
    return v === undefined ? {} : v;
}

// 📥 GET
router.get('/user-data', async (req, res) => {
    try {
        await ensureUser();

        const user = await prisma.user.findUnique({
            where: { id: DEFAULT_USER_ID },
            include: {
                companyProfile: { include: { employees: true } },
                reports: true,
                proposals: true,
                campaigns: true,
                links: true,
                files: true,
                payments: true,
                otherReports: true,
            },
        }) as any;

        if (!user) return res.status(404).json({ error: 'User not found' });

        // ВАЖНО: UI ждёт employees внутри companyProfile
        const companyProfile = user.companyProfile
            ? {
                ...user.companyProfile,
                // Prisma хранит employees отдельной связью — отдаём как есть
                employees: user.companyProfile.employees ?? [],
                // UI ожидает contacts/details — можно оставить пустыми,
                // UI нормализует это на фронте (мы уже это сделали в SettingsPage)
            }
            : {};

        res.json({
            companyProfile,
            reports: user.reports ?? [],
            proposals: user.proposals ?? [],
            campaigns: user.campaigns ?? [],
            links: user.links ?? [],
            files: user.files ?? [],
            payments: user.payments ?? [],
            otherReports: user.otherReports ?? [],
            knowledgeBase: [], // пока не сохраняем
        });
    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 📤 POST
router.post('/user-data', async (req, res) => {
    const data = req.body;

    if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'Empty data received' });
    }

    try {
        await ensureUser();

        await prisma.$transaction(async (tx) => {
            // 1) CompanyProfile + Employees
            if (data.companyProfile) {
                const mapped = mapCompanyProfileFromUI(data.companyProfile);

                const savedProfile = await tx.companyProfile.upsert({
                    where: { userId: DEFAULT_USER_ID },
                    update: mapped,
                    create: { ...mapped, userId: DEFAULT_USER_ID },
                });

                // employees — отдельная таблица
                const employees = Array.isArray(data.companyProfile.employees)
                    ? data.companyProfile.employees
                    : [];

                await tx.employee.deleteMany({ where: { companyProfileId: savedProfile.id } });

                if (employees.length > 0) {
                    await tx.employee.createMany({
                        data: employees.map((e: any) => ({
                            companyProfileId: savedProfile.id,
                            name: typeof e.name === 'string' ? e.name : '',
                            position: typeof e.position === 'string' ? e.position : '',
                        })),
                    });
                }
            }

            // 2) Reports
            if (Array.isArray(data.reports)) {
                await tx.report.deleteMany({ where: { userId: DEFAULT_USER_ID } });

                if (data.reports.length > 0) {
                    await tx.report.createMany({
                        data: data.reports.map((r: any) => {
                            const { id, createdAt, updatedAt, userId, ...rest } = r ?? {};
                            return {
                                userId: DEFAULT_USER_ID,
                                name: rest.name ?? 'Отчет',
                                creationDate: rest.creationDate ? new Date(rest.creationDate) : new Date(),
                                metrics: safeJson(rest.metrics),
                                directions: safeJson(rest.directions),
                                netMetrics: rest.netMetrics === undefined ? null : safeJson(rest.netMetrics),
                            };
                        }),
                    });
                }
            }

            // 3) Proposals
            if (Array.isArray(data.proposals)) {
                await tx.commercialProposal.deleteMany({ where: { userId: DEFAULT_USER_ID } });

                if (data.proposals.length > 0) {
                    await tx.commercialProposal.createMany({
                        data: data.proposals.map((p: any) => {
                            const { id, createdAt, updatedAt, userId, ...rest } = p ?? {};
                            return {
                                userId: DEFAULT_USER_ID,
                                date: rest.date ? new Date(rest.date) : new Date(),
                                direction: rest.direction ?? '',
                                proposalNumber: rest.proposalNumber ?? '',
                                invoiceNumber: rest.invoiceNumber ?? null,
                                company: rest.company ?? null,
                                item: rest.item ?? '',
                                amount: Number(rest.amount ?? 0),
                                invoiceDate: rest.invoiceDate ? new Date(rest.invoiceDate) : null,
                                paymentDate: rest.paymentDate ? new Date(rest.paymentDate) : null,
                                paymentType: rest.paymentType ?? null,
                                status: rest.status ?? 'new',
                            };
                        }),
                    });
                }
            }

            // 4) Payments
            if (Array.isArray(data.payments)) {
                await tx.payment.deleteMany({ where: { userId: DEFAULT_USER_ID } });

                if (data.payments.length > 0) {
                    await tx.payment.createMany({
                        data: data.payments.map((p: any) => {
                            const { id, createdAt, updatedAt, userId, ...rest } = p ?? {};
                            return {
                                userId: DEFAULT_USER_ID,
                                serviceName: rest.serviceName ?? '',
                                lastPaymentDate: rest.lastPaymentDate ? new Date(rest.lastPaymentDate) : new Date(),
                                nextPaymentDate: rest.nextPaymentDate ? new Date(rest.nextPaymentDate) : new Date(),
                                paymentPeriod: rest.paymentPeriod ?? '',
                                amount: Number(rest.amount ?? 0),
                                currency: rest.currency ?? 'KZT',
                                comment: rest.comment ?? null,
                                paymentMethod: rest.paymentMethod ?? '',
                                paymentDetails: rest.paymentDetails ?? null,
                                invoiceId: rest.invoiceId ?? null,
                                recipientName: rest.recipientName ?? null,
                                recipientBin: rest.recipientBin ?? null,
                                recipientBank: rest.recipientBank ?? null,
                                recipientIic: rest.recipientIic ?? null,
                            };
                        }),
                    });
                }
            }

            // 5) Campaigns
            if (Array.isArray(data.campaigns)) {
                await tx.adCampaign.deleteMany({ where: { userId: DEFAULT_USER_ID } });

                if (data.campaigns.length > 0) {
                    await tx.adCampaign.createMany({
                        data: data.campaigns.map((c: any) => {
                            const { id, createdAt, updatedAt, userId, ...rest } = c ?? {};
                            return {
                                userId: DEFAULT_USER_ID,
                                name: rest.name ?? '',
                                status: rest.status ?? '',
                                type: rest.type ?? '',
                                budgetType: rest.budgetType ?? '',
                                budget: Number(rest.budget ?? 0),
                                impressions: Number(rest.impressions ?? 0),
                                clicks: Number(rest.clicks ?? 0),
                                ctr: Number(rest.ctr ?? 0),
                                spend: Number(rest.spend ?? 0),
                                conversions: Number(rest.conversions ?? 0),
                                cpc: Number(rest.cpc ?? 0),
                                conversionRate: Number(rest.conversionRate ?? 0),
                                cpa: Number(rest.cpa ?? 0),
                                strategy: rest.strategy ?? '',
                                period: rest.period ?? '',
                            };
                        }),
                    });
                }
            }

            // 6) Links
            if (Array.isArray(data.links)) {
                await tx.link.deleteMany({ where: { userId: DEFAULT_USER_ID } });

                if (data.links.length > 0) {
                    await tx.link.createMany({
                        data: data.links.map((l: any) => {
                            const { id, createdAt, updatedAt, userId, ...rest } = l ?? {};
                            return {
                                userId: DEFAULT_USER_ID,
                                url: rest.url ?? '',
                                comment: rest.comment ?? null,
                                date: rest.date ? new Date(rest.date) : new Date(),
                            };
                        }),
                    });
                }
            }

            // 7) Files
            if (Array.isArray(data.files)) {
                await tx.storedFile.deleteMany({ where: { userId: DEFAULT_USER_ID } });

                if (data.files.length > 0) {
                    await tx.storedFile.createMany({
                        data: data.files.map((f: any) => {
                            const { id, createdAt, updatedAt, userId, ...rest } = f ?? {};
                            return {
                                userId: DEFAULT_USER_ID,
                                name: rest.name ?? '',
                                type: rest.type ?? '',
                                size: Number(rest.size ?? 0),
                                content: rest.content ?? '',
                                date: rest.date ? new Date(rest.date) : new Date(),
                            };
                        }),
                    });
                }
            }

            // 8) OtherReports
            if (Array.isArray(data.otherReports)) {
                await tx.otherReport.deleteMany({ where: { userId: DEFAULT_USER_ID } });

                if (data.otherReports.length > 0) {
                    await tx.otherReport.createMany({
                        data: data.otherReports.map((r: any) => {
                            const { id, createdAt, updatedAt, userId, ...rest } = r ?? {};
                            return {
                                userId: DEFAULT_USER_ID,
                                name: rest.name ?? '',
                                date: rest.date ? new Date(rest.date) : new Date(),
                                category: rest.category ?? '',
                                description: rest.description ?? null,
                                kpis: safeJson(rest.kpis),
                            };
                        }),
                    });
                }
            }
        });

        res.json({ success: true });
    } catch (error: any) {
        console.error('Save error details:', error);
        res.status(500).json({
            error: 'Failed to sync with database',
            details: error?.message ?? 'Unknown error',
        });
    }
});

export default router;