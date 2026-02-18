
import React, { useState } from 'react';
import { performBrandHealthAnalysis, suggestAuditKeywords, runAdAudit } from '../services/geminiService';
import { UserData, BrandAnalysis, AdAuditResult, Review, Mention } from '../types';
import { formatFullDate, formatNumber } from '../utils';

interface BrandHealthPageProps {
    userData: UserData;
    updateUserData: (data: UserData) => void;
}

const BrandHealthPage: React.FC<BrandHealthPageProps> = ({ userData, updateUserData }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'mentions' | 'ad-audit'>('overview');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAuditing, setIsAuditing] = useState(false);
    const [customKeyword, setCustomKeyword] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('Казахстан');
    const [error, setError] = useState<string | null>(null);

    const locations = [
        'Казахстан', 'Алматы', 'Астана', 'Россия', 'Узбекистан', 'Кыргызстан', 'Европа'
    ];

    const handleStartGeneralAnalysis = async () => {
        setIsAnalyzing(true);
        setError(null);
        try {
            const analysis = await performBrandHealthAnalysis(
                userData.companyProfile.companyName,
                userData.companyProfile.about
            );
            updateUserData({ ...userData, brandAnalysis: analysis });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ошибка анализа.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRunAdAudit = async (keyword: string) => {
        setIsAuditing(true);
        setError(null);
        try {
            const result = await runAdAudit(keyword, selectedLocation, userData.companyProfile);
            const updatedAudits = [result, ...(userData.adAudits || [])].slice(0, 10);
            updateUserData({ ...userData, adAudits: updatedAudits });
        } catch (err) {
            setError("Ошибка аудита рекламной выдачи.");
        } finally {
            setIsAuditing(false);
        }
    };

    const analysis = userData.brandAnalysis as BrandAnalysis;
    const audits = userData.adAudits || [];

    const SwotBlock = ({ title, items = [], colorClass, icon }: { title: string, items?: string[], colorClass: string, icon: string }) => (
        <div className={`p-5 rounded-xl border ${colorClass} h-full shadow-sm`}>
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{icon}</span>
                <h3 className="font-bold text-sm uppercase tracking-wider">{title}</h3>
            </div>
            <ul className="space-y-2">
                {items.map((item, idx) => (
                    <li key={idx} className="flex gap-2 text-sm leading-relaxed border-b border-black/5 dark:border-white/5 pb-2 last:border-0">
                        <span className="text-blue-500 font-bold">•</span>
                        <span className="text-slate-600 dark:text-slate-400">{item}</span>
                    </li>
                ))}
                {items.length === 0 && <li className="text-xs opacity-50 italic">Нет данных</li>}
            </ul>
        </div>
    );

    const RatingStars = ({ rating }: { rating: number }) => (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <span key={s} className={`text-sm ${s <= rating ? 'text-yellow-400' : 'text-slate-200'}`}>★</span>
            ))}
        </div>
    );

    const getPlatformIcon = (platform: string) => {
        const p = platform.toLowerCase();
        if (p.includes('yandex') || p.includes('яндекс')) return '📍 Яндекс';
        if (p.includes('2gis') || p.includes('гис')) return '🗺️ 2ГИС';
        if (p.includes('google')) return '🔍 Google';
        if (p.includes('instagram') || p.includes('инста')) return '📸 Instagram';
        return `🌐 ${platform}`;
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Здоровье бренда</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Репутация, конкуренты и аудит присутствия в сети</p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={handleStartGeneralAnalysis}
                        disabled={isAnalyzing}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center space-x-2 shadow-md transition-all disabled:opacity-50"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isAnalyzing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>{isAnalyzing ? 'Сбор данных из Яндекса и 2ГИС...' : 'Обновить анализ'}</span>
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex overflow-x-auto no-scrollbar">
                {[
                    { id: 'overview', label: 'Обзор и SWOT' },
                    { id: 'reviews', label: 'Отзывы (Live)' },
                    { id: 'mentions', label: 'Упоминания' },
                    { id: 'ad-audit', label: 'Аудит выдачи Google' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-5 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 text-red-700 dark:text-red-400 rounded-r-xl">{error}</div>
            )}

            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {!analysis && !isAnalyzing ? (
                        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                            <div className="max-w-md mx-auto space-y-4">
                                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto text-3xl">🔭</div>
                                <h2 className="text-2xl font-bold dark:text-slate-100">Глубокий анализ репутации</h2>
                                <p className="text-slate-500 text-sm">Lumi соберет реальные отзывы из Яндекс Карт, 2ГИС, найдет упоминания в СМИ и соцсетях, а также проанализирует ваших конкурентов.</p>
                                <button onClick={handleStartGeneralAnalysis} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-md mt-2">Запустить сканирование</button>
                            </div>
                        </div>
                    ) : isAnalyzing ? (
                        <div className="text-center py-32 bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700">
                            <div className="flex flex-col items-center gap-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                <h2 className="text-xl font-bold">Lumi изучает интернет-пространство...</h2>
                                <p className="text-slate-500 animate-pulse italic text-sm">Сканируем Яндекс Карты, 2ГИС, Instagram и новостные ленты</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 tabular-nums">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border dark:border-slate-700">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sentiment Score</p>
                                    <div className="text-4xl font-black text-blue-600">{analysis.sentimentScore}%</div>
                                    <div className="mt-3 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${analysis.sentimentScore}%` }}></div>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border dark:border-slate-700">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Индекс доверия</p>
                                    <div className="text-4xl font-black text-green-600">{analysis.trustIndex}%</div>
                                    <div className="mt-3 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${analysis.trustIndex}%` }}></div>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border dark:border-slate-700">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Упоминания</p>
                                    <div className="text-4xl font-black text-slate-900 dark:text-slate-100">{analysis.mentionsCount}</div>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1">Найдено в сети</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border dark:border-slate-700 flex flex-col justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Дата аудита</p>
                                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatFullDate(analysis.lastUpdate)}</div>
                                    </div>
                                    <div className="text-[10px] text-blue-600 font-bold uppercase cursor-pointer hover:underline" onClick={handleStartGeneralAnalysis}>Обновить данные →</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                <SwotBlock title="Сильные стороны" items={analysis.swot.strengths} colorClass="bg-blue-50/20 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800/40" icon="🚀" />
                                <SwotBlock title="Слабые стороны" items={analysis.swot.weaknesses} colorClass="bg-orange-50/20 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/40" icon="⚠️" />
                                <SwotBlock title="Возможности" items={analysis.swot.opportunities} colorClass="bg-green-50/20 border-green-100 dark:bg-green-900/10 dark:border-green-800/40" icon="📈" />
                                <SwotBlock title="Угрозы" items={analysis.swot.threats} colorClass="bg-red-50/20 border-red-100 dark:bg-red-900/10 dark:border-red-800/40" icon="🔥" />
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border dark:border-slate-700">
                                <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                                    Основные конкуренты
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {analysis.competitors.map((comp, i) => (
                                        <div key={i} className="flex flex-col p-5 rounded-xl bg-gray-50 dark:bg-slate-900/40 border dark:border-slate-700 hover:border-blue-300 transition-colors group">
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-bold text-slate-900 dark:text-slate-100">{comp.name}</h4>
                                                <span className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded-md text-[10px] font-bold text-slate-500 border dark:border-slate-700">{comp.marketShare || 'N/A share'}</span>
                                            </div>
                                            <div className="space-y-3 flex-1 text-sm">
                                                <div>
                                                    <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Плюсы</p>
                                                    <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                                                        {(comp.pros || []).slice(0, 2).map((p, idx) => <li key={idx} className="line-clamp-1 text-xs">+ {p}</li>)}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Минусы</p>
                                                    <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                                                        {(comp.cons || []).slice(0, 2).map((c, idx) => <li key={idx} className="line-clamp-1 text-xs">- {c}</li>)}
                                                    </ul>
                                                </div>
                                            </div>
                                            {comp.website && (
                                                <a href={comp.website} target="_blank" rel="noopener noreferrer" className="mt-4 text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-wider">Сайт конкурента →</a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'reviews' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Реальные отзывы (Яндекс, 2ГИС, Google)</h2>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{analysis?.reviews?.length || 0} источников</span>
                    </div>
                    {analysis?.reviews ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {analysis.reviews.map((rev, i) => (
                                <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-blue-600 text-sm">{rev.author[0]}</div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{rev.author}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{getPlatformIcon(rev.platform)} • {rev.date}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <RatingStars rating={rev.rating} />
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">"{rev.text}"</p>
                                    <div className="flex justify-between items-center pt-2">
                                        <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${rev.sentiment === 'positive' ? 'bg-green-100 text-green-700' : rev.sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {rev.sentiment === 'positive' ? 'Позитив' : rev.sentiment === 'negative' ? 'Негатив' : 'Нейтрально'}
                                        </span>
                                        {rev.url && <a href={rev.url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-blue-600 hover:underline">Читать оригинал →</a>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                            <p className="text-slate-500">Отзывы не загружены. Запустите основной анализ.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'mentions' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border dark:border-slate-700 overflow-hidden">
                    <div className="p-6 border-b dark:border-slate-700"><h2 className="text-xl font-bold">Прямые упоминания и ссылки</h2></div>
                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Ресурс / Тип</th>
                                    <th className="px-6 py-4">Описание</th>
                                    <th className="px-6 py-4 text-right">Дата</th>
                                    <th className="px-6 py-4 text-right">Переход</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-700">
                                {analysis?.mentions?.map((mention, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-900/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${mention.sourceType === 'article' ? 'bg-blue-100 text-blue-700' :
                                                    mention.sourceType === 'social' ? 'bg-pink-100 text-pink-700' :
                                                        'bg-gray-100 text-gray-700'
                                                }`}>{mention.sourceType}</span>
                                            <div className="font-bold text-slate-900 dark:text-slate-100 mt-1 max-w-xs truncate">{mention.title}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs max-w-sm truncate">{mention.summary}</td>
                                        <td className="px-6 py-4 text-slate-400 text-xs text-right whitespace-nowrap">{mention.date}</td>
                                        <td className="px-6 py-4 text-right">
                                            <a href={mention.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-bold">Открыть →</a>
                                        </td>
                                    </tr>
                                ))}
                                {(!analysis?.mentions || analysis.mentions.length === 0) && (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">Список упоминаний пуст.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'ad-audit' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div className="lg:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Ключевой запрос для аудита</label>
                                <input
                                    type="text"
                                    value={customKeyword}
                                    onChange={(e) => setCustomKeyword(e.target.value)}
                                    placeholder="Напр: 3D печать Алматы"
                                    className="w-full bg-gray-50 dark:bg-slate-900 p-2.5 rounded-lg border dark:border-slate-600 focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Регион</label>
                                <select
                                    value={selectedLocation}
                                    onChange={(e) => setSelectedLocation(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-slate-900 p-2.5 rounded-lg border dark:border-slate-600 focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                                </select>
                            </div>
                            <button
                                onClick={() => handleRunAdAudit(customKeyword)}
                                disabled={!customKeyword || isAuditing}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-all shadow-md disabled:opacity-50"
                            >
                                {isAuditing ? 'Сбор выдачи Google...' : 'Запустить аудит'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {isAuditing && (
                            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 shadow-md">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-slate-500">Lumi анализирует рекламные блоки в Google по запросу "{customKeyword}" в регионе "{selectedLocation}"...</p>
                            </div>
                        )}

                        {!isAuditing && audits.map((audit) => (
                            <div key={audit.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border dark:border-slate-700 shadow-md space-y-6">
                                <div className="flex justify-between items-start border-b dark:border-slate-700 pb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md uppercase tracking-wider">{audit.location}</span>
                                            <span className="text-xs text-slate-400 tabular-nums">{formatFullDate(audit.timestamp)}</span>
                                        </div>
                                        <h4 className="text-xl font-bold">Рекламная выдача по запросу "{audit.keyword}"</h4>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    <div className="lg:col-span-8 space-y-6">
                                        <div>
                                            <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest border-b dark:border-slate-700 pb-2 mb-4 flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                                                Платные объявления (Sponsored)
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {audit.advertisers.map((adv, i) => (
                                                    <div key={i} className="p-4 bg-gray-50 dark:bg-slate-900/30 rounded-xl border dark:border-slate-700 hover:border-orange-200 transition-colors">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{adv.name}</div>
                                                            <span className="text-[8px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-black uppercase">Ad</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-2 line-clamp-3 italic">"{adv.offer}"</p>
                                                        <a href={adv.link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-blue-600 uppercase mt-3 block hover:underline">Перейти на лендинг →</a>
                                                    </div>
                                                ))}
                                                {audit.advertisers.length === 0 && <p className="text-xs text-slate-400 italic py-4">Рекламы в верхней части выдачи не обнаружено.</p>}
                                            </div>
                                        </div>

                                        {audit.organicTop && audit.organicTop.length > 0 && (
                                            <div>
                                                <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest border-b dark:border-slate-700 pb-2 mb-4">Топ органической выдачи</div>
                                                <div className="space-y-2">
                                                    {audit.organicTop.map((org, i) => (
                                                        <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-900/20 rounded-lg border dark:border-slate-700">
                                                            <span className="font-bold text-slate-700 dark:text-slate-300 truncate mr-4">{i + 1}. {org.title}</span>
                                                            <a href={org.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline shrink-0">Сайт →</a>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="lg:col-span-4 bg-blue-50/30 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-900/30 h-fit">
                                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                            AI Вердикт Lumi
                                        </div>
                                        <p className="text-xs leading-relaxed italic text-slate-700 dark:text-slate-300">"{audit.marketAnalysis}"</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrandHealthPage;
