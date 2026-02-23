import React, { useMemo, useState, useEffect } from 'react';
import { Report } from '../types';

interface NetConversionsPageProps {
    reports: Report[];
    updateReport: (report: Report) => void;
}

// UI-ключи направлений в твоих данных:
type DirectionLabel = 'РТИ' | '3D';

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

const EMPTY_DIR_METRICS = {
    budget: 0,
    clicks: 0,
    leads: 0,
    proposals: 0,
    invoices: 0,
    deals: 0,
    sales: 0,
};

function getDirectionMetrics(report: Report, direction: DirectionLabel) {
    const r: any = report;
    const dir = (r.directions?.[direction] ?? EMPTY_DIR_METRICS) as any;

    return {
        leads: Number(dir.leads ?? 0),
        proposals: Number(dir.proposals ?? 0),
        invoices: Number(dir.invoices ?? 0),
        deals: Number(dir.deals ?? 0),
    };
}

/**
 * qualifiedLeads храним в report.directions[direction].qualifiedLeads
 * (с fallback на старый report.netMetrics.qualifiedLeads, если еще не было разнесено)
 */
function getQualifiedLeads(report: Report, direction: DirectionLabel) {
    const r: any = report;
    const fromDirections = r.directions?.[direction]?.qualifiedLeads;

    const n1 = Number(fromDirections);
    if (Number.isFinite(n1)) return n1;

    const legacy = Number(r.netMetrics?.qualifiedLeads ?? 0);
    return Number.isFinite(legacy) ? legacy : 0;
}

function setQualifiedLeads(report: Report, direction: DirectionLabel, value: number): Report {
    const r: any = report;

    const nextDirections = { ...(r.directions ?? {}) };
    const currentDir = nextDirections[direction] ?? { ...EMPTY_DIR_METRICS };

    nextDirections[direction] = {
        ...currentDir,
        qualifiedLeads: value,
    };

    // ВАЖНО: не трогаем report.metrics, чтобы не ломать другие разделы.
    // Можно (опционально) оставить legacy поле, но лучше не мешать:
    // r.netMetrics?.qualifiedLeads — будет просто fallback’ом.
    return {
        ...(report as any),
        directions: nextDirections,
    } as Report;
}

const NetConversionsPage: React.FC<NetConversionsPageProps> = ({ reports, updateReport }) => {
    const sortedReports = useMemo(() => {
        if (!reports || reports.length === 0) return [];
        return [...reports].sort(
            (a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()
        );
    }, [reports]);

    const [direction, setDirection] = useState<DirectionLabel>('РТИ');
    const [isEditing, setIsEditing] = useState(false);

    const [selectedReportId, setSelectedReportId] = useState<string | null>(
        sortedReports[0]?.id || null
    );

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

        const m = getDirectionMetrics(selectedReport, direction);
        const qualified = getQualifiedLeads(selectedReport, direction);

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
        const updatedReport = setQualifiedLeads(selectedReport, direction, qualifiedLeadsValue);
        updateReport(updatedReport);
        setIsEditing(false);
    };

    const handleDelete = () => {
        if (!selectedReport) return;
        const updatedReport = setQualifiedLeads(selectedReport, direction, 0);
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
                initialValue={selectedReport ? getQualifiedLeads(selectedReport, direction) : 0}
            />

            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Чистые конверсии</h1>
            <p className="text-slate-500 mt-1 mb-6">Анализ конверсий с квалифицированными лидами</p>

            <div className="flex items-center space-x-1 bg-white p-1 rounded-lg mb-6 self-start max-w-min">
                <button
                    onClick={() => setDirection('РТИ')}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold ${direction === 'РТИ' ? 'bg-gray-100 text-slate-800' : 'text-slate-500 hover:bg-gray-50'
                        }`}
                >
                    Направление РТИ
                </button>
                <button
                    onClick={() => setDirection('3D')}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold ${direction === '3D' ? 'bg-gray-100 text-slate-800' : 'text-slate-500 hover:bg-gray-50'
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