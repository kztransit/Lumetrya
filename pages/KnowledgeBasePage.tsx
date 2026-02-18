import React, { useState } from 'react';
import { KnowledgeItem } from '../types';

interface KnowledgeBasePageProps {
    knowledgeBase: KnowledgeItem[];
    addKnowledgeItem: (item: Omit<KnowledgeItem, 'id'>) => void;
    updateKnowledgeItem: (item: KnowledgeItem) => void;
    deleteKnowledgeItem: (id: string) => void;
}

const KnowledgeItemModal: React.FC<{
    item?: KnowledgeItem;
    onClose: () => void;
    onSave: (item: Omit<KnowledgeItem, 'id'> | KnowledgeItem) => void;
}> = ({ item, onClose, onSave }) => {
    const [title, setTitle] = useState(item?.title || '');
    const [content, setContent] = useState(item?.content || '');
    const [links, setLinks] = useState<string[]>(item?.links || ['']);

    const handleAddLink = () => setLinks([...links, '']);
    const handleLinkChange = (index: number, value: string) => {
        const newLinks = [...links];
        newLinks[index] = value;
        setLinks(newLinks);
    };
    const handleRemoveLink = (index: number) => {
        setLinks(links.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanedLinks = links.filter(l => l.trim() !== '');
        const data = item ? { ...item, title, content, links: cleanedLinks } : { title, content, links: cleanedLinks, date: new Date().toISOString() };
        onSave(data);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{item ? 'Редактировать запись' : 'Новая запись'}</h2>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Заголовок</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100"
                                placeholder="Например: Регламент работы с РТИ"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Содержание</label>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-40 resize-none dark:text-slate-100"
                                placeholder="Опишите важные детали..."
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Ссылки</label>
                            <div className="space-y-2">
                                {links.map((link, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="url"
                                            value={link}
                                            onChange={e => handleLinkChange(idx, e.target.value)}
                                            className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-slate-100"
                                            placeholder="https://..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveLink(idx)}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={handleAddLink}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 mt-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                    Добавить ссылку
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Отмена</button>
                        <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const KnowledgeBasePage: React.FC<KnowledgeBasePageProps> = ({ knowledgeBase, addKnowledgeItem, updateKnowledgeItem, deleteKnowledgeItem }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<KnowledgeItem | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredItems = knowledgeBase.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleEdit = (item: KnowledgeItem) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleSave = (itemData: Omit<KnowledgeItem, 'id'> | KnowledgeItem) => {
        if ('id' in itemData) {
            updateKnowledgeItem(itemData as KnowledgeItem);
        } else {
            addKnowledgeItem(itemData);
        }
        setIsModalOpen(false);
        setEditingItem(undefined);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Вы уверены, что хотите удалить эту запись из базы знаний?')) {
            deleteKnowledgeItem(id);
        }
    };

    return (
        <div className="space-y-6">
            {isModalOpen && <KnowledgeItemModal item={editingItem} onClose={() => { setIsModalOpen(false); setEditingItem(undefined); }} onSave={handleSave} />}

            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">База знаний</h1>
                    <p className="text-slate-500 mt-1">Хранилище знаний и полезных ссылок, доступное вашему AI ассистенту</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    <span>Добавить запись</span>
                </button>
            </div>

            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                </div>
                <input
                    type="text"
                    placeholder="Поиск по базе знаний..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl leading-5 bg-white dark:bg-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm shadow-sm"
                />
            </div>

            {filteredItems.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="mx-auto w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.247 18.477 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <h3 className="text-xl font-bold dark:text-slate-100 mb-2">База знаний пуста</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mb-8">Создайте первую запись, чтобы сохранить важную информацию для работы или для AI ассистента.</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-blue-600 font-bold hover:underline"
                    >
                        Начать заполнение
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map(item => (
                        <div
                            key={item.id}
                            onClick={() => handleEdit(item)}
                            className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col h-full"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                                <button
                                    onClick={(e) => handleDelete(item.id, e)}
                                    className="p-1.5 text-slate-300 hover:text-red-500 transition-colors md:opacity-0 group-hover:opacity-100"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-6 flex-1">{item.content}</p>
                            <div className="pt-4 border-t border-slate-50 dark:border-slate-700 flex justify-between items-center">
                                <div className="flex -space-x-1">
                                    {item.links.length > 0 && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0l-1.5-1.5a2 2 0 112.828-2.828l1.5 1.5 3-3a2 2 0 010 2.828l-3 3a2 2 0 11-2.828-2.828v-.001z" clipRule="evenodd" /></svg>
                                            {item.links.length} {item.links.length === 1 ? 'ссылка' : 'ссылок'}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(item.date).toLocaleDateString('ru')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default KnowledgeBasePage;
