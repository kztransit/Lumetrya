import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CommercialProposal } from '../types';
import { fileToBase64, formatCurrency, formatDate } from '../utils';
import { analyzeProposalsImage } from '../services/geminiService';

interface CommercialProposalsPageProps {
    proposals: CommercialProposal[];
    addProposal: (proposal: Omit<CommercialProposal, 'id'>) => void;
    deleteProposal: (id: string) => void;
    setProposals: (updater: (prevProposals: CommercialProposal[]) => CommercialProposal[]) => void;
    updateProposal: (proposal: CommercialProposal) => void;
}

const statusColorMap: { [key in CommercialProposal['status']]: string } = {
    'Оплачено': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    'Ожидание': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    'Отменено': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
};

const calculateSummary = (proposalList: CommercialProposal[]): { paidAmount: number, paidCount: number, pendingAmount: number, pendingCount: number } => {
    let paidAmount = 0;
    let paidCount = 0;
    let pendingAmount = 0;
    let pendingCount = 0;
    for (const p of proposalList) {
        const amount = Number(p.amount) || 0;
        if (p.status === 'Оплачено') {
            paidAmount += amount;
            paidCount += 1;
        } else if (p.status === 'Ожидание') {
            pendingAmount += amount;
            pendingCount += 1;
        }
    }
    return { paidAmount, paidCount, pendingAmount, pendingCount };
};

const ProposalFormModal: React.FC<{
    onClose: () => void,
    onSave: (proposal: Omit<CommercialProposal, 'id'> | CommercialProposal) => void,
    initialData?: CommercialProposal | null,
    defaultDirection?: 'РТИ' | '3D'
}> = ({ onClose, onSave, initialData, defaultDirection }) => {

    const isEditing = !!initialData;

    const getInitialState = (): Omit<CommercialProposal, 'id'> => {
        if (initialData) return initialData;
        return {
            date: new Date().toISOString().split('T')[0],
            direction: defaultDirection || 'РТИ',
            item: '',
            amount: 0,
            company: null,
            invoiceNumber: null,
            invoiceDate: null,
            paymentDate: null,
            status: 'Ожидание',
            paymentType: null,
            proposalNumber: ''
        };
    };

    const [formData, setFormData] = useState<Omit<CommercialProposal, 'id'>>(getInitialState());

    useEffect(() => {
        setFormData(getInitialState());
    }, [initialData, defaultDirection]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const proposalToSave = {
            ...formData,
            amount: Number(formData.amount) || 0,
            proposalNumber: formData.proposalNumber || `КП-${Math.floor(Math.random() * 10000)}`
        };

        if (isEditing) {
            onSave({ ...proposalToSave, id: initialData.id });
        } else {
            onSave(proposalToSave);
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800">
                    <h2 className="text-xl font-bold dark:text-slate-100">{isEditing ? "Редактировать КП" : "Создать КП вручную"}</h2>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-2xl">&times;</button>
                </div>
                <div className="p-6 space-y-6 bg-gray-50 dark:bg-slate-900/50 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border dark:border-slate-700">
                        <h3 className="font-semibold mb-4 dark:text-slate-200">Основная информация</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Дата КП *</label><input required name="date" type="date" value={formData.date} onChange={handleChange} className="w-full bg-gray-100 dark:bg-slate-700 dark:text-slate-200 p-2 rounded-lg" /></div>
                            <div><label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Направление</label><select name="direction" value={formData.direction} onChange={handleChange} className="w-full bg-gray-100 dark:bg-slate-700 dark:text-slate-200 p-2 rounded-lg"><option>РТИ</option><option>3D</option></select></div>
                            <div className="md:col-span-2"><label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Наименование товара/услуги *</label><input required name="item" type="text" value={formData.item} onChange={handleChange} className="w-full bg-gray-100 dark:bg-slate-700 dark:text-slate-200 p-2 rounded-lg" /></div>
                            <div><label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Сумма (₸) *</label><input required name="amount" type="number" value={formData.amount} onChange={handleChange} className="w-full bg-gray-100 dark:bg-slate-700 dark:text-slate-200 p-2 rounded-lg" /></div>
                            <div><label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Компания</label><input name="company" type="text" value={formData.company || ''} onChange={handleChange} className="w-full bg-gray-100 dark:bg-slate-700 dark:text-slate-200 p-2 rounded-lg" /></div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border dark:border-slate-700">
                        <h3 className="font-semibold mb-4 dark:text-slate-200">Счет и оплата</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Номер счета</label><input name="invoiceNumber" type="text" value={formData.invoiceNumber || ''} onChange={handleChange} className="w-full bg-gray-100 dark:bg-slate-700 dark:text-slate-200 p-2 rounded-lg" /></div>
                            <div><label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Дата счета</label><input name="invoiceDate" type="date" value={formData.invoiceDate || ''} onChange={handleChange} className="w-full bg-gray-100 dark:bg-slate-700 dark:text-slate-200 p-2 rounded-lg" /></div>
                            <div><label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Дата поступления оплаты</label><input name="paymentDate" type="date" value={formData.paymentDate || ''} onChange={handleChange} className="w-full bg-gray-100 dark:bg-slate-700 dark:text-slate-200 p-2 rounded-lg" /></div>
                            <div><label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Статус</label><select name="status" value={formData.status} onChange={handleChange} className="w-full bg-gray-100 dark:bg-slate-700 dark:text-slate-200 p-2 rounded-lg"><option>Ожидание</option><option>Оплачено</option><option>Отменено</option></select></div>
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex justify-end sticky bottom-0 bg-white dark:bg-slate-800">
                    <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg">✓ {isEditing ? "Сохранить" : "Создать КП"}</button>
                </div>
            </form>
        </div>
    );
};

const ProposalTable: React.FC<{
    proposals: CommercialProposal[];
    onEdit: (proposal: CommercialProposal) => void;
    onDelete: (id: string) => void;
}> = ({ proposals, onEdit, onDelete }) => {
    if (proposals.length === 0) {
        return <div className="text-center py-10 text-slate-500 dark:text-slate-400">Нет данных для отображения.</div>;
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                <thead className="text-xs text-slate-500 uppercase bg-gray-50 dark:bg-slate-700">
                    <tr>
                        <th className="px-4 py-3 whitespace-nowrap">Дата</th>
                        <th className="px-4 py-3 whitespace-nowrap">№ счета</th>
                        <th className="px-4 py-3 whitespace-nowrap">Компания</th>
                        <th className="px-4 py-3 whitespace-nowrap">Наименование</th>
                        <th className="px-4 py-3 whitespace-nowrap text-right">Сумма</th>
                        <th className="px-4 py-3 whitespace-nowrap">Статус</th>
                        <th className="px-4 py-3 whitespace-nowrap"></th>
                    </tr>
                </thead>
                <tbody className="tabular-nums">
                    {proposals.map(p => (
                        <tr key={p.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{formatDate(p.date)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{p.invoiceNumber || p.proposalNumber}</td>
                            <td className="px-4 py-3 whitespace-nowrap max-w-[150px] truncate">{p.company || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap max-w-[200px] truncate">{p.item}</td>
                            <td className="px-4 py-3 font-semibold text-right whitespace-nowrap">{formatCurrency(p.amount)}</td>
                            <td className="px-4 py-3 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColorMap[p.status]}`}>{p.status}</span></td>
                            <td className="px-4 py-3 flex space-x-3 justify-end whitespace-nowrap">
                                <button onClick={() => onEdit(p)} className="text-slate-400 hover:text-cyan-500 transition-colors">✏️</button>
                                <button onClick={() => onDelete(p.id)} className="text-slate-400 hover:text-red-500 transition-colors">🗑️</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const PaginationControls: React.FC<{
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => (
    <div className="flex justify-between items-center mt-4 pt-4 border-t dark:border-slate-700">
        <span className="text-sm text-slate-500 dark:text-slate-400">
            Страница {currentPage} из {totalPages}
        </span>
        <div className="flex space-x-2">
            <button
                onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-white dark:bg-slate-700 dark:text-slate-200 border dark:border-slate-600 rounded-md disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
            >
                Назад
            </button>
            <button
                onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-white dark:bg-slate-700 dark:text-slate-200 border dark:border-slate-600 rounded-md disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
            >
                Вперед
            </button>
        </div>
    </div>
);

const CommercialProposalsPage: React.FC<CommercialProposalsPageProps> = ({ proposals, addProposal, deleteProposal, setProposals, updateProposal }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProposal, setEditingProposal] = useState<CommercialProposal | null>(null);
    const [activeTab, setActiveTab] = useState<'РТИ' | '3D'>('РТИ');
    const [modalContext, setModalContext] = useState<'РТИ' | '3D'>('РТИ');

    const [filters, setFilters] = useState({
        status: 'all',
        month: 'all',
        year: 'all',
        search: '',
    });

    const [rtiCurrentPage, setRtiCurrentPage] = useState(1);
    const [d3CurrentPage, setD3CurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 30;

    const availableYears = useMemo(() => {
        if (!proposals) return [];
        const years = new Set(proposals.map(p => new Date(p.date).getFullYear()));
        return Array.from(years).sort((a: number, b: number) => b - a);
    }, [proposals]);

    useEffect(() => {
        setRtiCurrentPage(1);
        setD3CurrentPage(1);
    }, [filters]);

    const { rtiProposals, d3Proposals, rtiSummary, d3Summary, totalSummary } = useMemo(() => {
        const filtered = proposals.filter(p => {
            const proposalDate = new Date(p.date);
            const searchLower = filters.search.toLowerCase();
            return (
                (filters.status === 'all' || p.status === filters.status) &&
                (filters.month === 'all' || (proposalDate.getMonth() + 1).toString() === filters.month) &&
                (filters.year === 'all' || proposalDate.getFullYear().toString() === filters.year) &&
                (filters.search === '' ||
                    p.item.toLowerCase().includes(searchLower) ||
                    (p.company && p.company.toLowerCase().includes(searchLower)) ||
                    p.proposalNumber.toLowerCase().includes(searchLower)
                )
            );
        });

        const rtiProposals = filtered.filter(p => p.direction === 'РТИ');
        const d3Proposals = filtered.filter(p => p.direction === '3D');

        const rtiSummary = calculateSummary(rtiProposals);
        const d3Summary = calculateSummary(d3Proposals);

        const totalSummary = {
            paidAmount: rtiSummary.paidAmount + d3Summary.paidAmount,
            paidCount: rtiSummary.paidCount + d3Summary.paidCount,
            pendingAmount: rtiSummary.pendingAmount + d3Summary.pendingAmount,
            pendingCount: rtiSummary.pendingCount + d3Summary.pendingCount,
            totalCount: filtered.length
        };

        return { rtiProposals, d3Proposals, rtiSummary, d3Summary, totalSummary };
    }, [proposals, filters]);

    const rtiTotalPages = Math.ceil(rtiProposals.length / ITEMS_PER_PAGE);
    const paginatedRtiProposals = rtiProposals.slice((rtiCurrentPage - 1) * ITEMS_PER_PAGE, rtiCurrentPage * ITEMS_PER_PAGE);

    const d3TotalPages = Math.ceil(d3Proposals.length / ITEMS_PER_PAGE);
    const paginatedD3Proposals = d3Proposals.slice((d3CurrentPage - 1) * ITEMS_PER_PAGE, d3CurrentPage * ITEMS_PER_PAGE);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleEdit = (proposal: CommercialProposal) => {
        setEditingProposal(proposal);
        setModalContext(proposal.direction);
        setIsFormOpen(true);
    };

    const handleDelete = useCallback((id: string) => {
        if (window.confirm('Вы уверены, что хотите удалить это КП?')) {
            deleteProposal(id);
        }
    }, [deleteProposal]);

    const handleSave = (proposalData: Omit<CommercialProposal, 'id'> | CommercialProposal) => {
        if ('id' in proposalData) {
            updateProposal(proposalData);
        } else {
            addProposal(proposalData);
        }
        setIsFormOpen(false);
        setEditingProposal(null);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingProposal(null);
    }

    return (
        <div className="space-y-6">
            {isFormOpen && <ProposalFormModal onClose={closeForm} onSave={handleSave} initialData={editingProposal} defaultDirection={modalContext} />}

            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Коммерческие предложения</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Отслеживание и управление всеми КП, счетами и оплатами</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 tabular-nums">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border dark:border-slate-700"><p className="text-sm text-slate-500 dark:text-slate-400">Всего оплачено</p><p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalSummary.paidAmount)}</p><p className="text-xs text-slate-400">{totalSummary.paidCount} шт.</p></div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border dark:border-slate-700"><p className="text-sm text-slate-500 dark:text-slate-400">Всего в ожидании</p><p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{formatCurrency(totalSummary.pendingAmount)}</p><p className="text-xs text-slate-400">{totalSummary.pendingCount} шт.</p></div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border dark:border-slate-700"><p className="text-sm text-slate-500 dark:text-slate-400">Общая конверсия в оплату</p><p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalSummary.totalCount > 0 ? ((totalSummary.paidCount / totalSummary.totalCount) * 100).toFixed(1) : 0}%</p></div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border dark:border-slate-700">
                <div className="flex flex-col md:flex-row items-center gap-2">
                    <input type="search" name="search" placeholder="Поиск по товару, компании, номеру..." value={filters.search} onChange={handleFilterChange} className="bg-gray-100 dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg text-sm w-full md:w-1/3 border dark:border-slate-600" />
                    <select name="status" value={filters.status} onChange={handleFilterChange} className="bg-gray-100 dark:bg-slate-700 dark:text-slate-200 p-2 rounded-lg text-sm w-full md:w-auto border dark:border-slate-600"><option value="all">Все статусы</option><option>Оплачено</option><option>Ожидание</option><option>Отменено</option></select>
                    <select name="month" value={filters.month} onChange={handleFilterChange} className="bg-gray-100 dark:bg-slate-700 dark:text-slate-200 p-2 rounded-lg text-sm w-full md:w-auto border dark:border-slate-600"><option value="all">Все месяцы</option>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('ru', { month: 'long' })}</option>)}</select>
                    <select name="year" value={filters.year} onChange={handleFilterChange} className="bg-gray-100 dark:bg-slate-700 dark:text-slate-200 p-2 rounded-lg text-sm w-full md:w-auto border dark:border-slate-600"><option value="all">Все годы</option>{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select>
                </div>
            </div>

            <div className="border-b border-gray-200 dark:border-slate-700">
                <nav className="flex space-x-2 -mb-px">
                    <button onClick={() => setActiveTab('РТИ')} className={`py-3 px-4 font-semibold text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'РТИ' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'}`}>
                        Направление: РТИ ({rtiProposals.length})
                    </button>
                    <button onClick={() => setActiveTab('3D')} className={`py-3 px-4 font-semibold text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeTab === '3D' ? 'text-green-600 dark:text-green-400 border-b-2 border-green-500' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'}`}>
                        Направление: 3D ({d3Proposals.length})
                    </button>
                </nav>
            </div>

            {activeTab === 'РТИ' && (
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border dark:border-slate-700 flex flex-col">
                    <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-2">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>РТИ
                        </h2>
                        <div className="flex space-x-2">
                            <button onClick={() => { setModalContext('РТИ'); setEditingProposal(null); setIsFormOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm shadow-md transition-transform hover:scale-105">+ Добавить вручную</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 tabular-nums">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border dark:border-blue-900/30 text-center md:text-left"><p className="text-sm text-blue-800 dark:text-blue-300">Оплачено (РТИ)</p><p className="font-bold text-lg dark:text-blue-100">{formatCurrency(rtiSummary.paidAmount)}</p></div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border dark:border-yellow-900/30 text-center md:text-left"><p className="text-sm text-yellow-800 dark:text-yellow-300">Ожидание (РТИ)</p><p className="font-bold text-lg dark:text-yellow-100">{formatCurrency(rtiSummary.pendingAmount)}</p></div>
                        <div className="bg-gray-100 dark:bg-slate-700 p-3 rounded-lg text-center md:text-left"><p className="text-sm text-gray-800 dark:text-slate-400">Конверсия (РТИ)</p><p className="font-bold text-lg dark:text-slate-200">{rtiProposals.length > 0 ? ((rtiSummary.paidCount / rtiProposals.length) * 100).toFixed(1) : 0}%</p></div>
                    </div>
                    <ProposalTable proposals={paginatedRtiProposals} onEdit={handleEdit} onDelete={handleDelete} />
                    {rtiProposals.length > ITEMS_PER_PAGE && (
                        <PaginationControls currentPage={rtiCurrentPage} totalPages={rtiTotalPages} onPageChange={setRtiCurrentPage} />
                    )}
                </div>
            )}

            {activeTab === '3D' && (
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border dark:border-slate-700 flex flex-col">
                    <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-2">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span className="w-3 h-3 bg-green-500 rounded-full"></span>3D
                        </h2>
                        <div className="flex space-x-2">
                            <button onClick={() => { setModalContext('3D'); setEditingProposal(null); setIsFormOpen(true); }} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm shadow-md transition-transform hover:scale-105">+ Добавить вручную</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 tabular-nums">
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border dark:border-green-900/30 text-center md:text-left"><p className="text-sm text-green-800 dark:text-green-300">Оплачено (3D)</p><p className="font-bold text-lg dark:text-green-100">{formatCurrency(d3Summary.paidAmount)}</p></div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border dark:border-yellow-900/30 text-center md:text-left"><p className="text-sm text-yellow-800 dark:text-yellow-300">Ожидание (3D)</p><p className="font-bold text-lg dark:text-yellow-100">{formatCurrency(d3Summary.pendingAmount)}</p></div>
                        <div className="bg-gray-100 dark:bg-slate-700 p-3 rounded-lg text-center md:text-left"><p className="text-sm text-gray-800 dark:text-slate-400">Конверсия (3D)</p><p className="font-bold text-lg dark:text-slate-200">{d3Proposals.length > 0 ? ((d3Summary.paidCount / d3Proposals.length) * 100).toFixed(1) : 0}%</p></div>
                    </div>
                    <ProposalTable proposals={paginatedD3Proposals} onEdit={handleEdit} onDelete={handleDelete} />
                    {d3Proposals.length > ITEMS_PER_PAGE && (
                        <PaginationControls currentPage={d3CurrentPage} totalPages={d3TotalPages} onPageChange={setD3CurrentPage} />
                    )}
                </div>
            )}
        </div>
    );
};

export default CommercialProposalsPage;