import React, { useState, useMemo } from 'react';
import DashboardCard from '../components/DashboardCard';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ScatterChart,
    Scatter,
} from 'recharts';
import { CommercialProposal, Report } from '../types';
import { analyzeDataConsistency } from '../services/geminiService';
import { formatCurrency, formatNumber, formatCompactNumber } from '../utils';

interface DashboardPageProps {
    reports: Report[];
    proposals: CommercialProposal[];
}

const COLORS = ['#2563eb', '#16a34a', '#9333ea', '#f59e0b']; // blue, green, purple, amber

const EmptyState: React.FC = () => (
    <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Нет данных для отображения
        </h2>
        <p className="text-slate-500 mt-2">
            Создайте свой первый отчет или коммерческое предложение, чтобы увидеть здесь аналитику.
        </p>
    </div>
);

const AnalysisModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    isAnalyzing: boolean;
    analysisResult: string | null;
}> = ({ isOpen, onClose, isAnalyzing, analysisResult }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800">
                    <h2 className="text-xl font-bold">Анализ данных от AI</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-2xl"
                    >
                        &times;
                    </button>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-slate-900/50 overflow-y-auto">
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center h-48">
                            <div className="flex items-center space-x-2 text-slate-500">
                                <svg
                                    className="animate-spin h-5 w-5 text-blue-500"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                <span>AI анализирует ваши данные...</span>
                            </div>
                        </div>
                    ) : (
                        <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">{analysisResult}</div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end sticky bottom-0 bg-white dark:bg-slate-800">
                    <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg">
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * ✅ Стабильный парсинг даты периода без UTC-сдвига
 * Поддерживает:
 * - 'YYYY-MM-DD'
 * - 'YYYY-MM-DD HH:mm:ss'
 * - ISO строки
 * Возвращает Date как локальную календарную дату (год/месяц/день)
 */
const parsePeriodDate = (value: any): Date => {
    if (!value) return new Date(1970, 0, 1);

    // Если вдруг прилетело Date
    if (value instanceof Date && !isNaN(value.getTime())) return value;

    const s = String(value).trim();

    // Форматы из Postgres/Supabase: 'YYYY-MM-DD' или 'YYYY-MM-DD HH:mm:ss'
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d = Number(m[3]);
        return new Date(y, mo - 1, d);
    }

    // Фолбэк для ISO и прочего
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) return dt;

    return new Date(1970, 0, 1);
};

const DashboardPage: React.FC<DashboardPageProps> = ({ reports, proposals }) => {
    const [filters, setFilters] = useState({ direction: 'all', month: 'all', quarter: 'all', year: 'all' });
    const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const availableYears = useMemo(() => {
        if (!reports) return [];
        const years = new Set(reports.map(r => parsePeriodDate((r as any).creationDate).getFullYear()));
        return Array.from(years).sort((a: number, b: number) => b - a);
    }, [reports]);

    const filteredReports = useMemo(() => {
        if (!reports) return [];
        return [...reports]
            .filter(report => {
                const reportDate = parsePeriodDate((report as any).creationDate);
                const month = reportDate.getMonth() + 1;
                const year = reportDate.getFullYear();
                const quarter = Math.ceil(month / 3);

                const monthMatch = filters.month === 'all' || month.toString() === filters.month;
                const yearMatch = filters.year === 'all' || year.toString() === filters.year;
                const quarterMatch = filters.quarter === 'all' || quarter.toString() === filters.quarter;

                return monthMatch && yearMatch && quarterMatch;
            })
            .sort(
                (a, b) =>
                    parsePeriodDate((a as any).creationDate).getTime() - parsePeriodDate((b as any).creationDate).getTime()
            );
    }, [reports, filters]);

    const dashboardData = useMemo(() => {
        if (!filteredReports) return null;

        const reportsToUse =
            filters.direction === 'all'
                ? filteredReports
                : filteredReports.map(r => ({
                    ...r,
                    metrics:
                        r.directions?.[filters.direction] || {
                            budget: 0,
                            clicks: 0,
                            leads: 0,
                            proposals: 0,
                            invoices: 0,
                            deals: 0,
                            sales: 0,
                        },
                }));

        const totalSales = reportsToUse.reduce((sum, r) => sum + r.metrics.sales, 0);
        const totalDeals = reportsToUse.reduce((sum, r) => sum + r.metrics.deals, 0);
        const totalBudget = reportsToUse.reduce((sum, r) => sum + r.metrics.budget, 0);
        const totalLeads = reportsToUse.reduce((sum, r) => sum + r.metrics.leads, 0);
        const totalClicks = reportsToUse.reduce((sum, r) => sum + r.metrics.clicks, 0);
        const totalProposalsFromReports = reportsToUse.reduce((sum, r) => sum + r.metrics.proposals, 0);
        const totalInvoicesFromReports = reportsToUse.reduce((sum, r) => sum + r.metrics.invoices, 0);

        const calculateConversion = (from: number, to: number) => (from > 0 ? (to / from) * 100 : 0);

        const costPerProposal = totalProposalsFromReports > 0 ? totalBudget / totalProposalsFromReports : 0;
        const costPerInvoice = totalInvoicesFromReports > 0 ? totalBudget / totalInvoicesFromReports : 0;
        const costPerDeal = totalDeals > 0 ? totalBudget / totalDeals : 0;

        return {
            totalBudget,
            totalLeads,
            totalRevenue: totalSales,
            dealsClosed: totalDeals,
            cpl: totalLeads > 0 ? totalBudget / totalLeads : 0,
            cpc: totalClicks > 0 ? totalBudget / totalClicks : 0,
            roi: totalBudget > 0 ? ((totalSales - totalBudget) / totalBudget) * 100 : 0,
            leadToDealConversion: totalLeads > 0 ? (totalDeals / totalLeads) * 100 : 0,

            costPerProposal,
            costPerInvoice,
            costPerDeal,
            averageCheck: totalDeals > 0 ? totalSales / totalDeals : 0,

            funnelData: [
                { name: 'Лиды', value: totalLeads },
                { name: 'КП', value: totalProposalsFromReports },
                { name: 'Счета', value: totalInvoicesFromReports },
                { name: 'Сделки', value: totalDeals },
            ].filter(d => d.value > 0),

            leadDynamics: (reportsToUse || []).slice(-12).map(r => ({
                name: r.name.split(' ').slice(-2)[0].substring(0, 3),
                'РТИ Лиды': r.directions?.['РТИ']?.leads || 0,
                '3D Лиды': r.directions?.['3D']?.leads || 0,
            })),

            budgetDistribution: [
                { name: 'РТИ', value: filteredReports.reduce((s, r) => s + (r.directions?.['РТИ']?.budget || 0), 0) },
                { name: '3D', value: filteredReports.reduce((s, r) => s + (r.directions?.['3D']?.budget || 0), 0) },
            ].filter(item => item.value > 0),

            revenueBudgetDynamics: reportsToUse.slice(-12).map(r => ({
                name: r.name.split(' ').slice(-2)[0].substring(0, 3),
                Выручка: r.metrics.sales,
                Бюджет: r.metrics.budget,
            })),

            keyConversions: [
                { label: 'Клики → Лиды', value: calculateConversion(totalClicks, totalLeads) },
                { label: 'Лиды → КП', value: calculateConversion(totalLeads, totalProposalsFromReports) },
                { label: 'КП → Счета', value: calculateConversion(totalProposalsFromReports, totalInvoicesFromReports) },
                { label: 'Счета → Сделки', value: calculateConversion(totalInvoicesFromReports, totalDeals) },
            ],
        };
    }, [filteredReports, filters.direction]);

    const axisColor = '#6b7280';
    const gridColor = '#e5e7eb';

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color || entry.fill || '#3b82f6' }}>
                            {`${entry.name}: ${entry.value.toLocaleString()}`}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const handleAnalyzeClick = async () => {
        setAnalysisModalOpen(true);
        setIsAnalyzing(true);
        setAnalysisResult(null);
        try {
            const result = await analyzeDataConsistency(filteredReports);
            setAnalysisResult(result);
        } catch (error) {
            setAnalysisResult('Произошла ошибка при анализе данных.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (!dashboardData || (reports.length === 0 && proposals.length === 0)) {
        return <EmptyState />;
    }

    return (
        <div className="space-y-6">
            <AnalysisModal
                isOpen={isAnalysisModalOpen}
                onClose={() => setAnalysisModalOpen(false)}
                isAnalyzing={isAnalyzing}
                analysisResult={analysisResult}
            />

            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Общий отчет</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Комплексная сводка по всем маркетинговым кампаниям и продажам
                    </p>
                </div>
                <button
                    onClick={handleAnalyzeClick}
                    disabled={isAnalyzing}
                    className="bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center space-x-2 shadow-md hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <span>Анализ данных AI</span>
                </button>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4 bg-white dark:bg-slate-800 p-3 rounded-xl flex-wrap shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-sm dark:text-slate-200">Фильтры:</span>

                <select name="direction" value={filters.direction} onChange={handleFilterChange} className="bg-gray-100 dark:bg-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                    <option value="all">Все направления</option>
                    <option value="РТИ">РТИ</option>
                    <option value="3D">3D</option>
                </select>

                <select name="month" value={filters.month} onChange={handleFilterChange} className="bg-gray-100 dark:bg-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                    <option value="all">Все месяцы</option>
                    {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                            {new Date(2000, i, 1).toLocaleString('ru', { month: 'long' })}
                        </option>
                    ))}
                </select>

                <select name="quarter" value={filters.quarter} onChange={handleFilterChange} className="bg-gray-100 dark:bg-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                    <option value="all">Все кварталы</option>
                    <option value="1">1 квартал</option>
                    <option value="2">2 квартал</option>
                    <option value="3">3 квартал</option>
                    <option value="4">4 квартал</option>
                </select>

                <select name="year" value={filters.year} onChange={handleFilterChange} className="bg-gray-100 dark:bg-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                    <option value="all">Все годы</option>
                    {availableYears.map(y => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard title="Общий бюджет" value={formatCompactNumber(dashboardData.totalBudget)} className="bg-blue-500 text-white" />
                <DashboardCard title="Всего лидов" value={formatNumber(dashboardData.totalLeads)} tag={`${dashboardData.leadToDealConversion.toFixed(1)}% CR`} tagColor="bg-black/20 text-white" className="bg-green-500 text-white" />
                <DashboardCard title="Общая выручка" value={formatCompactNumber(dashboardData.totalRevenue)} tag={`ROI ${dashboardData.roi.toFixed(0)}%`} tagColor="bg-black/20 text-white" className="bg-violet-500 text-white" />
                <DashboardCard title="Реализовано сделок" value={formatNumber(dashboardData.dealsClosed)} className="bg-amber-500 text-white" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md h-full flex flex-col">
                    <h3 className="font-semibold mb-6 text-slate-900 dark:text-slate-100">Воронка продаж</h3>
                    <div className="flex flex-col items-center justify-center flex-1 space-y-2">
                        {dashboardData.funnelData.map((item, index) => {
                            const maxVal = dashboardData.funnelData[0].value || 1;
                            const widthPercent = Math.max(40, 100 - index * 15);

                            return (
                                <div
                                    key={index}
                                    className="relative flex items-center justify-center text-white font-bold h-12 transition-all hover:scale-105 rounded-lg shadow-sm"
                                    style={{
                                        width: `${widthPercent}%`,
                                        backgroundColor: COLORS[index % COLORS.length],
                                        opacity: 0.9,
                                    }}
                                >
                                    <div className="flex items-center space-x-2 px-4 whitespace-nowrap z-10">
                                        <span className="text-sm uppercase tracking-wider opacity-90">{item.name}</span>
                                        <span className="text-lg">{formatNumber(item.value)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                    <h3 className="font-semibold mb-4 text-slate-900 dark:text-slate-100">Динамика лидов по направлениям</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <ScatterChart data={dashboardData.leadDynamics}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis dataKey="name" stroke={axisColor} fontSize={12} />
                            <YAxis stroke={axisColor} fontSize={12} />
                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                            <Legend />
                            <Scatter name="РТИ Лиды" dataKey="РТИ Лиды" fill="#2563eb" />
                            <Scatter name="3D Лиды" dataKey="3D Лиды" fill="#16a34a" />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                    <h3 className="font-semibold mb-4 text-slate-900 dark:text-slate-100">Бюджет vs Выручка</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={dashboardData.revenueBudgetDynamics}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis dataKey="name" stroke={axisColor} fontSize={12} />
                            <YAxis stroke={axisColor} fontSize={12} tickFormatter={value => `${Number(value) / 1000000}M`} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                            <Legend />
                            <Bar dataKey="Выручка" fill="#9333ea" />
                            <Bar dataKey="Бюджет" fill="#d1d5db" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                    <h3 className="font-semibold mb-4 text-slate-900 dark:text-slate-100">Ключевые фин. показатели</h3>
                    <div className="grid grid-cols-2 gap-4 h-full">
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={dashboardData.budgetDistribution}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        innerRadius={40}
                                        outerRadius={70}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(((percent || 0) * 100) as number).toFixed(0)}%`}
                                    >
                                        {dashboardData.budgetDistribution.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">CPC</p>
                                <p className="font-bold text-lg dark:text-slate-200">{formatCurrency(dashboardData.cpc)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">CPL</p>
                                <p className="font-bold text-lg dark:text-slate-200">{formatCurrency(dashboardData.cpl)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">ROI</p>
                                <p className="font-bold text-lg text-purple-600 dark:text-purple-400">{dashboardData.roi.toFixed(1)}%</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Ср. чек</p>
                                <p className="font-bold text-lg dark:text-slate-200">{formatCurrency(dashboardData.averageCheck)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 rounded-2xl shadow-lg lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-500">
                    <h3 className="font-semibold mb-4 text-white/90">Ключевые конверсии воронки</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {dashboardData.keyConversions.map((conv, index) => (
                            <div key={index} className="bg-white/20 backdrop-blur-sm p-4 rounded-xl text-center text-white">
                                <p className="text-sm font-medium text-white/80">{conv.label}</p>
                                <p className="text-3xl font-bold text-white mt-1">{conv.value.toFixed(1)}%</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md lg:col-span-2">
                    <h3 className="font-semibold mb-4 text-slate-900 dark:text-slate-100">Цена за этапы воронок</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg text-center">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Стоимость Лида</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{formatCurrency(dashboardData.cpl)}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg text-center">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Стоимость КП</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{formatCurrency(dashboardData.costPerProposal)}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg text-center">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Стоимость Счета</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{formatCurrency(dashboardData.costPerInvoice)}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg text-center">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Стоимость Сделки</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{formatCurrency(dashboardData.costPerDeal)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md overflow-x-auto">
                <h3 className="font-semibold mb-4 text-slate-900 dark:text-slate-100">Детализация по периодам</h3>
                <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                    <thead className="text-xs text-slate-500 uppercase bg-gray-50 dark:bg-slate-700">
                        <tr>
                            <th className="px-4 py-3 whitespace-nowrap">Период</th>
                            <th className="px-4 py-3 whitespace-nowrap">Бюджет</th>
                            <th className="px-4 py-3 whitespace-nowrap">Клики</th>
                            <th className="px-4 py-3 whitespace-nowrap">Лиды</th>
                            <th className="px-4 py-3 whitespace-nowrap">Сделки</th>
                            <th className="px-4 py-3 whitespace-nowrap">Выручка</th>
                            <th className="px-4 py-3 whitespace-nowrap">Ср. чек</th>
                            <th className="px-4 py-3 whitespace-nowrap">CPL</th>
                            <th className="px-4 py-3 whitespace-nowrap">ROI</th>
                        </tr>
                    </thead>
                    <tbody className="tabular-nums">
                        {filteredReports
                            .slice(-12)
                            .reverse()
                            .map(r => {
                                const cpl = r.metrics.leads > 0 ? r.metrics.budget / r.metrics.leads : 0;
                                const roi = r.metrics.budget > 0 ? ((r.metrics.sales - r.metrics.budget) / r.metrics.budget) * 100 : 0;
                                const avgCheck = r.metrics.deals > 0 ? r.metrics.sales / r.metrics.deals : 0;

                                return (
                                    <tr key={r.id} className="border-b border-gray-200 dark:border-slate-700">
                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                            {r.name.replace('Отчет ', '')}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(r.metrics.budget)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{formatNumber(r.metrics.clicks)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{formatNumber(r.metrics.leads)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{formatNumber(r.metrics.deals)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(r.metrics.sales)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap font-semibold text-blue-600 dark:text-blue-400">
                                            {formatCurrency(avgCheck)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(cpl)}</td>
                                        <td
                                            className={`px-4 py-3 font-semibold whitespace-nowrap ${roi >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                                }`}
                                        >
                                            {roi.toFixed(1)}%
                                        </td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DashboardPage;