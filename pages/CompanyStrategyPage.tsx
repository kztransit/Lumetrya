
import React, { useRef, useState } from 'react';
import { extractTextFromDocument } from '../services/geminiService';
import { fileToBase64 } from '../utils';
import MarkdownRenderer from '../components/MarkdownRenderer';

interface CompanyStrategyPageProps {
    strategy: string;
    updateStrategy: (strategy: string) => void;
}

const CompanyStrategyPage: React.FC<CompanyStrategyPageProps> = ({ strategy, updateStrategy }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editableStrategy, setEditableStrategy] = useState(strategy);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = [
            'text/plain',
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.docx')) {
            alert('Пожалуйста, выберите текстовый файл (.txt), PDF или Word (.docx)');
            return;
        }

        setIsUploading(true);
        try {
            if (file.type === 'text/plain') {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const content = event.target?.result as string;
                    updateStrategy(content);
                    setIsUploading(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                };
                reader.readAsText(file);
            } else {
                // PDF or DOCX
                const base64 = await fileToBase64(file);
                const extractedText = await extractTextFromDocument(file.type || 'application/octet-stream', base64);
                if (extractedText) {
                    updateStrategy(extractedText);
                } else {
                    alert('Не удалось извлечь текст из документа');
                }
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Ошибка при обработке файла');
            setIsUploading(false);
        }
    };

    const handleSave = () => {
        updateStrategy(editableStrategy);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditableStrategy(strategy);
        setIsEditing(false);
    };

    const startEditing = () => {
        setEditableStrategy(strategy);
        setIsEditing(true);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 transition-all">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h10.5m-10.5 3h10.5m-10.5-9h10.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-10.5a2.25 2.25 0 0 1-2.25-2.25V5.25A2.25 2.25 0 0 1 6.75 3h10.5a2.25 2.25 0 0 1 2.25 2.25v.75" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Стратегия компании</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Управляйте документами о стратегии вашей компании</p>
                    </div>
                </div>
                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".txt,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={`inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isUploading ? (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        )}
                        Загрузить стратегию
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-all">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
                        </svg>
                        Текущий документ
                    </h2>
                    {!isEditing && strategy && (
                        <button
                            onClick={startEditing}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1.5 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Редактировать
                        </button>
                    )}
                </div>
                <div className="p-8">
                    {isEditing ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Редактирование (Markdown)</label>
                                <textarea
                                    value={editableStrategy}
                                    onChange={(e) => setEditableStrategy(e.target.value)}
                                    className="w-full min-h-[500px] p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all font-mono text-sm leading-relaxed"
                                    placeholder="Введите или вставьте текст стратегии (поддерживается Markdown)..."
                                />
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        onClick={handleCancel}
                                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-md active:scale-95"
                                    >
                                        Сохранить изменения
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Предпросмотр</label>
                                <div className="w-full min-h-[500px] p-8 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 prose dark:prose-invert max-w-none overflow-y-auto">
                                    {editableStrategy ? (
                                        <MarkdownRenderer content={editableStrategy} />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-400 italic">
                                            Текст появится здесь...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : strategy ? (
                        <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-8 border border-gray-100 dark:border-slate-800 prose dark:prose-invert max-w-none prose-slate">
                            <MarkdownRenderer content={strategy} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="bg-gray-100 dark:bg-slate-900/50 p-6 rounded-full mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Стратегия не задана</h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">Загрузите документ или введите текст стратегии вручную, чтобы Lumi мог учитывать его.</p>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-medium rounded-xl transition-all"
                            >
                                Ввести текст вручную
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl p-6">
                <div className="flex gap-4">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg h-fit">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 dark:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-amber-800 dark:text-amber-400 font-bold mb-1">Как это работает?</h4>
                        <p className="text-amber-700 dark:text-amber-500/80 text-sm leading-relaxed">
                            После загрузки файла, весь его текст будет передаваться ассистенту Lumi в качестве контекста.
                            Вы сможете задавать вопросы по стратегии, просить проверить соответствие отчетов вашим целям или получать рекомендации,
                            сформулированные с учетом миссии и видения вашей компании.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyStrategyPage;
