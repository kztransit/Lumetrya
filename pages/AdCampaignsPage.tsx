
import React, { useState, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AdCampaign, AdCampaignAuditReport, AdCampaignAuditItem, UserData } from '../types';
import { fileToBase64, formatCurrency, formatNumber, formatFullDate } from '../utils';
import { analyzeCampaignsDetailed, runCampaignAuditStructured } from '../services/geminiService';

interface AdCampaignsPageProps {
    campaigns: AdCampaign[];
    addCampaign: (campaign: Omit<AdCampaign, 'id'>) => void;
    deleteCampaign: (id: string) => void;
    setCampaigns: (campaigns: AdCampaign[] | ((prev: AdCampaign[]) => AdCampaign[])) => void;
    userData: UserData;
    updateUserData: (data: UserData) => void;
}

const statusColorMap: { [key: string]: string } = {
    'Включено': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    'Eligible': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    'Допущено': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    'Приостановлено': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    'Завершено': 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300',
};

const efficiencyColorMap: { [key: string]: string } = {
    'Высокая': 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    'Средняя': 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
    'Низкая': 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
};

const AddCampaignModal: React.FC<{ onClose: () => void, onSave: (campaign: Omit<AdCampaign, 'id'>) => void }> = ({ onClose, onSave }) => {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newCampaign = {
            name: formData.get('name') as string,
            status: formData.get('status') as AdCampaign['status'],
            type: formData.get('type') as AdCampaign['type'],
            budget: Number(formData.get('budget')),
            budgetType: formData.get('budgetType') as AdCampaign['budgetType'],
            impressions: 0, clicks: 0, ctr: 0, spend: 0, conversions: 0, cpc: 0, conversionRate: 0, cpa: 0,
            strategy: 'Максимум конверсий',
            period: new Date().toLocaleDateString(),
        };
        onSave(newCampaign);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
                <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Добавить кампанию</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-2xl">&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 bg-gray-50/50 dark:bg-slate-900/50">
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">Название кампании</label>
                            <input required name="name" type="text" className="w-full bg-white dark:bg-slate-700 dark:text-slate-200 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">Статус</label>
                                <select name="status" className="w-full bg-white dark:bg-slate-700 dark:text-slate-200 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm">
                                    <option>Включено</option>
                                    <option>Приостановлено</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">Тип кампании</label>
                                <select name="type" className="w-full bg-white dark:bg-slate-700 dark:text-slate-200 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm">
                                    <option>Поиск</option>
                                    <option>Максимальная эффективность</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">Бюджет</label>
                                <input name="budget" type="number" className="w-full bg-white dark:bg-slate-700 dark:text-slate-200 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">Тип бюджета</label>
                                <select name="budgetType" className="w-full bg-white dark:bg-slate-700 dark:text-slate-200 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm">
                                    <option>Дневной</option>
                                    <option>На весь срок</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-800">
                        <button type="button" onClick={onClose} className="bg-gray-100 dark:bg-slate-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 font-bold py-2.5 px-6 rounded-xl text-sm transition-all">Отмена</button>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-xl text-sm shadow-md transition-all active:scale-95 uppercase tracking-widest">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>
    )
};

const AuditRow: React.FC<{ audit: AdCampaignAuditItem }> = ({ audit }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border-b border-slate-50 dark:border-slate-800 last:border-0">
            <div
                onClick={() => setExpanded(!expanded)}
                className="flex items-center justify-between p-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
            >
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate">{audit.campaignName}</h4>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{audit.verdict}</p>
                </div>
                <div className="flex items-center gap-6 tabular-nums">
                    <div className="text-center w-24">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${efficiencyColorMap[audit.efficiency] || ''}`}>
                            {audit.efficiency}
                        </span>
                    </div>
                    <div className="text-center w-16">
                        <span className={`text-lg font-black ${audit.score >= 8 ? 'text-green-600' : audit.score >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {audit.score}/10
                        </span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>
            {expanded && (
                <div className="p-5 bg-slate-50/50 dark:bg-slate-900/20 space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                Сильные стороны
                            </p>
                            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc ml-4">
                                {audit.pros.map((p, i) => <li key={i}>{p}</li>)}
                            </ul>
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                Точки роста
                            </p>
                            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc ml-4">
                                {audit.cons.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                        </div>
                    </div>
                    <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5">Рекомендация Lumi</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed italic">"{audit.recommendation}"</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const splitCSVRow = (row: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result.map(val => val.replace(/^"|"$/g, ''));
};

const parseGoogleAdsCSV = (text: string): Omit<AdCampaign, 'id'>[] => {
    // Clean text from BOM or weird starting characters
    const cleanText = text.replace(/^\uFEFF/, '').trim();
    const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return [];

    // Find header row (skip Google Ads metadata if present)
    let headerIndex = -1;
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
        const lowerLine = lines[i].toLowerCase();
        if (lowerLine.includes('campaign') || lowerLine.includes('кампания') || lowerLine.includes('campaign name')) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) return [];

    // Detect delimiter from the header row
    const headerLine = lines[headerIndex];
    let delimiter = ',';
    const delimiters = [',', ';', '\t'];
    let maxCols = 0;
    delimiters.forEach(d => {
        const cols = headerLine.split(d).length;
        if (cols > maxCols) {
            maxCols = cols;
            delimiter = d;
        }
    });

    const headers = splitCSVRow(headerLine, delimiter);
    const rows = lines.slice(headerIndex + 1);

    const getFieldIndex = (names: string[]) => {
        const lowerHeaders = headers.map(h => h.trim().toLowerCase());
        const lowerNames = names.map(n => n.toLowerCase());

        // Priority 1: Exact matches
        for (const name of lowerNames) {
            const idx = lowerHeaders.indexOf(name);
            if (idx !== -1) return idx;
        }

        // Priority 2: Includes, with negative lookahead for common confusions
        for (const name of lowerNames) {
            const matches = lowerHeaders.findIndex((h) => {
                if (!h.includes(name)) return false;

                // Common abbreviations and exclusions
                const excludes = ['rate', 'cost', 'cpc', 'cpa', 'avg', 'сред', 'цена', 'стоимость', 'коэф', 'доля', 'share', 'conversion', 'конверс'];

                // If the name we're looking for is NOT in the excludes, but the header IS, then reject
                for (const ex of excludes) {
                    if (h.includes(ex) && !name.includes(ex)) {
                        return false;
                    }
                }
                return true;
            });
            if (matches !== -1) return matches;
        }
        return -1;
    };

    const idx = {
        name: getFieldIndex(['Campaign', 'Кампания', 'Campaign name']),
        type: getFieldIndex(['Campaign type', 'Тип кампании']),
        status: getFieldIndex(['Campaign status', 'Статус']),
        budget: getFieldIndex(['Budget', 'Бюджет']),
        impressions: getFieldIndex(['Impressions', 'Показы', 'Impr.']),
        clicks: getFieldIndex(['Clicks', 'Клики', 'Interactions', 'Взаимодействия']),
        spend: getFieldIndex(['Cost', 'Стоимость', 'Расходы', 'Spend']),
        conversions: getFieldIndex(['Conversions', 'Конверсии']),
        currency: getFieldIndex(['Currency code', 'Код валюты']),
        period: getFieldIndex(['Day', 'Date', 'Month', 'Period', 'День', 'Дата', 'Период', 'Месяц'])
    };

    // If we can't find name or spend, it's likely not a valid report
    if (idx.name === -1 || (idx.spend === -1 && idx.impressions === -1)) return [];

    return rows.map(row => {
        const cells = splitCSVRow(row, delimiter);
        if (cells.length < headers.length) return null;

        const parseNum = (val: string, isInteger: boolean = false) => {
            if (!val) return 0;
            // Clean everything except digits, dots, commas and minus
            let clean = val.replace(/\s/g, '').replace(/\u00A0/g, '').replace(/[^\d.,-]/g, '');

            if (clean.includes(',') && clean.includes('.')) {
                // Determine which is decimal: usually the last one
                if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
                    clean = clean.replace(/\./g, '').replace(',', '.');
                } else {
                    clean = clean.replace(/,/g, '');
                }
            } else if (clean.includes(',') || clean.includes('.')) {
                const separator = clean.includes(',') ? ',' : '.';
                const parts = clean.split(separator);
                // If it's an integer field and we have exactly 3 digits after separator, it's likely a thousands separator (e.g. 1,234)
                if (isInteger && parts.length === 2 && parts[1].length === 3) {
                    clean = clean.replace(separator, '');
                } else {
                    // Otherwise treat as decimal separator
                    clean = clean.replace(',', '.');
                }
            }
            const num = parseFloat(clean);
            return isNaN(num) ? 0 : num;
        };

        const parseDate = (val: string) => {
            if (!val) return new Date().toISOString();
            const parts = val.split(/[./-]/);
            if (parts.length === 3) {
                let day, month, year;
                if (parts[2].length === 4) { // DD.MM.YYYY
                    day = parseInt(parts[0]);
                    month = parseInt(parts[1]) - 1;
                    year = parseInt(parts[2]);
                } else if (parts[0].length === 4) { // YYYY.MM.DD
                    year = parseInt(parts[0]);
                    month = parseInt(parts[1]) - 1;
                    day = parseInt(parts[2]);
                } else {
                    const d = new Date(val);
                    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
                }
                const d = new Date(year, month, day);
                return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
            }
            const d = new Date(val);
            return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
        };

        const currencyCode = cells[idx.currency] || 'KZT';
        const isValidCurrency = /^[A-Z]{3}$/.test(currencyCode);

        const budget = parseNum(cells[idx.budget]);
        const impressions = parseNum(cells[idx.impressions], true);
        const clicks = parseNum(cells[idx.clicks], true);
        const spend = parseNum(cells[idx.spend]);
        const conversions = parseNum(cells[idx.conversions]);

        return {
            name: cells[idx.name] || 'N/A',
            type: cells[idx.type] || 'Поиск',
            status: cells[idx.status] || 'Включено',
            budget,
            budgetType: 'Дневной',
            impressions,
            clicks,
            ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
            spend,
            conversions,
            cpc: clicks > 0 ? spend / clicks : 0,
            conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
            cpa: conversions > 0 ? spend / conversions : 0,
            strategy: 'Максимум конверсий',
            period: parseDate(cells[idx.period]),
            currencyCode: isValidCurrency ? currencyCode : 'KZT'
        };
    }).filter(c => c !== null) as Omit<AdCampaign, 'id'>[];
};

const AdCampaignsPage: React.FC<AdCampaignsPageProps> = ({ campaigns, addCampaign, deleteCampaign, setCampaigns, userData, updateUserData }) => {
    const [activeSubTab, setActiveSubTab] = useState<'list' | 'audit'>('list');
    const [isAdding, setIsAdding] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [filters, setFilters] = useState({ status: '', type: '' });
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Audit specific state
    const [isAuditing, setIsAuditing] = useState(false);

    // Sorting state
    const [sortConfig, setSortConfig] = useState<{ key: keyof AdCampaign; direction: 'asc' | 'desc' } | null>({ key: 'spend', direction: 'desc' });

    const requestSort = (key: keyof AdCampaign) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Get unique months from all campaigns
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        campaigns.forEach(c => {
            const date = new Date(c.period);
            if (!isNaN(date.getTime())) {
                const monthName = date.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
                if (monthName) {
                    months.add(monthName.charAt(0).toUpperCase() + monthName.slice(1));
                }
            }
        });
        return Array.from(months).sort((a, b) => {
            // Sort descending by date
            const parse = (s: string) => {
                const parts = s.split(' ');
                const m = parts[0];
                const y = parts[1];
                const monthsRu = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
                const monthIdx = monthsRu.indexOf(m.toLowerCase());
                return new Date(parseInt(y), monthIdx === -1 ? 0 : monthIdx).getTime();
            };
            return parse(b) - parse(a);
        });
    }, [campaigns]);

    // Set initial month if not set
    React.useEffect(() => {
        if (!selectedMonth && availableMonths.length > 0) {
            setSelectedMonth(availableMonths[0]);
        }
    }, [availableMonths, selectedMonth]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            if (file.name.endsWith('.csv')) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const text = event.target?.result as string;
                    const imported = parseGoogleAdsCSV(text);

                    if (imported.length > 0) {
                        // Extract month from the first imported campaign
                        const firstDate = new Date(imported[0].period);
                        let targetMonth = '';
                        if (!isNaN(firstDate.getTime())) {
                            const monthName = firstDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
                            targetMonth = monthName ? (monthName.charAt(0).toUpperCase() + monthName.slice(1)) : '';
                        } else {
                            // Fallback to current month if date parsing failed
                            const d = new Date();
                            const m = d.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
                            targetMonth = m ? (m.charAt(0).toUpperCase() + m.slice(1)) : '';
                        }

                        const newCampaignsWithId = imported.map(c => ({
                            ...c,
                            id: uuidv4(),
                            ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
                            cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
                            conversionRate: c.clicks > 0 ? (c.conversions / c.clicks) * 100 : 0,
                            cpa: c.conversions > 0 ? c.spend / c.conversions : 0,
                            period: c.period // Ensure we use the parsed date
                        }));

                        // Filter out existing campaigns for the SAME month
                        setCampaigns(prev => {
                            const filteredPrev = prev.filter(c => {
                                const d = new Date(c.period);
                                if (isNaN(d.getTime())) return true; // Keep if invalid date
                                const m = d.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
                                const currentMonth = m ? (m.charAt(0).toUpperCase() + m.slice(1)) : '';
                                return currentMonth !== targetMonth;
                            });
                            return [...newCampaignsWithId, ...filteredPrev];
                        });

                        setSelectedMonth(targetMonth);
                        alert(`Импортировано ${newCampaignsWithId.length} кампаний за ${targetMonth}. Данные за этот месяц обновлены.`);
                    } else {
                        alert("Не удалось распознать формат CSV отчета Google Ads.");
                    }
                };
                reader.readAsText(file);
            } else {
                // Image or PDF (AI processing)
                const base64 = await fileToBase64(file);
                const imported = await analyzeCampaignsDetailed(file.type, base64);

                if (imported && imported.length > 0) {
                    const now = new Date();
                    const monthName = now.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
                    const monthKey = monthName ? (monthName.charAt(0).toUpperCase() + monthName.slice(1)) : '';

                    const newCampaigns = imported.map(c => ({
                        ...c,
                        id: uuidv4(),
                        status: c.status || 'Включено',
                        type: c.type || 'Поиск',
                        budget: c.budget || 0,
                        budgetType: c.budgetType || 'Дневной',
                        impressions: c.impressions || 0,
                        clicks: c.clicks || 0,
                        ctr: c.interactionRate || (c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0),
                        spend: c.spend || 0,
                        conversions: c.conversions || 0,
                        cpc: c.cpc || (c.clicks > 0 ? c.spend / c.clicks : 0),
                        conversionRate: c.conversionRate || (c.clicks > 0 ? (c.conversions / c.clicks) * 100 : 0),
                        cpa: c.cpa || (c.conversions > 0 ? c.spend / c.conversions : 0),
                        strategy: c.strategy || 'Максимум конверсий',
                        period: now.toISOString(),
                        currencyCode: 'KZT' // Default for AI analysis if not explicitly detected
                    }));

                    setCampaigns(prev => {
                        const filteredPrev = prev.filter(c => {
                            const d = new Date(c.period);
                            if (isNaN(d.getTime())) return true;
                            const m = d.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
                            const currentMonth = m ? (m.charAt(0).toUpperCase() + m.slice(1)) : '';
                            return currentMonth !== monthKey;
                        });
                        return [...newCampaigns, ...filteredPrev];
                    });
                    setSelectedMonth(monthKey);
                    alert(`Успешно импортировано ${newCampaigns.length} кампаний за ${monthKey}.`);
                } else {
                    alert("Не удалось извлечь данные из изображения/PDF.");
                }
            }
        } catch (error) {
            console.error(error);
            alert("Ошибка при анализе файла.");
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const filteredCampaigns = useMemo(() => {
        let filtered = campaigns.filter(c => {
            const date = new Date(c.period);
            if (isNaN(date.getTime())) return selectedMonth === ''; // If invalid date, only show in "All months"

            const monthName = date.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
            const itemMonth = monthName ? (monthName.charAt(0).toUpperCase() + monthName.slice(1)) : '';

            return (selectedMonth === '' || itemMonth === selectedMonth) &&
                (filters.status === '' || c.status === filters.status) &&
                (filters.type === '' || c.type === filters.type);
        });

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue === undefined || bValue === undefined) return 0;

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return filtered;
    }, [campaigns, filters, selectedMonth, sortConfig]);

    const summary = useMemo(() => filteredCampaigns.reduce((acc, c) => ({
        impressions: acc.impressions + (c.impressions || 0),
        clicks: acc.clicks + (c.clicks || 0),
        spend: acc.spend + (c.spend || 0),
        conversions: acc.conversions + (c.conversions || 0)
    }), { impressions: 0, clicks: 0, spend: 0, conversions: 0 }), [filteredCampaigns]);

    const handleDeleteCampaign = (id: string) => {
        if (window.confirm('Вы уверены, что хотите удалить эту кампанию?')) {
            deleteCampaign(id);
        }
    };

    const handleRunAIAudit = async () => {
        if (filteredCampaigns.length === 0) {
            alert("Нет данных для аудита за выбранный месяц.");
            return;
        }

        setIsAuditing(true);
        try {
            const result = await runCampaignAuditStructured(filteredCampaigns);
            updateUserData({ ...userData, adCampaignAudit: result });
            alert("Аудит успешно завершен!");
        } catch (err) {
            console.error(err);
            alert("Ошибка при проведении аудита.");
        } finally {
            setIsAuditing(false);
        }
    };

    const auditReport = userData.adCampaignAudit;

    const renderSortIcon = (key: keyof AdCampaign) => {
        if (!sortConfig || sortConfig.key !== key) {
            return (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            );
        }
        return sortConfig.direction === 'asc' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {isAdding && <AddCampaignModal onClose={() => setIsAdding(false)} onSave={addCampaign} />}
            <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".csv,image/*,application/pdf" />

            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Рекламные кампании</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Импорт Google Ads отчетов и интеллектуальный аудит эффективности</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleImportClick}
                        disabled={isImporting}
                        className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-2.5 px-5 rounded-xl text-sm shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        {isImporting ? (
                            <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                        )}
                        Импорт отчета (.csv)
                    </button>
                    <button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all active:scale-95 uppercase tracking-widest">+ Добавить</button>
                </div>
            </div>

            {/* Sub-navigation Tabs */}
            <div className="flex items-center space-x-1 bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 w-fit">
                <button
                    onClick={() => setActiveSubTab('list')}
                    className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeSubTab === 'list' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                    Список кампаний
                </button>
                <button
                    onClick={() => setActiveSubTab('audit')}
                    className={`px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeSubTab === 'audit' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    Аудит Lumi
                    {auditReport && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>}
                </button>
            </div>

            {activeSubTab === 'list' ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 tabular-nums">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:shadow-md">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Показы</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{formatNumber(summary.impressions)}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:shadow-md">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Клики</p>
                            <p className="text-3xl font-black text-blue-600">{formatNumber(summary.clicks)}</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">CTR {summary.impressions > 0 ? ((summary.clicks / summary.impressions) * 100).toFixed(2) : '0.00'}%</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:shadow-md">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Расходы</p>
                            <p className="text-3xl font-black text-orange-600">{formatCurrency(summary.spend, filteredCampaigns[0]?.currencyCode || 'KZT')}</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">CPC {formatCurrency(summary.clicks > 0 ? summary.spend / summary.clicks : 0, filteredCampaigns[0]?.currencyCode || 'KZT')}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:shadow-md">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Конверсии</p>
                            <p className="text-3xl font-black text-green-600">{summary.conversions.toFixed(1)}</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">CPA {formatCurrency(summary.conversions > 0 ? summary.spend / summary.conversions : 0, filteredCampaigns[0]?.currencyCode || 'KZT')}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-slate-700 p-1.5 rounded-xl">
                                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 appearance-none px-4 pr-8 cursor-pointer text-blue-600">
                                    <option value="">Все месяцы</option>
                                    {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-600"></div>
                                <select name="status" value={filters.status} onChange={handleFilterChange} className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 appearance-none px-4 pr-8 cursor-pointer">
                                    <option value="">Все статусы</option>
                                    <option>Включено</option>
                                    <option>Приостановлено</option>
                                    <option>Завершено</option>
                                </select>
                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-600"></div>
                                <select name="type" value={filters.type} onChange={handleFilterChange} className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 appearance-none px-4 pr-8 cursor-pointer">
                                    <option value="">Все типы</option>
                                    <option>Поиск</option>
                                    <option>Максимальная эффективность</option>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto -mx-4 sm:mx-0 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                            <table className="w-full text-[11px] text-left text-slate-600 dark:text-slate-300 min-w-[800px] table-fixed">
                                <thead className="bg-gray-50/50 dark:bg-slate-700/50">
                                    <tr className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="px-2 py-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 transition-colors group w-[18%]" onClick={() => requestSort('name')}>
                                            <div className="flex items-center gap-1">
                                                Кампания {renderSortIcon('name')}
                                            </div>
                                        </th>
                                        <th className="px-2 py-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 transition-colors group w-[10%]" onClick={() => requestSort('status')}>
                                            <div className="flex items-center gap-1">
                                                Статус {renderSortIcon('status')}
                                            </div>
                                        </th>
                                        <th className="px-2 py-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 transition-colors group text-right w-[12%]" onClick={() => requestSort('budget')}>
                                            <div className="flex items-center justify-end gap-1">
                                                Бюджет {renderSortIcon('budget')}
                                            </div>
                                        </th>
                                        <th className="px-2 py-3 text-right cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 transition-colors group w-[10%]" onClick={() => requestSort('impressions')}>
                                            <div className="flex items-center justify-end gap-1">
                                                Показы {renderSortIcon('impressions')}
                                            </div>
                                        </th>
                                        <th className="px-2 py-3 text-right cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 transition-colors group w-[8%]" onClick={() => requestSort('clicks')}>
                                            <div className="flex items-center justify-end gap-1">
                                                Клики {renderSortIcon('clicks')}
                                            </div>
                                        </th>
                                        <th className="px-1 py-3 text-right cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 transition-colors group w-[7%]" onClick={() => requestSort('ctr')}>
                                            <div className="flex items-center justify-end gap-1">
                                                CTR {renderSortIcon('ctr')}
                                            </div>
                                        </th>
                                        <th className="px-2 py-3 text-right cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 transition-colors group w-[12%]" onClick={() => requestSort('spend')}>
                                            <div className="flex items-center justify-end gap-1">
                                                Расход {renderSortIcon('spend')}
                                            </div>
                                        </th>
                                        <th className="px-2 py-3 text-right cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 transition-colors group w-[10%]" onClick={() => requestSort('conversions')}>
                                            <div className="flex items-center justify-end gap-1">
                                                Конв. {renderSortIcon('conversions')}
                                            </div>
                                        </th>
                                        <th className="px-2 py-3 text-right cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 transition-colors group w-[10%]" onClick={() => requestSort('cpa')}>
                                            <div className="flex items-center justify-end gap-1">
                                                CPA {renderSortIcon('cpa')}
                                            </div>
                                        </th>
                                        <th className="px-2 py-3 w-[3%]"></th>
                                    </tr>
                                </thead>
                                <tbody className="tabular-nums divide-y divide-slate-50 dark:divide-slate-700">
                                    {filteredCampaigns.length > 0 ? filteredCampaigns.map(c => (
                                        <tr key={c.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                                            <td className="px-2 py-2">
                                                <p className="font-bold text-slate-800 dark:text-slate-200 truncate" title={c.name}>{c.name}</p>
                                                <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block truncate">{c.type}</span>
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap">
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${statusColorMap[c.status] || 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap text-right">
                                                <p className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(c.budget, c.currencyCode)}</p>
                                                <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest">{c.budgetType === 'Дневной' ? 'день' : 'весь'}</span>
                                            </td>
                                            <td className="px-2 py-2 text-right whitespace-nowrap text-slate-500">{formatNumber(c.impressions)}</td>
                                            <td className="px-2 py-2 text-right whitespace-nowrap font-bold text-blue-500 text-[12px]">{formatNumber(c.clicks)}</td>
                                            <td className="px-1 py-2 text-right whitespace-nowrap text-slate-400 text-[9px]">{c.ctr?.toFixed(2)}%</td>
                                            <td className="px-2 py-2 text-right font-bold whitespace-nowrap text-slate-800 dark:text-slate-200">{formatCurrency(c.spend, c.currencyCode)}</td>
                                            <td className="px-2 py-2 text-right whitespace-nowrap text-green-600">
                                                <p className="font-bold">{c.conversions?.toFixed(1)}</p>
                                                <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider">{c.conversionRate?.toFixed(2)}% CR</p>
                                            </td>
                                            <td className="px-2 py-2 text-right whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">{formatCurrency(c.cpa, c.currencyCode)}</td>
                                            <td className="px-2 py-2 flex space-x-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => handleDeleteCampaign(c.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-all">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={10} className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                                                <div className="max-w-xs mx-auto space-y-3">
                                                    <div className="w-14 h-14 bg-gray-50 dark:bg-slate-700/30 rounded-full flex items-center justify-center mx-auto text-3xl">📊</div>
                                                    <p>Кампаний не найдено</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="space-y-8 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="flex-1 space-y-6">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100">Интеллектуальный аудит</h2>
                                <p className="text-slate-500 mt-2 leading-relaxed">Lumi анализирует импортированные отчеты, выявляя скрытые закономерности, неэффективные расходы и точки роста вашего аккаунта Google Ads.</p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleRunAIAudit}
                                    disabled={isAuditing || campaigns.length === 0}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 uppercase tracking-widest text-xs"
                                >
                                    {isAuditing ? (
                                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                                    )}
                                    {isAuditing ? 'Сбор данных...' : 'Запустить аудит'}
                                </button>
                                {auditReport && (
                                    <div className="flex flex-col justify-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Последний аудит</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">{formatFullDate(auditReport.timestamp)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        {auditReport && (
                            <div className="w-full md:w-auto flex items-center gap-6 p-6 bg-slate-50 dark:bg-slate-900/40 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Аккаунт</p>
                                    <div className={`text-5xl font-black ${auditReport.globalScore >= 8 ? 'text-green-600' : auditReport.globalScore >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                                        {auditReport.globalScore}<span className="text-xl opacity-50">/10</span>
                                    </div>
                                </div>
                                <div className="max-w-[200px]">
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-tight italic">"{auditReport.globalVerdict}"</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {auditReport ? (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
                            <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-gray-50/30 dark:bg-slate-900/20">
                                <h3 className="text-lg font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Интерактивный отчет по кампаниям</h3>
                                <p className="text-[10px] font-bold text-slate-400">Нажмите на кампанию для деталей</p>
                            </div>
                            <div className="p-2 space-y-0.5">
                                {auditReport.campaigns.map((item, idx) => (
                                    <AuditRow key={idx} audit={item} />
                                ))}
                            </div>
                        </div>
                    ) : !isAuditing && (
                        <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/10 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <div className="max-w-xs mx-auto space-y-4">
                                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto shadow-sm text-2xl">🧐</div>
                                <h3 className="text-xl font-bold dark:text-slate-100">Готовы к анализу?</h3>
                                <p className="text-slate-500 text-sm">После запуска аудита здесь появится подробная таблица с оценками каждой кампании и персональными рекомендациями Lumi.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdCampaignsPage;
