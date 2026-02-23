import React, { useMemo, useState, useEffect } from 'react';
import { Report } from '../types';

interface NetConversionsPageProps {
    reports: Report[];
    updateReport: (report: Report) => void;
}

type DirectionKey = 'rti' | '3d';

const EditModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (value: number) => void;
    initialValue: number;
}> = ({ isOpen, onClose, onSave, initialValue }) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold">Редактировать чистые конверсии</h2>
                </div>
                <div className="p-6">
                    <label className="text-sm text-slate-500 block mb-1">Квалифицированные лиды</label>
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => setValue(Number(e.target.value))}
                        className="w-full bg-gray-100 p-2 rounded-lg"
                    />
                </div>
                <div className="p-6 border-t flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="bg-gray-200 hover:bg-gray-300 font-bold py-2 px-4 rounded-lg"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={() => onSave(value)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
};

const clampPercent = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(value, 0), 100);
};

/** нормализуем ключ, чтобы матчить leadsRTI / leads_rti / rtiLeads / leads3D и т.д. */
function normKey(k: string) {
    return k.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** пытаемся найти числовое поле по набору токенов (например: ['lead','leads'] + ['rti']) */
function findNumberByTokens(obj: any, tokens: string[]): number | null {
    if (!obj || typeof obj !== 'object') return null;

    const keys = Object.keys(obj);
    const want = tokens.map(normKey);

    for (const key of keys) {
        const nk = normKey(key);
        const ok = want.every(t => nk.includes(t));
        if (!ok) continue;

        const v = obj[key];
        const n = Number(v);
        if (Number.isFinite(n)) return n;
    }
    return null;
}

/** достаем метрики по направлению:
 *  1) сначала ищем вложенные ветки metrics.rti / metrics.3d / metrics.printing3d и т.п.
 *  2) если нет — ищем плоские поля leadsRTI/leads3D, proposalsRTI/proposals3D и т.п.
 *  3) если и так нет — фоллбек на общий metrics
 */
function pickDirectionalMetrics(report: Report, direction: DirectionKey) {
    const r: any = report;

    const metricsRoot =
        r.metricsByDirection ??
        r.directionMetrics ??
        r.metrics ??
        {};

    // 1) nested-ветки
    const nestedRTI =
        metricsRoot.rti ??
        metricsRoot.RTI ??
        metricsRoot.rtiMetrics ??
        metricsRoot.rti_direction ??
        null;

    const nested3D =
        metricsRoot.d3 ??
        metricsRoot.threeD ??
        metricsRoot.three_d ??
        metricsRoot.printing3d ??
        metricsRoot.printing3D ??
        metricsRoot['3d'] ??
        metricsRoot.d3Metrics ??
        null;

    const nested = direction === 'rti' ? nestedRTI : nested3D;
    const base = nested ?? metricsRoot;

    // если nested найден и в нем есть нормальные поля — используем напрямую
    const direct = {
        leads: Number(base?.leads ?? NaN),
        proposals: Number(base?.proposals ?? NaN),
        invoices: Number(base?.invoices ?? NaN),
        deals: Number(base?.deals ?? NaN),
    };

    const hasDirect =
        Number.isFinite(direct.leads) ||
        Number.isFinite(direct.proposals) ||
        Number.isFinite(direct.invoices) ||
        Number.isFinite(direct.deals);

    // 2) flat-поля (leadsRTI, rtiLeads, leads_3d, proposals3D, invoicesRTI, deals3D, ...)
    const dirToken = direction === 'rti' ? 'rti' : '3d';

    const leads =
        (hasDirect && Number.isFinite(direct.leads) ? direct.leads : null) ??
        findNumberByTokens(metricsRoot, ['leads', dirToken]) ??
        findNumberByTokens(metricsRoot, ['lead', dirToken]) ??
        findNumberByTokens(metricsRoot, [dirToken, 'leads']) ??
        findNumberByTokens(metricsRoot, [dirToken, 'lead']) ??
        0;

    const proposals =
        (hasDirect && Number.isFinite(direct.proposals) ? direct.proposals : null) ??
        findNumberByTokens(metricsRoot, ['proposals', dirToken]) ??
        findNumberByTokens(metricsRoot, ['proposal', dirToken]) ??
        findNumberByTokens(metricsRoot, ['kp', dirToken]) ??
        findNumberByTokens(metricsRoot, [dirToken, 'proposals']) ??
        findNumberByTokens(metricsRoot, [dirToken, 'kp']) ??
        0;

    const invoices =
        (hasDirect && Number.isFinite(direct.invoices) ? direct.invoices : null) ??
        findNumberByTokens(metricsRoot, ['invoices', dirToken]) ??
        findNumberByTokens(metricsRoot, ['invoice', dirToken]) ??
        findNumberByTokens(metricsRoot, [dirToken, 'invoices']) ??
        0;

    const deals =
        (hasDirect && Number.isFinite(direct.deals) ? direct.deals : null) ??
        findNumberByTokens(metricsRoot, ['deals', dirToken]) ??
        findNumberByTokens(metricsRoot, ['deal', dirToken]) ??
        findNumberByTokens(metricsRoot, [dirToken, 'deals']) ??
        0;

    return { leads, proposals, invoices, deals };
}

function pickDirectionalQualifiedLeads(report: Report, direction: DirectionKey) {
    const r: any = report;

    const netRoot =
        r.netMetricsByDirection ??
        r.netByDirection ??
        r.netMetrics ??
        {};

    // nested
    const nestedRTI =
        netRoot.rti ??
        netRoot.RTI ??
        netRoot.rtiMetrics ??
        netRoot.rti_direction ??
        null;

    const nested3D =
        netRoot.d3 ??
        netRoot.threeD ??
        netRoot.three_d ??
        netRoot.printing3d ??
        netRoot.printing3D ??
        netRoot['3d'] ??
        netRoot.d3Metrics ??
        null;

    const nested = direction === 'rti' ? nestedRTI : nested3D;

    // прямое поле внутри ветки
    const direct = nested?.qualifiedLeads;
    if (Number.isFinite(Number(direct))) return Number(direct);

    // flat-поля: qualifiedLeadsRTI / qualifiedRTI / rtiQualifiedLeads / qualifiedLeads3D ...
    const dirToken = direction === 'rti' ? 'rti' : '3d';

    const flat =
        findNumberByTokens(netRoot, ['qualifiedleads', dirToken]) ??
        findNumberByTokens(netRoot, ['qualified', dirToken]) ??
        findNumberByTokens(netRoot, [dirToken, 'qualifiedleads']) ??
        findNumberByTokens(netRoot, [dirToken, 'qualified']) ??
        null;

    if (flat !== null) return flat;

    // fallback старый общий вариант (если у тебя вообще одно поле)
    const fallbackSingle = Number(netRoot?.qualifiedLeads ?? 0);
    return Number.isFinite(fallbackSingle) ? fallbackSingle : 0;
}

function setDirectionalQualifiedLeads(report: Report, direction: DirectionKey, value: number): Report {
    const r: any = report;

    const currentNet =
        r.netMetricsByDirection ??
        r.netByDirection ??
        r.netMetrics ??
        {};

    const nextNet = { ...(currentNet || {}) };

    // если структура словарём по направлениям
    if (nextNet && (nextNet.rti || nextNet.d3 || nextNet.threeD || nextNet.printing3d || nextNet['3d'])) {
        if (direction === 'rti') {
            nextNet.rti = { ...(nextNet.rti || {}), qualifiedLeads: value };
        } else {
            if (nextNet.d3) nextNet.d3 = { ...(nextNet.d3 || {}), qualifiedLeads: value };
            else if (nextNet.threeD) nextNet.threeD = { ...(nextNet.threeD || {}), qualifiedLeads: value };
            else if (nextNet.printing3d) nextNet.printing3d = { ...(nextNet.printing3d || {}), qualifiedLeads: value };
            else if (nextNet['3d']) nextNet['3d'] = { ...(nextNet['3d'] || {}), qualifiedLeads: value };
            else nextNet.d3 = { qualifiedLeads: value };
        }
    } else {
        // flat fallback
        nextNet.qualifiedLeads = value;
    }

    if (r.netMetricsByDirection) return { ...(report as any), netMetricsByDirection: nextNet } as Report;
    if (r.netByDirection) return { ...(report as any), netByDirection: nextNet } as Report;
    return { ...(report as any), netMetrics: nextNet } as Report;
}

const NetConversionsPage: React.FC<NetConversionsPageProps> = ({ reports, updateReport }) => {
    const sortedReports = useMemo(() => {
        if (!reports || reports.length === 0) return [];
        return [...reports].sort(
            (a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()
        );
    }, [reports]);

    const [direction, setDirection] = useState<DirectionKey>('rti');
    const [isEditing, setIsEditing] = useState(false);

    const [selectedReportId, setSelectedReportId] = useState<string | null>(
        sortedReports[0]?.id || null
    );

    // если список отчетов обновился/поменялся — гарантируем валидный selectedReportId
    useEffect(() => {
        if (sortedReports.length === 0) {
            setSelectedReportId(null);
            return;
        }
        const exists = sortedReports.some((rep) => rep.id === selectedReportId);
        if (!selectedReportId || !exists) {
            setSelectedReportId(sortedReports[0].id);
        }
    }, [sortedReports, selectedReportId]);

    const selectedReport = useMemo(() => {
        return sortedReports.find((r) => r.id === selectedReportId) || null;
    }, [sortedReports, selectedReportId]);

    const dataPoints = useMemo(() => {
        if (!selectedReport) {
            return { totalLeads: 0, qualified: 0, proposals: 0, invoices: 0, deals: 0 };
        }

        const m = pickDirectionalMetrics(selectedReport, direction);
        const qualified = pickDirectionalQualifiedLeads(selectedReport, direction);

        return {
            totalLeads: m.leads,
            qualified,
            proposals: m.proposals,
            invoices: m.invoices,
            deals: m.deals,
        };
    }, [selectedReport, direction]);

    const stages = useMemo(() => {
        const { totalLeads, qualified, proposals, invoices, deals } = dataPoints;
        return [
            {
                from: 'Лиды',
                to: 'Квалифицированные',
                fromValue: totalLeads,
                toValue: qualified,
                conversion: totalLeads > 0 ? (qualified / totalLeads) * 100 : 0,
            },
            {
                from: 'Квалифицированные',
                to: 'КП',
                fromValue: qualified,
                toValue: proposals,
                conversion: qualified > 0 ? (proposals / qualified) * 100 : 0,
            },
            {
                from: 'КП',
                to: 'Счета',
                fromValue: proposals,
                toValue: invoices,
                conversion: proposals > 0 ? (invoices / proposals) * 100 : 0,
            },
            {
                from: 'Счета',
                to: 'Реализация',
                fromValue: invoices,
                toValue: deals,
                conversion: invoices > 0 ? (deals / invoices) * 100 : 0,
            },
        ];
    }, [dataPoints]);

    const handleSave = (qualifiedLeadsValue: number) => {
        if (!selectedReport) return;
        const updatedReport = setDirectionalQualifiedLeads(selectedReport, direction, qualifiedLeadsValue);
        updateReport(updatedReport);
        setIsEditing(false);
    };

    const handleDelete = () => {
        if (!selectedReport) return;
        const updatedReport = setDirectionalQualifiedLeads(selectedReport, direction, 0);
        updateReport(updatedReport);
    };

    if (reports.length === 0) {
        return (
            <div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Чистые конверсии</h1>
                <p className="text-slate-500 mb-6">Создайте отчет, чтобы увидеть анализ чистых конверсий.</p>
            </div>
        );
    }

    return (
        <div>
            <EditModal
                isOpen={isEditing}
                onClose={() => setIsEditing(false)}
                onSave={handleSave}
                initialValue={selectedReport ? pickDirectionalQualifiedLeads(selectedReport, direction) : 0}
            />

            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Чистые конверсии</h1>
            <p className="text-slate-500 mt-1 mb-6">Анализ конверсий с квалифицированными лидами</p>

            <div className="flex items-center space-x-1 bg-white p-1 rounded-lg mb-6 self-start max-w-min">
                <button
                    onClick={() => setDirection('rti')}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold ${direction === 'rti' ? 'bg-gray-100 text-slate-800' : 'text-slate-500 hover:bg-gray-50'
                        }`}
                >
                    Направление РТИ
                </button>
                <button
                    onClick={() => setDirection('3d')}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold ${direction === '3d' ? 'bg-gray-100 text-slate-800' : 'text-slate-500 hover:bg-gray-50'
                        }`}
                >
                    Направление 3D
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                    <div className="flex-grow">
                        <label className="text-sm text-slate-500 block mb-1">Выберите отчет для анализа</label>
                        <select
                            value={selectedReportId || ''}
                            onChange={(e) => setSelectedReportId(e.target.value)}
                            className="bg-gray-100 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full md:w-auto"
                        >
                            {sortedReports.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex space-x-2">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="bg-gray-100 hover:bg-gray-200 text-slate-800 font-bold py-2 px-4 rounded-lg text-sm"
                        >
                            Редактировать
                        </button>
                        <button
                            onClick={handleDelete}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-700 font-bold py-2 px-4 rounded-lg text-sm"
                        >
                            Удалить
                        </button>
                    </div>
                </div>

                {selectedReport && (
                    <>
                        <div className="space-y-4 mb-6">
                            <h4 className="font-semibold text-lg text-slate-900">Конверсии за {selectedReport.name}</h4>

                            {stages.map((stage, index) => {
                                const safeConversion = Number.isFinite(stage.conversion) ? stage.conversion : 0;
                                const barWidth = clampPercent(safeConversion);

                                return (
                                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="font-semibold text-slate-800">
                                                {stage.from} → {stage.to}
                                            </p>
                                            <p className="text-xl font-bold text-purple-600">{safeConversion.toFixed(1)}%</p>
                                        </div>

                                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                            <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${barWidth}%` }} />
                                        </div>

                                        <p className="text-xs text-slate-500 mt-2">
                                            {stage.fromValue.toLocaleString()} {stage.from.toLowerCase()} →{' '}
                                            {stage.toValue.toLocaleString()} {stage.to.toLowerCase()}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6 text-center">
                            <p className="text-sm text-blue-800">Общая конверсия (Лиды → Реализация)</p>
                            <p className="text-2xl font-bold text-slate-900 my-1">
                                {dataPoints.totalLeads > 0
                                    ? ((dataPoints.deals / dataPoints.totalLeads) * 100).toFixed(1)
                                    : '0.0'}
                                %
                            </p>
                            <p className="text-xs text-slate-500">
                                Из {dataPoints.totalLeads} лидов реализовано {dataPoints.deals} сделок
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-lg mb-4 text-slate-900">Детальные данные</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-slate-500">Всего лидов</p>
                                    <p className="text-xl font-bold text-slate-800">{dataPoints.totalLeads.toLocaleString()}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-slate-500">Квалифицированные</p>
                                    <p className="text-xl font-bold text-slate-800">{dataPoints.qualified.toLocaleString()}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-slate-500">КП</p>
                                    <p className="text-xl font-bold text-slate-800">{dataPoints.proposals.toLocaleString()}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-slate-500">Счета</p>
                                    <p className="text-xl font-bold text-slate-800">{dataPoints.invoices.toLocaleString()}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-slate-500">Реализовано</p>
                                    <p className="text-xl font-bold text-slate-800">{dataPoints.deals.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default NetConversionsPage;