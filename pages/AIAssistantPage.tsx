
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { getAIAssistantResponse, analyzeReportImage, analyzeProposalsImage, analyzeCampaignsDetailed } from '../services/geminiService';
import { UserData, Report, CommercialProposal, AdCampaign, OtherReport } from '../types';
import { fileToBase64 } from '../utils';
import MarkdownRenderer from '../components/MarkdownRenderer';

type UploadType = 'report' | 'proposals' | 'campaigns';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
}

const UploadTypeModal: React.FC<{ onClose: () => void, onSelect: (type: UploadType) => void }> = ({ onClose, onSelect }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold">Анализ файла</h2>
                <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-2xl">&times;</button>
            </div>
            <div className="p-6">
                <p className="text-slate-600 dark:text-slate-300 mb-4">Какой тип данных содержится в файле?</p>
                <div className="space-y-3">
                    <button onClick={() => onSelect('report')} className="w-full text-left p-3 bg-gray-100 hover:bg-blue-100 dark:bg-slate-700 dark:hover:bg-blue-500/20 rounded-lg">Маркетинговый отчет</button>
                    <button onClick={() => onSelect('proposals')} className="w-full text-left p-3 bg-gray-100 hover:bg-blue-100 dark:bg-slate-700 dark:hover:bg-blue-500/20 rounded-lg">Коммерческие предложения</button>
                    <button onClick={() => onSelect('campaigns')} className="w-full text-left p-3 bg-gray-100 hover:bg-blue-100 dark:bg-slate-700 dark:hover:bg-blue-500/20 rounded-lg">Рекламные кампании</button>
                </div>
            </div>
        </div>
    </div>
);

const WelcomeScreen: React.FC<{ onPromptClick: (prompt: string) => void }> = ({ onPromptClick }) => {
    const prompts = [
        "Какие рекламные кампании самые эффективные?",
        "Проанализируй динамику расходов на рекламу",
        "Сделай SWOT-анализ на основе стратегии",
        "Какие есть точки роста в коммерческих предложениях?",
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="flex items-center justify-center gap-3 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" className="h-12 w-12" aria-hidden="true">
                    <circle cx="14" cy="20" r="11" fill="#2563eb" opacity="0.9" />
                    <circle cx="26" cy="20" r="11" fill="#16a34a" opacity="0.9" />
                </svg>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Lumi</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-lg">Здравствуйте! Чем я могу помочь вам сегодня?</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full max-w-2xl">
                {prompts.map((prompt, index) => (
                    <button
                        key={index}
                        onClick={() => onPromptClick(prompt)}
                        className="p-4 bg-white dark:bg-slate-800 hover:bg-blue-100/50 dark:hover:bg-blue-500/10 rounded-lg text-left text-slate-700 dark:text-slate-200 hover:text-blue-800 dark:hover:text-blue-400 transition-colors border border-gray-200/80 dark:border-slate-700/80 shadow-sm"
                    >
                        <p className="font-medium text-sm">{prompt}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

const MessageActions: React.FC<{ text: string, onAction: (prompt: string) => void }> = ({ text, onAction }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700 transition-colors"
                title="Копировать в буфер обмена"
            >
                {copied ? (
                    <><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> Скопировано</>
                ) : (
                    <><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg> Копировать</>
                )}
            </button>
            <button
                onClick={() => onAction("Обьясни этот ответ подробнее")}
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Объяснить
            </button>
            <button
                onClick={() => onAction("Сделай краткую выжимку по этому вопросу")}
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Сводка
            </button>
        </div>
    );
};

interface AIAssistantPageProps {
    userData: UserData;
    addReport: (report: Omit<Report, 'id'>) => void;
    addMultipleProposals: (proposals: Omit<CommercialProposal, 'id'>[]) => void;
    addMultipleCampaigns: (campaigns: Omit<AdCampaign, 'id'>[]) => void;
    addOtherReport: (report: Omit<OtherReport, 'id'>) => void;
    updateOtherReport: (report: OtherReport) => void;
    addProposal: (proposal: Omit<CommercialProposal, 'id'>) => void;
    updateProposal: (proposal: CommercialProposal) => void;
}

const AIAssistantPage: React.FC<AIAssistantPageProps> = ({
    userData, addReport, addMultipleProposals, addMultipleCampaigns,
    addOtherReport, updateOtherReport, addProposal, updateProposal
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [showWelcome, setShowWelcome] = useState(true);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const [fileForUpload, setFileForUpload] = useState<File | null>(null);
    const [isUploadTypeModalOpen, setUploadTypeModalOpen] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    useEffect(scrollToBottom, [messages]);

    const addMessage = (message: Omit<Message, 'id'>) => {
        setMessages(prev => [...prev, { ...message, id: uuidv4() }]);
    };

    const handleSend = async (promptText?: string) => {
        const textToSend = promptText || input;
        if (textToSend.trim() === '' || isLoading) return;

        if (showWelcome) setShowWelcome(false);

        addMessage({ text: textToSend, sender: 'user' });
        setInput('');
        setIsLoading(true);

        const handleRetry = (attempt: number, delay: number) => {
            addMessage({
                text: `Превышен лимит запросов к AI (429). Попытка ${attempt}... Повтор через ${delay / 1000} сек.`,
                sender: 'ai'
            });
        };

        try {
            const { text, functionCall } = await getAIAssistantResponse(textToSend, userData, userData.companyProfile.aiSystemInstruction, handleRetry);

            if (functionCall) {
                let confirmationMessage = text;
                switch (functionCall.name) {
                    case 'navigateToPage':
                        const page = functionCall.args.page as string;
                        navigate(page);
                        confirmationMessage = `Перехожу в раздел: ${page}`;
                        break;
                    case 'createOtherReport':
                        const otherReportArgs = functionCall.args as any;
                        const newOtherReport: Omit<OtherReport, 'id'> = {
                            name: otherReportArgs.name || 'Новый отчет',
                            date: otherReportArgs.date || new Date().toISOString().split('T')[0],
                            category: otherReportArgs.category || 'Другое',
                            description: otherReportArgs.description || '',
                            kpis: (otherReportArgs.kpis || []).map((kpi: any) => ({
                                id: uuidv4(),
                                name: String(kpi.name),
                                value: String(kpi.value)
                            }))
                        };
                        addOtherReport(newOtherReport);
                        confirmationMessage = confirmationMessage || `Отчет "${newOtherReport.name}" создан.`;
                        addMessage({ text: confirmationMessage, sender: 'ai' });
                        break;
                    case 'updateOtherReportKpi':
                        const updateKpiArgs = functionCall.args as any;
                        const reportToUpdate = userData.otherReports.find(r => r.name.toLowerCase() === String(updateKpiArgs.reportName).toLowerCase());
                        if (reportToUpdate) {
                            if (window.confirm(text || `Вы уверены, что хотите обновить KPI в отчете "${reportToUpdate.name}"?`)) {
                                const updatedKpis = reportToUpdate.kpis.map(kpi =>
                                    kpi.name.toLowerCase() === String(updateKpiArgs.kpiName).toLowerCase()
                                        ? { ...kpi, value: String(updateKpiArgs.newValue) }
                                        : kpi
                                );
                                updateOtherReport({ ...reportToUpdate, kpis: updatedKpis, description: reportToUpdate.description || '' });
                                addMessage({ text: `Значение "${updateKpiArgs.kpiName}" в отчете "${reportToUpdate.name}" обновлено.`, sender: 'ai' });
                            } else {
                                addMessage({ text: 'Действие отменено.', sender: 'ai' });
                            }
                        } else {
                            addMessage({ text: `Не нашел отчет с названием "${updateKpiArgs.reportName}".`, sender: 'ai' });
                        }
                        break;
                    case 'createCommercialProposal':
                        const createProposalArgs = functionCall.args as any;
                        const newProposal: Omit<CommercialProposal, 'id'> = {
                            date: createProposalArgs.date || new Date().toISOString().split('T')[0],
                            direction: (createProposalArgs.direction === '3D' ? '3D' : 'РТИ') as "РТИ" | "3D",
                            proposalNumber: `КП-${Math.floor(Math.random() * 10000)}`,
                            company: String(createProposalArgs.company),
                            item: String(createProposalArgs.item),
                            amount: Number(createProposalArgs.amount) || 0,
                            status: 'Ожидание' as const,
                            invoiceNumber: null, invoiceDate: null, paymentDate: null, paymentType: null,
                        };
                        addProposal(newProposal);
                        confirmationMessage = confirmationMessage || `КП для "${newProposal.company}" на сумму ${newProposal.amount} успешно создано.`;
                        addMessage({ text: confirmationMessage, sender: 'ai' });
                        break;
                    case 'updateCommercialProposal':
                        const updateProposalArgs = functionCall.args as any;
                        const proposalToUpdate = userData.proposals.find(p => p.company?.toLowerCase() === String(updateProposalArgs.company).toLowerCase());
                        if (proposalToUpdate) {
                            if (window.confirm(text || `Вы уверены, что хотите обновить КП для "${proposalToUpdate.company}"?`)) {
                                const { fieldToUpdate, newValue } = updateProposalArgs;
                                const updatedProposal = { ...proposalToUpdate, [String(fieldToUpdate)]: newValue } as CommercialProposal;
                                if (fieldToUpdate === 'status' && !['Оплачено', 'Ожидание', 'Отменено'].includes(String(newValue))) {
                                    addMessage({ text: `Некорректный статус "${newValue}". Доступные статусы: Оплачено, Ожидание, Отменено.`, sender: 'ai' });
                                    break;
                                }
                                updateProposal(updatedProposal);
                                addMessage({ text: `КП для "${proposalToUpdate.company}" успешно обновлено.`, sender: 'ai' });
                            } else {
                                addMessage({ text: 'Действие отменено.', sender: 'ai' });
                            }
                        } else {
                            addMessage({ text: `Не нашел КП для компании "${updateProposalArgs.company}".`, sender: 'ai' });
                        }
                        break;
                    default:
                        if (text) addMessage({ text, sender: 'ai' });
                }
            } else if (text) {
                addMessage({ text, sender: 'ai' });
            }
        } catch (error) {
            addMessage({ text: 'Извините, произошла ошибка. Попробуйте позже.', sender: 'ai' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAttachmentClick = () => fileInputRef.current?.click();

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileForUpload(file);
            setUploadTypeModalOpen(true);
        }
        e.target.value = '';
    };

    const handleUploadTypeSelect = async (type: UploadType) => {
        setUploadTypeModalOpen(false);
        if (!fileForUpload) return;

        if (showWelcome) setShowWelcome(false);

        addMessage({ text: `Загружен файл: ${fileForUpload.name}`, sender: 'user' });
        setIsLoading(true);
        addMessage({ text: "Анализирую файл...", sender: 'ai' });

        const handleRetry = (attempt: number, delay: number) => {
            addMessage({
                text: `Превышен лимит запросов к AI (429). Попытка ${attempt}... Повтор через ${delay / 1000} сек.`,
                sender: 'ai'
            });
        };

        try {
            const base64Data = await fileToBase64(fileForUpload);

            if (type === 'report') {
                const analysisResult = await analyzeReportImage(fileForUpload.type, base64Data, handleRetry);
                let parsedData: any = {};
                try {
                    parsedData = JSON.parse(analysisResult);
                } catch (e) {
                    console.error("JSON parse error:", e);
                    addMessage({ text: "Ошибка при обработке данных отчета. Модель вернула некорректный формат.", sender: 'ai' });
                    return;
                }

                const reportDirections: any = {};
                const totalMetrics = {
                    budget: 0, clicks: 0, leads: 0, proposals: 0,
                    invoices: 0, deals: 0, sales: 0
                };

                let hasData = false;
                ['РТИ', '3D'].forEach(direction => {
                    const metrics = parsedData[direction];
                    if (metrics && typeof metrics === 'object') {
                        const dirMetrics = {
                            budget: Number(metrics.budget) || 0,
                            clicks: Number(metrics.clicks) || 0,
                            leads: Number(metrics.leads) || 0,
                            proposals: Number(metrics.proposals) || 0,
                            invoices: Number(metrics.invoices) || 0,
                            deals: Number(metrics.deals) || 0,
                            sales: Number(metrics.sales) || 0
                        };
                        reportDirections[direction] = dirMetrics;

                        // Add to totals
                        totalMetrics.budget += dirMetrics.budget;
                        totalMetrics.clicks += dirMetrics.clicks;
                        totalMetrics.leads += dirMetrics.leads;
                        totalMetrics.proposals += dirMetrics.proposals;
                        totalMetrics.invoices += dirMetrics.invoices;
                        totalMetrics.deals += dirMetrics.deals;
                        totalMetrics.sales += dirMetrics.sales;
                        hasData = true;
                    }
                });

                if (hasData) {
                    addReport({
                        name: `Импорт из AI - ${new Date().toLocaleDateString()}`,
                        creationDate: new Date().toISOString(),
                        metrics: totalMetrics,
                        directions: reportDirections
                    });
                    addMessage({ text: "Отчет успешно проанализирован и добавлен в систему.", sender: 'ai' });
                } else {
                    addMessage({ text: "Не удалось найти корректные данные в отчете. Пожалуйста, убедитесь, что на изображении есть таблица с показателями по РТИ или 3D.", sender: 'ai' });
                }

            } else if (type === 'proposals') {
                const parsedProposalsData = await analyzeProposalsImage(fileForUpload.type, base64Data, handleRetry);
                let totalAdded = 0;

                if (parsedProposalsData && typeof parsedProposalsData === 'object') {
                    const directions: ("РТИ" | "3D")[] = ['РТИ', '3D'];
                    directions.forEach(direction => {
                        const proposals = parsedProposalsData[direction];
                        if (proposals && Array.isArray(proposals) && proposals.length > 0) {
                            const proposalsWithDirection: Omit<CommercialProposal, 'id'>[] = proposals.map((p: any) => ({
                                date: String(p.date || ''),
                                company: String(p.company || 'Неизвестная компания'),
                                item: String(p.item || 'Товар'),
                                amount: Number(p.amount) || 0,
                                direction: direction,
                                status: 'Ожидание' as const,
                                proposalNumber: String(p.proposalNumber || `КП-${Math.floor(Math.random() * 10000)}`),
                                invoiceNumber: p.invoiceNumber || null,
                                invoiceDate: p.invoiceDate || null,
                                paymentDate: p.paymentDate || null,
                                paymentType: null,
                            }));
                            addMultipleProposals(proposalsWithDirection);
                            totalAdded += proposalsWithDirection.length;
                        }
                    });
                }

                if (totalAdded > 0) {
                    addMessage({ text: `Успешно импортировано ${totalAdded} коммерческих предложений.`, sender: 'ai' });
                } else {
                    addMessage({ text: "В файле не найдено новых коммерческих предложений или формат документа не распознан.", sender: 'ai' });
                }

            } else if (type === 'campaigns') {
                const parsedCampaigns = await analyzeCampaignsDetailed(fileForUpload.type, base64Data, handleRetry);
                if (parsedCampaigns && Array.isArray(parsedCampaigns) && parsedCampaigns.length > 0) {
                    // Normalize data before adding
                    const normalizedCampaigns = parsedCampaigns.map(c => ({
                        ...c,
                        budget: Number(c.budget) || 0,
                        impressions: Number(c.impressions) || 0,
                        clicks: Number(c.clicks) || 0,
                        spend: Number(c.spend) || 0,
                        conversions: Number(c.conversions) || 0
                    }));
                    addMultipleCampaigns(normalizedCampaigns);
                    addMessage({ text: `Успешно импортировано ${normalizedCampaigns.length} рекламных кампаний.`, sender: 'ai' });
                } else {
                    addMessage({ text: "В файле не найдено рекламных кампаний или формат отчета Google Ads не распознан.", sender: 'ai' });
                }
            }
        } catch (error) {
            console.error("Error analyzing file:", error);
            addMessage({ text: "Не удалось проанализировать файл. Попробуйте еще раз.", sender: 'ai' });
        } finally {
            setIsLoading(false);
            setFileForUpload(null);
        }
    };

    return (
        <div className="flex h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] bg-gray-50 dark:bg-slate-900 overflow-hidden -m-4 sm:-m-6 lg:-m-8">
            <div className="flex-1 flex flex-col h-full relative">

                {/* Header */}
                <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-4 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">AI Ассистент Lumi</h1>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50/50 dark:bg-slate-900/50 relative">
                    {showWelcome ? (
                        <WelcomeScreen onPromptClick={handleSend} />
                    ) : (
                        <div className="max-w-3xl mx-auto space-y-6 pb-4">
                            {messages.map((msg) => {
                                const suggestionRegex = /<suggestions>(.*?)<\/suggestions>/s;
                                const match = msg.text.match(suggestionRegex);
                                const suggestions = match ? match[1].split(';').map(s => s.trim()).filter(s => s !== '') : [];
                                const cleanText = msg.text.replace(suggestionRegex, '').trim();

                                return (
                                    <div key={msg.id} className="space-y-3">
                                        <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm relative group ${msg.sender === 'user'
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-gray-100 dark:border-slate-700 rounded-tl-none'
                                                }`}>
                                                {msg.sender === 'ai' && (
                                                    <div className="absolute -left-10 top-0 hidden md:block">
                                                        <div className="bg-blue-100 dark:bg-blue-900/40 p-1.5 rounded-lg">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 15.657a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM14.05 9.05a4.915 4.915 0 010 3.9c-1.156.462-1.936 1.413-2.138 2.65a1 1 0 01-1.912 0c-.202-1.237-.982-2.188-2.138-2.65a4.915 4.915 0 010-3.9c1.156-.462 1.936-1.413 2.138-2.65a1 1 0 011.912 0c.202 1.237.982 2.188 2.138 2.65z" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="leading-relaxed prose dark:prose-invert max-w-none">
                                                    <MarkdownRenderer content={cleanText} />
                                                </div>
                                                {msg.sender === 'ai' && <MessageActions text={cleanText} onAction={handleSend} />}
                                            </div>
                                        </div>

                                        {msg.sender === 'ai' && suggestions.length > 0 && (
                                            <div className="flex flex-wrap gap-2 justify-start ml-2">
                                                {suggestions.map((suggestion, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleSend(suggestion)}
                                                        className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-800/40 border border-blue-100 dark:border-blue-800/50 transition-all flex items-center gap-2 group"
                                                    >
                                                        {suggestion}
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-slate-700 shadow-sm flex gap-2 items-center">
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 p-4 z-10">
                    <div className="max-w-3xl mx-auto flex items-end gap-3 bg-gray-50 dark:bg-slate-700/50 p-2 rounded-xl border border-gray-200 dark:border-slate-600 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all shadow-sm">
                        <button
                            onClick={handleAttachmentClick}
                            className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600"
                            title="Прикрепить файл"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".png,.jpg,.jpeg,.webp,.pdf"
                            onChange={handleFileSelected}
                        />

                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Спросите что-нибудь или поставьте задачу..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 dark:text-slate-100 placeholder-slate-400 resize-none max-h-32 py-2.5 custom-scrollbar"
                            rows={1}
                            style={{ minHeight: '44px' }}
                        />

                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() && !isLoading}
                            className={`p-2 rounded-lg transition-all transform duration-200 ${input.trim()
                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:scale-105'
                                : 'bg-gray-200 dark:bg-slate-600 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-center text-xs text-slate-400 mt-2">Lumi может допускать ошибки. Проверяйте важную информацию.</p>
                </div>

                {isUploadTypeModalOpen && <UploadTypeModal onClose={() => setUploadTypeModalOpen(false)} onSelect={handleUploadTypeSelect} />}
            </div>
        </div>
    );
};

export default AIAssistantPage;
