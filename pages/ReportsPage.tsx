
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Report } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { fileToBase64, formatCurrency, formatNumber, formatDate, formatFullDate } from '../utils';
import { analyzeReportImage } from '../services/geminiService';

type ReportView = 'list' | 'detail' | 'create-manual' | 'create-upload';

interface ReportsPageProps {
    reports: Report[];
    addReport: (report: Omit<Report, 'id'>) => void;
    deleteReport: (id: string) => void;
    updateReport: (report: Report) => void;
}

const calculateConversion = (numerator: number = 0, denominator: number = 0): number => {
    if (!denominator || denominator === 0) {
        return 0;
    }
    return (numerator / denominator) * 100;
};

const ReportCard: React.FC<{ report: Report, onOpen: (report: Report) => void, onDelete: (id: string) => void }> = ({ report, onOpen, onDelete }) => {
    const avgCheck = report.metrics.deals > 0 ? report.metrics.sales / report.metrics.deals : 0;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg transition-all hover:shadow-blue-500/20 hover:scale-[1.02] flex flex-col justify-between border border-transparent dark:border-slate-700">
            <div>
                <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">✓ Готов</span>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(report.id); }} className="text-slate-400 hover:text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{report.name}</h3>
                <div className="space-y-1.5 text-sm mb-4">
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">РТИ</span><span className="font-semibold text-slate-800 dark:text-slate-200">{formatNumber(report.directions?.['РТИ']?.leads || 0)} лидов</span></div>
                    <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">3D</span><span className="font-semibold text-slate-800 dark:text-slate-200">{formatNumber(report.directions?.['3D']?.leads || 0)} лидов</span></div>
                    <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
                        <span className="text-slate-500 dark:text-slate-400">Средний чек</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(avgCheck)}</span>
                    </div>
                </div>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 pt-3 flex justify-between items-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">{formatFullDate(report.creationDate)}</p>
                <button onClick={() => onOpen(report)} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    Открыть →
                </button>
            </div>
        </div>
    );
};

const ReportDetailView: React.FC<{ report: Report & { previousDirections?: Report['directions'] }, onBack: () => void, updateReport: (report: Report) => void }> = ({ report, onBack, updateReport }) => {
    const [activeTab, setActiveTab] = useState('РТИ');

    const currentMetrics = report.directions?.[activeTab] || { budget: 0, clicks: 0, leads: 0, proposals: 0, invoices: 0, deals: 0, sales: 0 };
    const prevMetrics = report.previousDirections?.[activeTab] || { budget: 0, clicks: 0, leads: 0, proposals: 0, invoices: 0, deals: 0, sales: 0 };

    const getChange = (current: number | undefined, previous: number | undefined) => {
        if (current === undefined || previous === undefined || previous === 0) return <span className="text-slate-400">-</span>;
        const change = ((current - previous) / previous) * 100;
        if (Math.abs(change) < 0.01) return <span className="text-slate-400">-</span>;
        const color = change >= 0 ? 'text-green-500' : 'text-red-500';
        return <span className={`text-xs font-bold ${color}`}>{change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%</span>;
    };

    const funnelData = [
        { name: 'Лиды', value: currentMetrics.leads },
        { name: 'КП', value: currentMetrics.proposals },
        { name: 'Счета', value: currentMetrics.invoices },
        { name: 'Реализ.', value: currentMetrics.deals },
    ];

    const costRows = [
        { label: 'Клик (CPC)', value: currentMetrics.clicks > 0 ? currentMetrics.budget / currentMetrics.clicks : 0 },
        { label: 'Лид (CPL)', value: currentMetrics.leads > 0 ? currentMetrics.budget / currentMetrics.leads : 0 },
        { label: 'Цена за КП', value: currentMetrics.proposals > 0 ? currentMetrics.budget / currentMetrics.proposals : 0 },
        { label: 'Цена за счет', value: currentMetrics.invoices > 0 ? currentMetrics.budget / currentMetrics.invoices : 0 },
        { label: 'Цена за сделку', value: currentMetrics.deals > 0 ? currentMetrics.budget / currentMetrics.deals : 0 },
    ];

    const currentAvgCheck = currentMetrics.deals > 0 ? currentMetrics.sales / currentMetrics.deals : 0;
    const prevAvgCheck = (prevMetrics.deals && prevMetrics.deals > 0) ? (prevMetrics.sales || 0) / prevMetrics.deals : 0;

    const mainMetricsTable = [
        { label: 'Клики', current: currentMetrics.clicks, previous: prevMetrics.clicks, format: formatNumber },
        { label: 'Лиды', current: currentMetrics.leads, previous: prevMetrics.leads, format: formatNumber },
        { label: 'КП', current: currentMetrics.proposals, previous: prevMetrics.proposals, format: formatNumber },
        { label: 'Счета', current: currentMetrics.invoices, previous: prevMetrics.invoices, format: formatNumber },
        { label: 'Реализованные', current: currentMetrics.deals, previous: prevMetrics.deals, format: formatNumber },
        { label: 'Выручка', current: currentMetrics.sales, previous: prevMetrics.sales, format: formatCurrency },
        { label: 'Средний чек', current: currentAvgCheck, previous: prevAvgCheck, format: formatCurrency },
    ];

    const conversionsTable = [
        { label: 'Из кликов в лиды', current: calculateConversion(currentMetrics.leads, currentMetrics.clicks), previous: calculateConversion(prevMetrics.leads, prevMetrics.clicks) },
        { label: 'Из лидов в КП', current: calculateConversion(currentMetrics.proposals, currentMetrics.leads), previous: calculateConversion(prevMetrics.proposals, prevMetrics.leads) },
        { label: 'Из КП в счета', current: calculateConversion(currentMetrics.invoices, currentMetrics.proposals), previous: calculateConversion(prevMetrics.invoices, prevMetrics.proposals) },
        { label: 'Из КП в оплату', current: calculateConversion(currentMetrics.deals, currentMetrics.proposals), previous: calculateConversion(prevMetrics.deals, prevMetrics.proposals) },
        { label: 'Из счетов в оплату', current: calculateConversion(currentMetrics.deals, currentMetrics.invoices), previous: calculateConversion(prevMetrics.deals, prevMetrics.invoices) },
        { label: 'Из лидов в оплату', current: calculateConversion(currentMetrics.deals, currentMetrics.leads), previous: calculateConversion(prevMetrics.deals, prevMetrics.leads) },
    ];

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                        {`${payload[0].name}: ${formatNumber(payload[0].value)}`}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="text-blue-600 dark:text-blue-400 hover:underline flex items-center text-sm font-semibold">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Назад к отчетам
                </button>
            </div>

            <h2 className="text-3xl font-bold mb-2 text-slate-900 dark:text-slate-100">Отчет</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4">{report.name}</p>

            <div className="flex items-center space-x-1 bg-gray-200 dark:bg-slate-700 p-1 rounded-lg mb-6 self-start max-w-min">
                <button onClick={() => setActiveTab('РТИ')} className={`px-4 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap ${activeTab === 'РТИ' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500'}`}>Направление РТИ</button>
                <button onClick={() => setActiveTab('3D')} className={`px-4 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap ${activeTab === '3D' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500'}`}>Направление 3D</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20"><p className="text-sm text-blue-800 dark:text-blue-300">Рекламный бюджет</p><p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{formatCurrency(currentMetrics.budget)}</p>{getChange(currentMetrics.budget, prevMetrics.budget)}</div>
                <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20"><p className="text-sm text-green-800 dark:text-green-300">Лиды</p><p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{formatNumber(currentMetrics.leads)}</p>{getChange(currentMetrics.leads, prevMetrics.leads)}</div>
                <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20"><p className="text-sm text-purple-800 dark:text-purple-300">Сумма продаж</p><p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{formatCurrency(currentMetrics.sales)}</p>{getChange(currentMetrics.sales, prevMetrics.sales)}</div>
                <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/20"><p className="text-sm text-orange-800 dark:text-orange-300">Средний чек</p><p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{formatCurrency(currentAvgCheck)}</p>{getChange(currentAvgCheck, prevAvgCheck)}</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md overflow-x-auto">
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-4">Основные метрики</h3>
                    <table className="w-full text-sm">
                        <thead className="text-left">
                            <tr className="bg-gray-50 dark:bg-slate-700">
                                <th className="py-2 px-3 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Метрика</th>
                                <th className="py-2 px-3 font-medium text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">Текущий</th>
                                <th className="py-2 px-3 font-medium text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">Предыдущий</th>
                            </tr>
                        </thead>
                        <tbody className="tabular-nums">
                            {mainMetricsTable.map(item => (
                                <tr key={item.label} className="border-b border-gray-100 dark:border-slate-700 last:border-0">
                                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{item.label}</td>
                                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200 text-right">{item.format(item.current)}</td>
                                    <td className="py-3 px-3 text-slate-500 dark:text-slate-500 text-right">{item.format(item.previous)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md overflow-x-auto">
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-4">Конверсии (%)</h3>
                    <table className="w-full text-sm">
                        <thead className="text-left">
                            <tr className="bg-gray-50 dark:bg-slate-700">
                                <th className="py-2 px-3 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Этап воронки</th>
                                <th className="py-2 px-3 font-medium text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">Текущий</th>
                                <th className="py-2 px-3 font-medium text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">Предыдущий</th>
                            </tr>
                        </thead>
                        <tbody className="tabular-nums">
                            {conversionsTable.map(item => (
                                <tr key={item.label} className="border-b border-gray-100 dark:border-slate-700 last:border-0">
                                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{item.label}</td>
                                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200 text-right">{item.current.toFixed(1)}%</td>
                                    <td className="py-3 px-3 text-slate-500 dark:text-slate-500 text-right">{item.previous.toFixed(1)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl mb-6">
                <h3 className="font-semibold mb-4 text-lg text-slate-900 dark:text-slate-100">Воронка продаж</h3>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={funnelData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.3} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                        <Bar dataKey="value" fill="#3b82f6" barSize={60} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md overflow-x-auto">
                <h3 className="font-semibold mb-4 text-lg text-slate-900 dark:text-slate-100">Стоимость привлечения</h3>
                <table className="w-full text-sm">
                    <tbody className="tabular-nums">
                        {costRows.map(r => (
                            <tr key={r.label} className="border-b border-gray-100 dark:border-slate-700 last:border-0">
                                <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{r.label}</td>
                                <td className="py-3 px-3 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(r.value)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const CreateReportManual: React.FC<{ onBack: () => void, onSave: (report: Omit<Report, 'id'>) => void, reports: Report[] }> = ({ onBack, onSave, reports }) => {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [error, setError] = useState<string>('');
    const [formMetrics, setFormMetrics] = useState<Report['directions']>({
        'РТИ': { budget: 0, clicks: 0, leads: 0, proposals: 0, invoices: 0, deals: 0, sales: 0 },
        '3D': { budget: 0, clicks: 0, leads: 0, proposals: 0, invoices: 0, deals: 0, sales: 0 },
    });

    const metricLabels: Record<keyof Report['metrics'], string> = {
        budget: 'Бюджет (₸)',
        clicks: 'Клики',
        leads: 'Лиды',
        proposals: 'КП',
        invoices: 'Счета',
        deals: 'Сделки',
        sales: 'Выручка (₸)'
    };

    const allMetricKeys = Object.keys(metricLabels) as (keyof Report['metrics'])[];


    const handleFormChange = (direction: 'РТИ' | '3D', metric: keyof Report['metrics'], value: string) => {
        setFormMetrics(prev => ({
            ...prev,
            [direction]: {
                ...prev[direction],
                [metric]: Number(value) || 0
            }
        }));
    };

    const totals = useMemo(() => {
        const rti = formMetrics['РТИ'];
        const d3 = formMetrics['3D'];
        return allMetricKeys.reduce((acc, key) => {
            acc[key] = (rti[key] || 0) + (d3[key] || 0);
            return acc;
        }, {} as Report['metrics']);
    }, [formMetrics, allMetricKeys]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const reportName = `Отчет ${monthNames[month - 1]} ${year}`;

        if (reports.some(r => r.name === reportName)) {
            setError(`Отчет для "${reportName}" уже существует. Выберите другой период или удалите существующий отчет.`);
            return;
        }

        const reportDate = new Date(year, month - 1, 1);

        const newReport: Omit<Report, 'id'> = {
            name: reportName,
            creationDate: reportDate.toISOString().split('T')[0],
            metrics: totals,
            directions: formMetrics
        };
        onSave(newReport);
    };

    const MetricInput: React.FC<{ metric: keyof Report['metrics'], direction: 'РТИ' | '3D' }> = ({ metric, direction }) => (
        <div>
            <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">{metricLabels[metric]}</label>
            <input
                type="number"
                placeholder="0"
                value={formMetrics[direction][metric]}
                onChange={(e) => handleFormChange(direction, metric, e.target.value)}
                className="w-full bg-gray-100 dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg border dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
            />
        </div>
    );

    return (
        <div>
            <button onClick={onBack} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline flex items-center text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Назад к отчетам
            </button>
            <h2 className="text-3xl font-bold mb-1 text-slate-900 dark:text-slate-100">Создать отчет вручную</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Введите данные для одного или обоих направлений. Итоги рассчитаются автоматически.</p>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border dark:border-slate-700">
                    <h3 className="font-semibold mb-4 text-slate-900 dark:text-slate-100">1. Период отчета</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Месяц <span className="text-red-500">*</span></label>
                            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="w-full bg-gray-100 dark:bg-slate-700 dark:text-slate-200 p-2 rounded-lg border dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500">
                                {monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Год <span className="text-red-500">*</span></label>
                            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-full bg-gray-100 dark:bg-slate-700 dark:text-slate-200 p-2 rounded-lg border dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border dark:border-slate-700">
                    <h3 className="font-semibold mb-4 text-slate-900 dark:text-slate-100">2. Метрики по направлениям</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                        <div className="space-y-4">
                            <h4 className="font-medium text-lg text-blue-600 dark:text-blue-400">Направление РТИ</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {allMetricKeys.map(key => <MetricInput key={key} metric={key} direction="РТИ" />)}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-medium text-lg text-green-600 dark:text-green-400">Направление 3D</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {allMetricKeys.map(key => <MetricInput key={key} metric={key} direction="3D" />)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border dark:border-slate-700">
                    <h3 className="font-semibold mb-4 text-slate-900 dark:text-slate-100">3. Итоговые метрики (авторасчет)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {allMetricKeys.map(key => (
                            <div key={key} className="bg-gray-100 dark:bg-slate-700 p-3 rounded-lg tabular-nums">
                                <p className="text-sm text-slate-500 dark:text-slate-400">{metricLabels[key]}</p>
                                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{totals[key].toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <div className="flex justify-end pt-4">
                    <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-base shadow-lg transition-transform hover:scale-105 active:scale-95">✓ Сохранить отчет</button>
                </div>
            </form>
        </div>
    )
};

const CreateReportUpload: React.FC<{ onBack: () => void, onSave: (report: Omit<Report, 'id'>) => void, reports: Report[] }> = ({ onBack, onSave, reports }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [step, setStep] = useState(1);
    const [parsedDirections, setParsedDirections] = useState<Report['directions'] | null>(null);

    const metricLabels: Record<keyof Report['metrics'], string> = {
        budget: 'Бюджет', clicks: 'Клики', leads: 'Лиды', proposals: 'КП', invoices: 'Счета', deals: 'Сделки', sales: 'Выручка'
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setError('');
        }
    };

    const handleMetricChange = (direction: 'РТИ' | '3D', metric: keyof Report['metrics'], value: string) => {
        if (!parsedDirections) return;
        const defaultMetrics = { budget: 0, clicks: 0, leads: 0, proposals: 0, invoices: 0, deals: 0, sales: 0 };
        setParsedDirections(prev => ({
            ...prev!,
            [direction]: {
                ...(prev?.[direction] || defaultMetrics),
                [metric]: Number(value) || 0
            }
        }));
    };

    const handleParse = async () => {
        if (!file) {
            setError('Пожалуйста, выберите файл для анализа.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const base64Data = await fileToBase64(file);
            const analysisResult = await analyzeReportImage(file.type, base64Data);
            const parsedData = JSON.parse(analysisResult);

            const emptyMetrics = { budget: 0, clicks: 0, leads: 0, proposals: 0, invoices: 0, deals: 0, sales: 0 };
            const safeParsedData = parsedData || {};
            const rtiMetrics = { ...emptyMetrics, ...(safeParsedData['РТИ'] || {}) };
            const d3Metrics = { ...emptyMetrics, ...(safeParsedData['3D'] || {}) };

            setParsedDirections({ 'РТИ': rtiMetrics, '3D': d3Metrics });
            setStep(2);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось проанализировать файл.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = () => {
        if (!parsedDirections) return;
        setError('');
        const reportName = `Отчет ${monthNames[month - 1]} ${year}`;
        if (reports.some(r => r.name === reportName)) {
            setError(`Отчет для "${reportName}" уже существует.`);
            return;
        }

        const reportDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const rtiMetrics = parsedDirections['РТИ'];
        const d3Metrics = parsedDirections['3D'];

        const totalMetrics = Object.keys(rtiMetrics).reduce((acc, key) => {
            (acc as any)[key] = (rtiMetrics as any)[key] + (d3Metrics as any)[key];
            return acc;
        }, {} as Report['metrics']);

        onSave({ name: reportName, creationDate: reportDate, metrics: totalMetrics, directions: parsedDirections });
    };

    return (
        <div>
            <button onClick={onBack} className="mb-4 text-blue-600 dark:text-blue-400 hover:underline flex items-center text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Назад к отчетам
            </button>
            <h2 className="text-3xl font-bold mb-1 text-slate-900 dark:text-slate-100">Создать отчет из файла</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Загрузите скриншот или фото отчета, AI проанализирует его и заполнит данные.</p>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border dark:border-slate-700">
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Месяц</label>
                                <select value={month} onChange={e => setMonth(Number(e.target.value))} className="w-full bg-gray-100 dark:bg-slate-700 dark:text-slate-200 p-2 rounded-lg">
                                    {monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Год</label>
                                <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-full bg-gray-100 dark:bg-slate-700 dark:text-slate-200 p-2 rounded-lg" />
                            </div>
                        </div>
                        <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-10 text-center">
                            <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} accept="image/*,application/pdf" />
                            <label htmlFor="file-upload" className="cursor-pointer text-blue-600 dark:text-blue-400 font-semibold">{file ? file.name : "Выберите файл..."}</label>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Загрузите скриншот, фото или PDF-файл с отчетом</p>
                        </div>
                        {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
                        <div className="flex justify-end pt-4">
                            <button onClick={handleParse} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-base disabled:bg-slate-400">
                                {isLoading ? "Анализ..." : "Далее →"}
                            </button>
                        </div>
                    </div>
                )}
                {step === 2 && parsedDirections && (
                    <div className="space-y-6">
                        <h3 className="font-semibold text-lg dark:text-slate-100">Проверьте извлеченные данные</h3>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(['РТИ', '3D'] as const).map(dir => (
                                <div key={dir} className="space-y-3 p-4 border dark:border-slate-700 rounded-lg">
                                    <h4 className="font-semibold dark:text-slate-200">{dir}</h4>
                                    {Object.keys(metricLabels).map(key => (
                                        <div key={key}>
                                            <label className="text-xs text-slate-500 dark:text-slate-400">{metricLabels[key as keyof typeof metricLabels]}</label>
                                            <input
                                                type="number"
                                                value={parsedDirections[dir]?.[key as keyof Report['metrics']] ?? 0}
                                                onChange={e => handleMetricChange(dir, key as keyof Report['metrics'], e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-slate-700 dark:text-slate-200 p-1.5 rounded-md text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center pt-4">
                            <button onClick={() => setStep(1)} className="bg-gray-200 dark:bg-slate-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-600 font-bold py-2 px-4 rounded-lg text-sm">← Назад</button>
                            <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-base">✓ Сохранить отчет</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
};


const ReportsPage: React.FC<ReportsPageProps> = ({ reports, addReport, deleteReport, updateReport }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const getInitialView = (): ReportView => {
        if (location.state?.view === 'create-manual') return 'create-manual';
        return 'list';
    };

    const [view, setView] = useState<ReportView>(getInitialView());
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    useEffect(() => {
        if (location.state?.view) {
            setView(location.state.view);
            navigate(location.pathname, { replace: true });
        }
    }, [location.state, navigate]);

    const sortedReports = useMemo(() => {
        return [...reports].sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
    }, [reports]);

    const handleOpenReport = (report: Report) => {
        const reportIndex = sortedReports.findIndex(r => r.id === report.id);
        const previousReport = sortedReports[reportIndex + 1];

        const detailedReport: any = { ...report };

        if (previousReport) {
            detailedReport.previousDirections = previousReport.directions;
            detailedReport.previousMetrics = previousReport.metrics;
        }

        setSelectedReport(detailedReport);
        setView('detail');
    };

    const handleSaveReport = (reportData: Omit<Report, 'id'>) => {
        addReport(reportData);
        setView('list');
    };

    const handleDeleteReport = useCallback((id: string) => {
        if (window.confirm('Вы уверены, что хотите удалить этот отчет?')) {
            deleteReport(id);
        }
    }, [deleteReport]);

    const renderContent = () => {
        switch (view) {
            case 'detail':
                return selectedReport ? <ReportDetailView report={selectedReport} onBack={() => setView('list')} updateReport={updateReport} /> : null;
            case 'create-manual':
                return <CreateReportManual onBack={() => setView('list')} onSave={handleSaveReport} reports={reports} />;
            case 'create-upload':
                return <CreateReportUpload onBack={() => setView('list')} onSave={handleSaveReport} reports={reports} />;
            case 'list':
            default:
                return (
                    <div>
                        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                            <div>
                                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Отчеты</h1>
                                <p className="text-slate-500 dark:text-slate-400 mt-1">Здесь хранятся все ваши маркетинговые отчеты</p>
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={() => setView('create-upload')} className="bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2 border border-gray-300 dark:border-slate-700 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.414l-1.293 1.293a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L13 9.414V13H5.5z" /><path d="M9 13h2v5a1 1 0 11-2 0v-5z" /></svg>
                                    <span>Загрузить отчет</span>
                                </button>
                                <button onClick={() => setView('create-manual')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-transform hover:scale-105">+ Создать вручную</button>
                            </div>
                        </div>

                        {sortedReports.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {sortedReports.map(report => (
                                    <ReportCard key={report.id} report={report} onOpen={handleOpenReport} onDelete={handleDeleteReport} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl shadow-md border dark:border-slate-700">
                                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Отчетов пока нет</h2>
                                <p className="text-slate-500 dark:text-slate-400 mt-2">Нажмите "Создать отчет", чтобы добавить первый.</p>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return renderContent();
};

export default ReportsPage;
