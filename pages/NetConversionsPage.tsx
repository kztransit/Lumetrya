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

    const handleSaveClick = () => {
        onSave(value);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold">Редактировать чистые конверсии</h2>
                </div>
                <div className="p-6">
                    <label className="text-sm text-slate-500 block mb-1">
                        Квалифицированные лиды
                    </label>
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
                        onClick={handleSaveClick}
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

/**
 * IMPORTANT:
 * В проекте метрики уже разделены по направлениям, но на этой странице
 * раньше использовались "общие" selectedReport.metrics / selectedReport.netMetrics.
 *
 * Мы НЕ трогаем типы и структуру данных. Просто аккуратно читаем нужную ветку.
 * Поддерживаем разные возможные ключи: rti / rtiMetrics, threeD / d3 / printing3d и т.п.
 */
function pickDirectionalMetrics(report: Report, direction: DirectionKey) {
    const anyReport = report as any;

    const metricsRoot =
        anyReport.metricsByDirection ??
        anyReport.directionMetrics ??
        anyReport.metrics ??
        {};

    // пробуем несколько распространённых ключей
    const rti =
        metricsRoot.rti ??
        metricsRoot.RTI ??
        metricsRoot.rtiMetrics ??
        metricsRoot.rti_direction ??
        null;

    const d3 =
        metricsRoot.d3 ??
        metricsRoot.threeD ??
        metricsRoot.three_d ??
        metricsRoot.printing3d ??
        metricsRoot.printing3D ??
        metricsRoot['3d'] ??
        metricsRoot.d3Metrics ??
        null;

    const chosen = direction === 'rti' ? (rti ?? metricsRoot) : (d3 ?? metricsRoot);

    return {
        leads: Number(chosen?.leads ?? 0),
        proposals: Number(chosen?.proposals ?? 0),
        invoices: Number(chosen?.invoices ?? 0),
        deals: Number(chosen?.deals ?? 0),
    };
}

function pickDirectionalQualifiedLeads(report: Report, direction: DirectionKey) {
    const anyReport = report as any;

    const netRoot =
        anyReport.netMetricsByDirection ??
        anyReport.netByDirection ??
        anyReport.netMetrics ??
        {};

    const rti =
        netRoot.rti ??
        netRoot.RTI ??
        netRoot.rtiMetrics ??
        netRoot.rti_direction ??
        null;

    const d3 =
        netRoot.d3 ??
        netRoot.threeD ??
        netRoot.three_d ??
        netRoot.printing3d ??
        netRoot.printing3D ??
        netRoot['3d'] ??
        netRoot.d3Metrics ??
        null;

    // если у тебя netMetrics по-старому (одним полем) — аккуратно читаем и это
    const fallbackSingle = Number(netRoot?.qualifiedLeads ?? 0);

    const chosen = direction === 'rti' ? rti : d3;
    const value = chosen?.qualifiedLeads;

    return Number(value ?? fallbackSingle ?? 0);
}

function setDirectionalQualifiedLeads(report: Report, direction: DirectionKey, value: number): Report {
    const anyReport = report as any;

    // пытаемся обновить то, что уже есть: netMetricsByDirection / netByDirection / netMetrics.rti / netMetrics.3d
    const currentNet =
        anyReport.netMetricsByDirection ??
        anyReport.netByDirection ??
        anyReport.netMetrics ??
        {};

    const nextNet = { ...(currentNet || {}) };

    // если структура уже словарём по направлениям
    if (nextNet && (nextNet.rti || nextNet.d3 || nextNet.threeD || nextNet.printing3d || nextNet['3d'])) {
        if (direction === 'rti') {
            nextNet.rti = { ...(nextNet.rti || {}), qualifiedLeads: value };
        } else {
            // нормализуем в один ключ d3, но не ломаем существующие
            if (nextNet.d3) nextNet.d3 = { ...(nextNet.d3 || {}), qualifiedLeads: value };
            else if (nextNet.threeD) nextNet.threeD = { ...(nextNet.threeD || {}), qualifiedLeads: value };
            else if (nextNet.printing3d) nextNet.printing3d = { ...(nextNet.printing3d || {}), qualifiedLeads: value };
            else if (nextNet['3d']) nextNet['3d'] = { ...(nextNet['3d'] || {}), qualifiedLeads: value };
            else nextNet.d3 = { qualifiedLeads: value };
        }
    } else {
        // если пока только одно поле (старый вариант) — обновим его, чтобы не сломать
        nextNet.qualifiedLeads = value;
    }

    // кладём обратно в тот же контейнер, который был исходно
    if (anyReport.netMetricsByDirection) {
        return { ...(report as any), netMetricsByDirection: nextNet } as Report;
    }
    if (anyReport.netByDirection) {
        return { ...(report as any), netByDirection: nextNet } as Report;
    }
    return { ...(report as any), netMetrics: nextNet } as Report;
}

const NetConversionsPage: React.FC<NetConversionsPageProps> = ({
    reports,
    updateReport,
}) => {
    const sortedReports = useMemo(() => {
        if (!reports || reports.length === 0) return [];
        return [...reports].sort(
            (a, b) =>
                new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()
        );
    }, [reports]);

    const [selectedReportId, setSelectedReportId] = useState<string | null>(
        sortedReports[0]?.id || null
    );
    const [isEditing, setIsEditing] = useState(false);

    // ✅ добавили реальный state направления
    const [direction, setDirection] = useState<DirectionKey>('rti');

    // если список отчетов обновился/поменялся — гарантируем валидный selectedReportId
    useEffect(() => {
        if (sortedReports.length === 0) {
            setSelectedReportId(null);
            return;
        }
        const exists = sortedReports.some((r) => r.id === selectedReportId);
        if (!selectedReportId || !exists) {
            setSelectedReportId(sortedReports[0].id);
        }
    }, [sortedReports, selectedReportId]);

    const selectedReport = useMemo(() => {
        return sortedReports.find((r) => r.id === selectedReportId) || null;
    }, [sortedReports, selectedReportId]);

    // ✅ теперь читаем метрики ТОЛЬКО по выбранному направлению
    const dataPoints = useMemo(() => {
        if (!selectedReport)
            return { totalLeads: 0, qualified: 0, proposals: 0, invoices: 0, deals: 0 };

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

    // ✅ сохраняем qualifiedLeads в разрезе направления (если структура уже раздельная)
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
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                    Чистые конверсии
                </h1>
                <p className="text-slate-500 mb-6">
                    Создайте отчет, чтобы увидеть анализ чистых конверсий.
                </p>
            </div>
        );
    }

    return (
        <div>
            <EditModal
                isOpen={isEditing}
                onClose={() => setIsEditing(false)}
                onSave={handleSave}
                // ✅ initialValue теперь тоже из выбранного направления
                initialValue={selectedReport ? pickDirectionalQualifiedLeads(selectedReport, direction) : 0}
            />

            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                Чистые конверсии
            </h1>
            <p className="text-slate-500 mt-1 mb-6">
                Анализ конверсий с квалифицированными лидами
            </p>

            {/* ✅ табы теперь реально переключают направление */}
            <div className="flex items-center space-x-1 bg-white p-1 rounded-lg mb-6 self-start max-w-min">
                <button
                    onClick={() => setDirection('rti')}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold ${direction === 'rti'
                        ? 'bg-gray-100 text-slate-800'
                        : 'text-slate-500 hover:bg-gray-50'
                        }`}
                >
                    Направление РТИ
                </button>
                <button
                    onClick={() => setDirection('3d')}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold ${direction === '3d'
                        ? 'bg-gray-100 text-slate-800'
                        : 'text-slate-500 hover:bg-gray-50'
                        }`}
                >
                    Направление 3D
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                    <div className="flex-grow">
                        <label className="text-sm text-slate-500 block mb-1">
                            Выберите отчет для анализа
                        </label>
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
                            <h4 className="font-semibold text-lg text-slate-900">
                                Конверсии за {selectedReport.name}
                            </h4>

                            {stages.map((stage, index) => {
                                const safeConversion = Number.isFinite(stage.conversion)
                                    ? stage.conversion
                                    : 0;
                                const barWidth = clampPercent(safeConversion);

                                return (
                                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="font-semibold text-slate-800">
                                                {stage.from} → {stage.to}
                                            </p>
                                            <p className="text-xl font-bold text-purple-600">
                                                {safeConversion.toFixed(1)}%
                                            </p>
                                        </div>

                                        {/* FIX: не даём полоске выходить за 100% */}
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                            <div
                                                className="bg-purple-600 h-2.5 rounded-full"
                                                style={{ width: `${barWidth}%` }}
                                            />
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
                            <p className="text-sm text-blue-800">
                                Общая конверсия (Лиды → Реализация)
                            </p>
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
                            <h4 className="font-semibold text-lg mb-4 text-slate-900">
                                Детальные данные
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-slate-500">Всего лидов</p>
                                    <p className="text-xl font-bold text-slate-800">
                                        {dataPoints.totalLeads.toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-slate-500">Квалифицированные</p>
                                    <p className="text-xl font-bold text-slate-800">
                                        {dataPoints.qualified.toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-slate-500">КП</p>
                                    <p className="text-xl font-bold text-slate-800">
                                        {dataPoints.proposals.toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-slate-500">Счета</p>
                                    <p className="text-xl font-bold text-slate-800">
                                        {dataPoints.invoices.toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-slate-500">Реализовано</p>
                                    <p className="text-xl font-bold text-slate-800">
                                        {dataPoints.deals.toLocaleString()}
                                    </p>
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