
import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Report } from '../types';
import { formatCurrency, formatNumber } from '../utils';

interface ShewhartChartPageProps {
    reports: Report[];
}

type CategoryKey = 'marketing' | 'sales';
type MetricKey = 'budget' | 'clicks' | 'cpl' | 'cpc' | 'revenue' | 'deals' | 'avgCheck' | 'cr';

interface MetricConfig {
    label: string;
    format: (v: number) => string;
    calc: (m: any) => number;
}

const ShewhartChartPage: React.FC<ShewhartChartPageProps> = ({ reports }) => {
    const [activeCategory, setActiveCategory] = useState<CategoryKey>('marketing');
    const [selectedMetric, setSelectedMetric] = useState<MetricKey>('budget');
    const [selectedDirection, setSelectedDirection] = useState<'all' | 'РТИ' | '3D'>('all');

    const config: Record<MetricKey, MetricConfig> = {
        budget: { label: 'Рекламный бюджет', format: formatCurrency, calc: m => m.budget },
        clicks: { label: 'Клики', format: formatNumber, calc: m => m.clicks },
        cpl: { label: 'CPL (Цена за лид)', format: formatCurrency, calc: m => m.leads > 0 ? m.budget / m.leads : 0 },
        cpc: { label: 'CPC (Цена за клик)', format: formatCurrency, calc: m => m.clicks > 0 ? m.budget / m.clicks : 0 },
        revenue: { label: 'Выручка', format: formatCurrency, calc: m => m.sales },
        deals: { label: 'Кол-во сделок', format: formatNumber, calc: m => m.deals },
        avgCheck: { label: 'Средний чек', format: formatCurrency, calc: m => m.deals > 0 ? m.sales / m.deals : 0 },
        cr: { label: 'Конверсия в продажу', format: (v) => `${v.toFixed(2)}%`, calc: m => m.leads > 0 ? (m.deals / m.leads) * 100 : 0 }
    };

    const categories: Record<CategoryKey, { label: string; metrics: MetricKey[] }> = {
        marketing: {
            label: 'Контроль маркетинга',
            metrics: ['budget', 'clicks', 'cpl', 'cpc']
        },
        sales: {
            label: 'Контроль продаж',
            metrics: ['revenue', 'deals', 'avgCheck', 'cr']
        }
    };

    // Ensure metric matches category on switch
    const currentMetrics = categories[activeCategory].metrics;
    const safeMetric = currentMetrics.includes(selectedMetric) ? selectedMetric : currentMetrics[0];

    const sortedReports = useMemo(() => {
        return [...reports].sort((a, b) => new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime());
    }, [reports]);

    const chartData = useMemo(() => {
        if (sortedReports.length === 0) return [];

        return sortedReports.map(r => {
            const metrics = selectedDirection === 'all' ? r.metrics : (r.directions[selectedDirection] || { budget: 0, clicks: 0, leads: 0, proposals: 0, invoices: 0, deals: 0, sales: 0 });
            return {
                name: r.name.replace('Отчет ', ''),
                value: config[safeMetric].calc(metrics),
                originalDate: r.creationDate
            };
        });
    }, [sortedReports, safeMetric, selectedDirection]);

    const stats = useMemo(() => {
        if (chartData.length === 0) return { mean: 0, stdDev: 0, ucl: 0, lcl: 0, outOfControl: [] };

        const values = chartData.map(d => d.value);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(v => Math.pow(v - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        const stdDev = Math.sqrt(avgSquareDiff);

        const ucl = mean + 3 * stdDev;
        const lcl = Math.max(0, mean - 3 * stdDev);

        const outOfControl = chartData.filter(d => d.value > ucl || d.value < lcl);

        return { mean, stdDev, ucl, lcl, outOfControl };
    }, [chartData]);

    const renderTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const isOut = data.value > stats.ucl || data.value < stats.lcl;
            return (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{label}</p>
                    <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                        {config[safeMetric].format(data.value)}
                    </p>
                    {isOut && (
                        <div className="mt-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded">
                            ⚠️ Стат. аномалия
                        </div>
                    )}
                    <div className="mt-2 pt-2 border-t dark:border-slate-700 space-y-1">
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Среднее: {config[safeMetric].format(stats.mean)}</p>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (reports.length < 3) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="text-6xl mb-6 grayscale opacity-50">📉</div>
                <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">Недостаточно данных для анализа</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md">Статистический аудит Шухарта требует минимум 3 отчета для корректного расчета границ Sigma-контроля.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header and Controls */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Карта Шухарта</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Статистический мониторинг стабильности бизнес-процессов</p>
                </div>
                <div className="flex items-center space-x-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
                    {Object.entries(categories).map(([key, cat]) => (
                        <button
                            key={key}
                            onClick={() => { setActiveCategory(key as CategoryKey); setSelectedMetric(categories[key as CategoryKey].metrics[0]); }}
                            className={`px-4 py-2 rounded-md font-semibold text-sm transition-all ${activeCategory === key ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sub-Filters Grid */}
            <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md">
                <div className="flex flex-col">
                    <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">Метрика анализа</label>
                    <select
                        value={safeMetric}
                        onChange={(e) => setSelectedMetric(e.target.value as MetricKey)}
                        className="bg-gray-100 dark:bg-slate-700 dark:text-slate-200 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 px-3 py-2 cursor-pointer"
                    >
                        {categories[activeCategory].metrics.map((m) => (
                            <option key={m} value={m}>{config[m].label}</option>
                        ))}
                    </select>
                </div>
                <div className="w-px h-10 bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>
                <div className="flex flex-col">
                    <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">Направление</label>
                    <select
                        value={selectedDirection}
                        onChange={(e) => setSelectedDirection(e.target.value as any)}
                        className="bg-gray-100 dark:bg-slate-700 dark:text-slate-200 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 px-3 py-2 cursor-pointer"
                    >
                        <option value="all">Весь бизнес</option>
                        <option value="РТИ">РТИ</option>
                        <option value="3D">3D</option>
                    </select>
                </div>
            </div>

            {/* Stats Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Состояние процесса</p>
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${stats.outOfControl.length === 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <h2 className="text-xl font-bold dark:text-slate-100">{stats.outOfControl.length === 0 ? 'Стабилен' : 'Есть выбросы'}</h2>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                        {stats.outOfControl.length === 0
                            ? 'Процесс управляем. Вариации вызваны только естественным шумом системы.'
                            : `Обнаружено ${stats.outOfControl.length} аномалий. Процесс статистически нестабилен.`}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Среднее (CL)</p>
                    <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {config[safeMetric].format(stats.mean)}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Центральная линия нормы для выбранного периода.</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Контрольные границы (3σ)</p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-slate-500 dark:text-slate-400">ВГК (UCL):</span>
                            <span className="font-bold text-red-500 tabular-nums">{config[safeMetric].format(stats.ucl)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-slate-500 dark:text-slate-400">НГК (LCL):</span>
                            <span className="font-bold text-orange-500 tabular-nums">{config[safeMetric].format(stats.lcl)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Control Chart */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md overflow-hidden relative group">
                <div className="absolute top-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-500">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div> Границы контроля
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> Фактические данные
                    </div>
                </div>
                <div className="h-[450px] w-full tabular-nums">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                                domain={['auto', (dataMax: number) => Math.max(dataMax, stats.ucl) * 1.1]}
                            />
                            <Tooltip content={renderTooltip} cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }} />

                            {/* Central Line */}
                            <ReferenceLine y={stats.mean} stroke="#94a3b8" strokeDasharray="5 5" label={{ value: 'Norm', position: 'right', fill: '#94a3b8', fontSize: 9, fontWeight: 'bold' }} />

                            {/* UCL / LCL Lines */}
                            <ReferenceLine y={stats.ucl} stroke="#ef4444" strokeDasharray="2 2" strokeWidth={1} label={{ value: 'UCL', position: 'insideTopRight', fill: '#ef4444', fontSize: 9, fontWeight: 'bold' }} />
                            <ReferenceLine y={stats.lcl} stroke="#f97316" strokeDasharray="2 2" strokeWidth={1} label={{ value: 'LCL', position: 'insideBottomRight', fill: '#f97316', fontSize: 9, fontWeight: 'bold' }} />

                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#2563eb"
                                strokeWidth={4}
                                animationDuration={1000}
                                dot={(props: any) => {
                                    const isOut = props.payload.value > stats.ucl || props.payload.value < stats.lcl;
                                    return (
                                        <circle
                                            cx={props.cx}
                                            cy={props.cy}
                                            r={isOut ? 6 : 4}
                                            fill={isOut ? '#ef4444' : '#2563eb'}
                                            stroke="white"
                                            strokeWidth={2}
                                            className={isOut ? 'animate-pulse' : ''}
                                        />
                                    );
                                }}
                                activeDot={{ r: 8, strokeWidth: 0, fill: '#3b82f6' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* AI Summary Interpretation */}
            <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-100 dark:border-blue-800/40 flex flex-col md:flex-row gap-6 items-center">
                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0 shadow-md text-3xl">🧠</div>
                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-blue-900 dark:text-blue-200">Аналитическая интерпретация Lumi</h3>
                    <p className="text-sm text-blue-800/80 dark:text-blue-300/80 leading-relaxed font-medium">
                        "{stats.outOfControl.length === 0
                            ? `Процесс ${categories[activeCategory].label.toLowerCase()} демонстрирует высокую статистическую устойчивость. Текущие колебания метрики "${config[safeMetric].label}" являются частью нормального функционирования системы. Резких изменений в стратегии не требуется.`
                            : `Внимание! Обнаружены аномальные отклонения в "${config[safeMetric].label}". Точки вне границ сигнализируют о наличии внешних факторов воздействия: возможно, это резкое изменение конкурентной среды, ошибка в настройках или сезонный сдвиг. Рекомендуется детальный аудит событий за эти периоды.`}"
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ShewhartChartPage;
