
export interface User {
    id: string;
    email: string;
    name: string;
    initials: string;
}

export interface Report {
    id: string;
    name: string;
    creationDate: string;
    metrics: {
        budget: number;
        clicks: number;
        leads: number;
        proposals: number;
        invoices: number;
        deals: number;
        sales: number;
    };
    previousMetrics?: Report['metrics'];
    directions: {
        [key: string]: {
            budget: number;
            clicks: number;
            leads: number;
            proposals: number;
            invoices: number;
            deals: number;
            sales: number;
        }
    };
    netMetrics?: {
        qualifiedLeads: number;
    };
}

export interface CommercialProposal {
    id: string;
    date: string;
    direction: 'РТИ' | '3D';
    proposalNumber: string;
    invoiceNumber: string | null;
    company: string | null;
    item: string;
    amount: number;
    invoiceDate: string | null;
    paymentDate: string | null;
    paymentType: string | null;
    status: 'Ожидание' | 'Оплачено' | 'Отменено';
}

export interface AdCampaign {
    id: string;
    name: string;
    status: 'Включено' | 'Приостановлено' | 'Завершено' | string;
    type: 'Поиск' | 'Максимальная эффективность' | string;
    budgetType: 'Дневной' | 'На весь срок' | string;
    budget: number;
    impressions: number;
    clicks: number;
    ctr: number;
    spend: number;
    conversions: number;
    cpc: number;
    conversionRate: number;
    cpa: number;
    strategy: string;
    period: string;
    currencyCode?: string;
    interactions?: number;
    interactionRate?: number;
    avgPrice?: number;
}

export interface AdCampaignAuditItem {
    campaignName: string;
    score: number; // 1-10
    efficiency: 'Высокая' | 'Средняя' | 'Низкая';
    verdict: string;
    recommendation: string;
    pros: string[];
    cons: string[];
}

export interface AdCampaignAuditReport {
    timestamp: string;
    globalScore: number;
    globalVerdict: string;
    campaigns: AdCampaignAuditItem[];
}

export interface Link {
    id: string;
    url: string;
    comment: string;
    date: string;
}

export interface StoredFile {
    id: string;
    name: string;
    type: string;
    size: number;
    content: string;
    date: string;
}

export interface CompanyDetails {
    legalName: string;
    tin: string;
    kpp: string;
    ogrn: string;
    legalAddress: string;
    bankName: string;
    bic: string;
    correspondentAccount: string;
    checkingAccount: string;
}

export interface CompanyContacts {
    phones: string[];
    email: string;
    address: string;
}

export interface Employee {
    id: string;
    name: string;
    position: string;
}

export interface Payment {
    id: string;
    serviceName: string;
    lastPaymentDate: string;
    nextPaymentDate: string;
    paymentPeriod: 'monthly' | 'yearly' | 'onetime';
    amount: number;
    currency: 'KZT' | 'USD' | 'RUB';
    comment: string;
    paymentMethod: 'Карта' | 'Безнал';
    paymentDetails: string;
    invoiceId: string | null;
    recipientName?: string;
    recipientBin?: string;
    recipientBank?: string;
    recipientIic?: string;
}

export interface CompanyProfile {
    companyName: string;
    details: CompanyDetails;
    contacts: CompanyContacts;
    employees: Employee[];
    socialMedia: string[];
    websites: string[];
    about: string;
    aiSystemInstruction: string;
    language: 'ru' | 'en' | 'kz';
    geminiApiKey?: string;
    darkModeEnabled: boolean;
}

export interface SearchResultItem {
    title: string;
    snippet: string;
    link: string;
    isAd?: boolean;
}

export interface Review {
    author: string;
    date: string;
    rating: number;
    platform: string;
    text: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    url?: string;
}

export interface Mention {
    title: string;
    url: string;
    date: string;
    summary: string;
    sourceType: 'article' | 'social' | 'forum' | 'directory';
}

export interface AdAuditResult {
    id: string;
    keyword: string;
    location: string;
    timestamp: string;
    advertisers: {
        name: string;
        offer: string;
        link: string;
    }[];
    organicTop: {
        title: string;
        link: string;
    }[];
    marketAnalysis: string;
}

export interface BrandAnalysis {
    lastUpdate: string;
    sentimentScore: number;
    mentionsCount: number;
    trustIndex: number;
    detailedFeedback: {
        positive: string[];
        negative: string[];
        categories: {
            name: string;
            score: number;
            summary: string;
        }[];
    };
    reviews: Review[];
    mentions: Mention[];
    swot: {
        strengths: string[];
        weaknesses: string[];
        opportunities: string[];
        threats: string[];
    };
    competitors: {
        name: string;
        pros: string[];
        cons: string[];
        strategyHint: string;
        marketShare?: string;
        website?: string;
    }[];
    sources: {
        title: string;
        uri: string;
    }[];
    recommendations: string[];
}

export interface OtherReportKpi {
    id: string;
    name: string;
    value: string;
}

export interface OtherReport {
    id: string;
    name: string;
    date: string;
    category: string;
    description: string;
    kpis: OtherReportKpi[];
}

export interface KnowledgeItem {
    id: string;
    title: string;
    content: string;
    links: string[];
    date: string;
}

export interface UserData {
    companyProfile: CompanyProfile;
    reports: Report[];
    proposals: CommercialProposal[];
    campaigns: AdCampaign[];
    links: Link[];
    files: StoredFile[];
    payments: Payment[];
    otherReports: OtherReport[];
    knowledgeBase: KnowledgeItem[];
    brandAnalysis?: BrandAnalysis;
    adAudits?: AdAuditResult[];
    adCampaignAudit?: AdCampaignAuditReport;
    companyStrategy?: string;
}
