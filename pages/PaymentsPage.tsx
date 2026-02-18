
import React, { useState, useMemo, useRef } from 'react';
import { Payment, StoredFile } from '../types';
import { fileToBase64 } from '../utils';
import { analyzePaymentInvoice } from '../services/geminiService';

interface PaymentsPageProps {
    payments: Payment[];
    files: StoredFile[];
    addPayment: (payment: Omit<Payment, 'id'>) => void;
    updatePayment: (payment: Payment) => void;
    deletePayment: (id: string) => void;
    addFile: (file: Omit<StoredFile, 'id'>) => Promise<StoredFile>;
}

const currencySymbols: Record<Payment['currency'], string> = {
    KZT: '₸',
    USD: '$',
    RUB: '₽',
};

const formatCurrency = (amount: number, currency: Payment['currency']) => {
    return `${currencySymbols[currency]}${new Intl.NumberFormat('ru-RU').format(amount)}`;
};

const PaymentFormModal: React.FC<{
    onClose: () => void;
    onSave: (payment: Omit<Payment, 'id'> | Payment) => void;
    initialData?: Partial<Payment> | null;
}> = ({ onClose, onSave, initialData }) => {

    const isEditing = !!initialData?.id;

    const [formData, setFormData] = useState<Omit<Payment, 'id'>>({
        serviceName: initialData?.serviceName || '',
        lastPaymentDate: initialData?.lastPaymentDate || new Date().toISOString().split('T')[0],
        nextPaymentDate: initialData?.nextPaymentDate || '',
        paymentPeriod: initialData?.paymentPeriod || 'monthly',
        amount: initialData?.amount || 0,
        currency: initialData?.currency || 'KZT',
        comment: initialData?.comment || '',
        paymentMethod: initialData?.paymentMethod || 'Карта',
        paymentDetails: initialData?.paymentDetails || '',
        invoiceId: initialData?.invoiceId || null,
        recipientName: initialData?.recipientName || '',
        recipientBin: initialData?.recipientBin || '',
        recipientBank: initialData?.recipientBank || '',
        recipientIic: initialData?.recipientIic || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const paymentToSave = { ...formData, amount: Number(formData.amount) };
        if (isEditing) {
            onSave({ ...paymentToSave, id: initialData.id! });
        } else {
            onSave(paymentToSave);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {isEditing ? 'Редактировать платеж' : 'Добавить новый платеж'}
                    </h2>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-2xl">&times;</button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto bg-gray-50/50 dark:bg-slate-900/50">
                    {/* Main Information */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Детали сервиса</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">Название сервиса / подписки *</label>
                                <input required name="serviceName" value={formData.serviceName} onChange={handleChange} className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" placeholder="Напр: Google Ads, Amazon Web Services, Аренда" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">Сумма платежа *</label>
                                <input required type="number" name="amount" value={formData.amount} onChange={handleChange} className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">Валюта</label>
                                <select name="currency" value={formData.currency} onChange={handleChange} className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm">
                                    <option value="KZT">Тенге (₸)</option>
                                    <option value="USD">Доллар ($)</option>
                                    <option value="RUB">Рубль (₽)</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-blue-600 dark:text-blue-400 block mb-1 uppercase tracking-widest">ДАТА СЛЕДУЮЩЕГО ПЛАТЕЖА *</label>
                                <input required type="date" name="nextPaymentDate" value={formData.nextPaymentDate} onChange={handleChange} className="w-full bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800 focus:ring-2 focus:ring-blue-500 outline-none font-bold shadow-sm" />
                            </div>
                        </div>
                    </div>

                    {/* Recipient Details */}
                    <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Банковские реквизиты получателя</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">Наименование компании (Юр. лицо)</label>
                                <input name="recipientName" value={formData.recipientName} onChange={handleChange} className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" placeholder="ТОО 'Название компании'" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">БИН / ИИН</label>
                                <input name="recipientBin" value={formData.recipientBin} onChange={handleChange} className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" placeholder="12 цифр" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">Название банка</label>
                                <input name="recipientBank" value={formData.recipientBank} onChange={handleChange} className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" placeholder="Напр: Kaspi Bank" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">ИИК (Счет получателя / IBAN)</label>
                                <input name="recipientIic" value={formData.recipientIic} onChange={handleChange} className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" placeholder="KZ..." />
                            </div>
                        </div>
                    </div>

                    {/* Additional Settings */}
                    <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">Периодичность</label>
                                <select name="paymentPeriod" value={formData.paymentPeriod} onChange={handleChange} className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm">
                                    <option value="monthly">Раз в месяц</option>
                                    <option value="yearly">Раз в год</option>
                                    <option value="onetime">Разовый платеж</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">Способ оплаты</label>
                                <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm">
                                    <option value="Карта">Корпоративная карта</option>
                                    <option value="Безнал">Безналичный расчет (Счет)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1 uppercase tracking-wider">Заметка / Комментарий</label>
                            <textarea name="comment" value={formData.comment} onChange={handleChange} className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" rows={2} />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t dark:border-slate-700 flex justify-end gap-3 bg-white dark:bg-slate-800 rounded-b-2xl sticky bottom-0 shadow-lg">
                    <button type="button" onClick={onClose} className="bg-gray-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2.5 px-6 rounded-xl hover:bg-gray-200 transition-all text-sm">Отмена</button>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 text-sm uppercase tracking-widest">✓ Сохранить</button>
                </div>
            </form>
        </div>
    )
};


const PaymentsPage: React.FC<PaymentsPageProps> = ({ payments, files, addPayment, updatePayment, deletePayment, addFile }) => {
    const [isFormOpen, setFormOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<Payment | Partial<Payment> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [monthFilter, setMonthFilter] = useState<string>('all');
    const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredPayments = useMemo(() => {
        return payments.filter(p => {
            const nextDate = new Date(p.nextPaymentDate);
            const mMatch = monthFilter === 'all' || (nextDate.getMonth() + 1).toString() === monthFilter;
            const yMatch = yearFilter === 'all' || nextDate.getFullYear().toString() === yearFilter;
            return mMatch && yMatch;
        }).sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime());
    }, [payments, monthFilter, yearFilter]);

    const upcomingPayments = useMemo(() => {
        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return payments
            .filter(p => {
                const nextPaymentDate = new Date(p.nextPaymentDate);
                return nextPaymentDate >= now && nextPaymentDate <= oneWeekFromNow;
            })
            .sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime());
    }, [payments]);

    const summary = useMemo(() => {
        const monthlyTotal: Record<string, number> = { KZT: 0, USD: 0, RUB: 0 };

        filteredPayments.forEach(p => {
            monthlyTotal[p.currency] += p.amount;
        });

        return {
            totalCount: filteredPayments.length,
            monthlyKZT: monthlyTotal.KZT,
            monthlyUSD: monthlyTotal.USD,
            monthlyRUB: monthlyTotal.RUB
        };
    }, [filteredPayments]);

    const handleAddClick = () => {
        setEditingPayment(null);
        setFormOpen(true);
    };

    const handleEditClick = (payment: Payment) => {
        setEditingPayment(payment);
        setFormOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Вы уверены, что хотите удалить этот платеж?')) {
            deletePayment(id);
        }
    };

    const handleSave = (paymentData: Omit<Payment, 'id'> | Payment) => {
        if ('id' in paymentData) {
            updatePayment(paymentData as Payment);
        } else {
            addPayment(paymentData);
        }
        setFormOpen(false);
    };

    const handleShareReport = () => {
        if (filteredPayments.length === 0) {
            alert('Нет платежей для формирования отчета.');
            return;
        }

        const reportDateStr = monthFilter === 'all' ? `за ${yearFilter} год` : `${new Date(0, parseInt(monthFilter) - 1).toLocaleString('ru', { month: 'long' })} ${yearFilter}`;

        let textReport = `ОТЧЕТ ПО ПЛАТЕЖАМ (${reportDateStr})\n\n`;
        filteredPayments.forEach(p => {
            textReport += `🔹 ${p.serviceName}\n`;
            textReport += `Сумма: ${formatCurrency(p.amount, p.currency)}\n`;
            textReport += `Дата: ${new Date(p.nextPaymentDate).toLocaleDateString()}\n`;
            if (p.recipientName) {
                textReport += `Получатель: ${p.recipientName}\n`;
                textReport += `БИН: ${p.recipientBin || '-'}\n`;
                textReport += `Счет: ${p.recipientIic || '-'}\n`;
            }
            textReport += `------------------------\n`;
        });

        textReport += `\nИТОГО:\n`;
        if (summary.monthlyKZT > 0) textReport += `KZT: ${formatCurrency(summary.monthlyKZT, 'KZT')}\n`;
        if (summary.monthlyUSD > 0) textReport += `USD: ${formatCurrency(summary.monthlyUSD, 'USD')}\n`;
        if (summary.monthlyRUB > 0) textReport += `RUB: ${formatCurrency(summary.monthlyRUB, 'RUB')}\n`;

        navigator.clipboard.writeText(textReport).then(() => {
            alert('Отчет скопирован в буфер обмена для отправки бухгалтеру.');
        });
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError('');
        try {
            const base64Data = await fileToBase64(file);
            const analyzedData = await analyzePaymentInvoice(file.type, base64Data);

            const newFile = await addFile({
                name: file.name,
                type: file.type,
                size: file.size,
                content: base64Data,
                date: new Date().toISOString()
            });

            const nextPaymentDate = new Date(analyzedData.lastPaymentDate || Date.now());
            if (analyzedData.paymentPeriod === 'monthly') {
                nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
            } else if (analyzedData.paymentPeriod === 'yearly') {
                nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
            }

            setEditingPayment({
                ...analyzedData,
                nextPaymentDate: nextPaymentDate.toISOString().split('T')[0],
                invoiceId: newFile.id
            });
            setFormOpen(true);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось проанализировать файл.');
        } finally {
            setIsLoading(false);
            if (e.target) e.target.value = '';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {isFormOpen && (
                <PaymentFormModal
                    onClose={() => setFormOpen(false)}
                    onSave={handleSave}
                    initialData={editingPayment}
                />
            )}

            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Управление платежами</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Календарь регулярных платежей, подписок и реквизиты для оплаты</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept="image/*,application/pdf" />
                    <button onClick={handleShareReport} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold py-2.5 px-5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        Отчет
                    </button>
                    <button onClick={handleImportClick} disabled={isLoading} className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-2.5 px-5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-50 shadow-sm flex items-center gap-2">
                        {isLoading ? <span className="animate-pulse">...</span> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                        Скан
                    </button>
                    <button onClick={handleAddClick} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all active:scale-95 uppercase tracking-wider">+ Добавить</button>
                </div>
            </div>

            {error && <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 text-red-700 dark:text-red-400 rounded-r-xl text-sm">{error}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 tabular-nums">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Активных подписок</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{summary.totalCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Всего в KZT</p>
                    <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(summary.monthlyKZT, 'KZT')}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Всего в USD</p>
                    <p className="text-3xl font-black text-green-600 dark:text-green-400">{formatCurrency(summary.monthlyUSD, 'USD')}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Всего в RUB</p>
                    <p className="text-3xl font-black text-orange-600 dark:text-orange-400">{formatCurrency(summary.monthlyRUB, 'RUB')}</p>
                </div>
            </div>

            {upcomingPayments.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 p-6 rounded-2xl shadow-sm">
                    <h3 className="text-xs font-black text-yellow-800 dark:text-yellow-400 mb-5 flex items-center gap-2 uppercase tracking-[0.2em]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        Ближайшие платежи (7 дней)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {upcomingPayments.map(p => (
                            <div key={p.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl flex justify-between items-center shadow-sm border border-yellow-100 dark:border-yellow-900/20">
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight mb-1">{p.serviceName}</p>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">{new Date(p.nextPaymentDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-slate-900 dark:text-slate-100">{formatCurrency(p.amount, p.currency)}</p>
                                    <span className="text-[9px] font-black text-yellow-600 uppercase bg-yellow-100 dark:bg-yellow-900/40 px-2 py-0.5 rounded-full">Ожидание</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Список платежей</h2>
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-700 p-1.5 rounded-xl">
                        <select
                            value={monthFilter}
                            onChange={e => setMonthFilter(e.target.value)}
                            className="bg-transparent border-none text-xs font-bold focus:ring-0 appearance-none px-4 pr-8 uppercase tracking-widest cursor-pointer"
                        >
                            <option value="all">Весь год</option>
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('ru', { month: 'long' })}</option>
                            ))}
                        </select>
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-600"></div>
                        <select
                            value={yearFilter}
                            onChange={e => setYearFilter(e.target.value)}
                            className="bg-transparent border-none text-xs font-bold focus:ring-0 appearance-none px-4 pr-8 uppercase tracking-widest cursor-pointer"
                        >
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                        <thead className="bg-gray-50/50 dark:bg-slate-700/50">
                            <tr className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em]">
                                <th className="px-4 py-5">Сервис / Коммент.</th>
                                <th className="px-4 py-5">Дата</th>
                                <th className="px-4 py-5 text-right">Сумма</th>
                                <th className="px-4 py-5">Получатель</th>
                                <th className="px-4 py-5">Способ</th>
                                <th className="px-1 py-5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700 tabular-nums">
                            {filteredPayments.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-4 py-5">
                                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[120px]" title={p.serviceName}>{p.serviceName}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 max-w-[120px] truncate italic" title={p.comment}>{p.comment || 'Нет описания'}</p>
                                    </td>
                                    <td className="px-4 py-5 whitespace-nowrap">
                                        <p className="font-bold text-slate-800 dark:text-slate-200">{new Date(p.nextPaymentDate).toLocaleDateString()}</p>
                                        <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest">{p.paymentPeriod === 'monthly' ? 'Мес.' : p.paymentPeriod === 'yearly' ? 'Год' : 'Раз'}</span>
                                    </td>
                                    <td className="px-4 py-5 text-right font-black text-slate-900 dark:text-slate-100">{formatCurrency(p.amount, p.currency)}</td>
                                    <td className="px-4 py-5 text-[10px]">
                                        {p.recipientName ? (
                                            <div className="space-y-0.5 leading-tight">
                                                <p className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={p.recipientName}>{p.recipientName}</p>
                                                <p className="text-[9px] text-slate-400 flex items-center gap-1"><span className="font-black uppercase opacity-50">БИН:</span> {p.recipientBin || '-'}</p>
                                                <p className="text-[9px] text-slate-400 truncate max-w-[120px] flex items-center gap-1" title={p.recipientIic}><span className="font-black uppercase opacity-50">ИИК:</span> {p.recipientIic || '-'}</p>
                                            </div>
                                        ) : <span className="text-slate-400 italic text-[9px] font-bold uppercase tracking-widest">Не указан</span>}
                                    </td>
                                    <td className="px-4 py-5">
                                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${p.paymentMethod === 'Безнал' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-400'}`}>
                                            {p.paymentMethod}
                                        </span>
                                    </td>
                                    <td className="px-1 py-5 flex space-x-1 justify-end opacity-0 group-hover:opacity-100 transition-all duration-300">
                                        <button onClick={() => handleEditClick(p as Payment)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all" title="Изменить">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all" title="Удалить">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredPayments.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-24 text-slate-400 font-bold uppercase tracking-widest text-xs">В выбранном периоде платежей не найдено.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PaymentsPage;
