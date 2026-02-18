import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { Report, CommercialProposal } from '../types';
import { formatCurrency, formatNumber } from '../utils';

interface UnitEconomicsPageProps {
    reports: Report[];
    proposals: CommercialProposal[];
}

const COLORS = ['#2563eb', '#64748b', '#94a3b8', '#ef4444'];

// Reusable component for Slider + Input
const InteractiveInput: React.FC<{
    label: string,
    value: number,
    onChange: (val: number) => void,
    min: number,
    max: number,
    step?: number,
    suffix?: string
}> = ({ label, value, onChange, min, max, step = 1, suffix = '' }) => (
    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 transition-all hover:border-blue-200 dark:hover:border-blue-900/30">
        <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
            <div className="flex items-center gap-1">
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-20 bg-transparent text-right text-xs font-bold focus:text-blue-600 outline-none tabular-nums"
                />
                {suffix && <span className="text-[9px] font-black text-slate-400">{suffix}</span>}
            </div>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
    </div>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">{title}</h3>
);

const UnitEconomicsPage: React.FC<UnitEconomicsPageProps> = ({ reports = [], proposals = [] }) => {
    // Filters for Company Data
    const [companyFilters, setCompanyFilters] = useState({
        month: 'all',
        year: 'all',
        direction: 'all'
    });

    // Manual Inputs for Company Data
    const [companyParams, setCompanyParams] = useState({
        fixedCosts: 0,
        marginPercent: 30 // Default 30% margin
    });

    const availableYears = useMemo(() => {
        if (!reports) return [];
        const years = new Set(reports.map(r => new Date(r.creationDate).getFullYear()));
        return Array.from(years).sort((a: number, b: number) => b - a);
    }, [reports]);

    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
        value: (i + 1).toString(),
        label: new Date(0, i).toLocaleString('ru', { month: 'long' })
    }));

    // Filtered Reports
    const filteredReports = useMemo(() => {
        if (!reports) return [];
        return reports.filter(report => {
            const date = new Date(report.creationDate);
            const monthMatch = companyFilters.month === 'all' || (date.getMonth() + 1).toString() === companyFilters.month;
            const yearMatch = companyFilters.year === 'all' || date.getFullYear().toString() === companyFilters.year;
            return monthMatch && yearMatch;
        });
    }, [reports, companyFilters.month, companyFilters.year]);

    // Calculate Real Data Unit Economics
    const companyResults = useMemo(() => {
        const defaultMetrics = { budget: 0, clicks: 0, leads: 0, proposals: 0, invoices: 0, deals: 0, sales: 0 };

        const totals = filteredReports.reduce((acc, report) => {
            const metrics = companyFilters.direction === 'all'
                ? report.metrics
                : report.directions[companyFilters.direction as 'РТИ' | '3D'] || defaultMetrics;

            return {
                budget: acc.budget + (metrics.budget || 0),
                clicks: acc.clicks + (metrics.clicks || 0),
                leads: acc.leads + (metrics.leads || 0),
                proposals: acc.proposals + (metrics.proposals || 0),
                invoices: acc.invoices + (metrics.invoices || 0),
                deals: acc.deals + (metrics.deals || 0),
                sales: acc.sales + (metrics.sales || 0)
            };
        }, { budget: 0, clicks: 0, leads: 0, proposals: 0, invoices: 0, deals: 0, sales: 0 });

        if (totals.clicks === 0 && totals.budget === 0 && totals.sales === 0) return null;

        // Marketing Metrics
        const cpc = totals.clicks > 0 ? totals.budget / totals.clicks : 0;
        const cpl = totals.leads > 0 ? totals.budget / totals.leads : 0;
        const cac = totals.deals > 0 ? totals.budget / totals.deals : 0;
        const avgCheck = totals.deals > 0 ? totals.sales / totals.deals : 0;

        // Conversions
        const cr1 = totals.clicks > 0 ? (totals.leads / totals.clicks) * 100 : 0;
        const cr2 = totals.leads > 0 ? (totals.proposals / totals.leads) * 100 : 0;
        const cr3 = totals.proposals > 0 ? (totals.deals / totals.proposals) * 100 : 0;

        // Financials based on Inputs
        const grossProfit = totals.sales * (companyParams.marginPercent / 100);
        const contributionMargin = grossProfit - totals.budget;
        const netProfit = contributionMargin - companyParams.fixedCosts;
        const roi = totals.budget > 0 ? ((grossProfit - totals.budget) / totals.budget) * 100 : 0;
        const profitability = totals.sales > 0 ? (netProfit / totals.sales) * 100 : 0;

        return {
            totals, cpc, cpl, cac, avgCheck,
            cr1, cr2, cr3,
            grossProfit, netProfit, roi, profitability
        };
    }, [filteredReports, companyFilters.direction, companyParams]);

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Юнит-экономика</h1>
                    <p className="text-slate-500 mt-1 text-sm">Анализ реальных показателей эффективности бизнеса</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <select
                        value={companyFilters.direction}
                        onChange={e => setCompanyFilters({ ...companyFilters, direction: e.target.value })}
                        className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm font-bold px-4 py-2 text-blue-600 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-inter"
                    >
                        <option value="all">Все направления</option>
                        <option value="РТИ">РТИ</option>
                        <option value="3D">3D</option>
                    </select>
                    <select
                        value={companyFilters.month}
                        onChange={e => setCompanyFilters({ ...companyFilters, month: e.target.value })}
                        className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm font-bold px-4 py-2 text-slate-600 dark:text-slate-300 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-inter"
                    >
                        <option value="all">Все месяцы</option>
                        {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <select
                        value={companyFilters.year}
                        onChange={e => setCompanyFilters({ ...companyFilters, year: e.target.value })}
                        className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm font-bold px-4 py-2 text-slate-600 dark:text-slate-300 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-inter"
                    >
                        <option value="all">Все годы</option>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InteractiveInput
                            label="Постоянные расходы (офис, ЗП и др.)"
                            value={companyParams.fixedCosts}
                            min={0}
                            max={10000000}
                            step={100000}
                            suffix="₸"
                            onChange={v => setCompanyParams(prev => ({ ...prev, fixedCosts: v }))}
                        />
                        <InteractiveInput
                            label="Маржинальность бизнеса"
                            value={companyParams.marginPercent}
                            min={0}
                            max={100}
                            suffix="%"
                            onChange={v => setCompanyParams(prev => ({ ...prev, marginPercent: v }))}
                        />
                    </div>
                </div>

                {companyResults ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Чистая прибыль</p>
                                <p className={`text-3xl font-black ${companyResults.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(companyResults.netProfit)}
                                </p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Рентабельность</p>
                                <p className={`text-3xl font-black ${companyResults.profitability >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {companyResults.profitability.toFixed(1)}%
                                </p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ROI (Маркетинг)</p>
                                <p className={`text-3xl font-black ${companyResults.roi >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                    {companyResults.roi.toFixed(0)}%
                                </p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">CAC (Стоимость гостя)</p>
                                <p className="text-3xl font-black text-slate-700 dark:text-slate-200">
                                    {formatCurrency(companyResults.cac)}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm text-center md:text-left">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Выручка</p>
                                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{formatCurrency(companyResults.totals.sales)}</p>
                                <p className="text-xs text-slate-500 mt-1">Всего доход</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm text-center md:text-left">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Маркетинг бюджет</p>
                                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{formatCurrency(companyResults.totals.budget)}</p>
                                <p className="text-xs text-slate-500 mt-1">Всего расход</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm text-center md:text-left">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Средний чек (Факт)</p>
                                <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{formatCurrency(companyResults.avgCheck)}</p>
                                <p className="text-xs text-slate-500 mt-1">По всем сделкам</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                            <SectionHeader title="Фактические конверсии воронки" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <div className="space-y-2">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Клик → Лид (CR1)</p>
                                    <p className="text-3xl font-black text-blue-500">{companyResults.cr1.toFixed(1)}%</p>
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full">
                                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, companyResults.cr1)}%` }}></div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Лид → КП (CR2)</p>
                                    <p className="text-3xl font-black text-blue-500">{companyResults.cr2.toFixed(1)}%</p>
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full">
                                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, companyResults.cr2)}%` }}></div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">КП → Оплата (CR3)</p>
                                    <p className="text-3xl font-black text-blue-500">{companyResults.cr3.toFixed(1)}%</p>
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full">
                                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, companyResults.cr3)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <div className="max-w-xs mx-auto space-y-4">
                            <div className="text-5xl">📊</div>
                            <h3 className="text-xl font-bold dark:text-slate-100">Недостаточно данных</h3>
                            <p className="text-slate-500 text-sm">Пожалуйста, загрузите отчеты и выберите корректные фильтры для выбранного периода.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnitEconomicsPage;
