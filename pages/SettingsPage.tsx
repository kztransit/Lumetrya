
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UserData, CompanyProfile, CompanyDetails, CompanyContacts } from '../types';
import { fetchCompanyDataByBin } from '../services/geminiService';

interface SettingsPageProps {
    fullUserData: UserData;
    setAllUserData: (data: UserData) => void;
    setCompanyProfile: (profile: CompanyProfile) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ fullUserData, setAllUserData, setCompanyProfile }) => {
    const [profile, setProfile] = useState<CompanyProfile>(fullUserData.companyProfile);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [binSearchStatus, setBinSearchStatus] = useState<'idle' | 'searching' | 'error'>('idle');
    const [binInput, setBinInput] = useState('');
    const [binError, setBinError] = useState('');
    const importFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Ensure contacts.phones exists (for legacy data migration)
        const currentProfile = fullUserData.companyProfile;
        if (!currentProfile.contacts.phones) {
            currentProfile.contacts.phones = [];
        }
        setProfile(currentProfile);
    }, [fullUserData.companyProfile]);

    const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, details: { ...prev.details, [name]: value } }));
    };

    const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, contacts: { ...prev.contacts, [name]: value } }));
    };

    const handlePhoneChange = (index: number, value: string) => {
        setProfile(prev => {
            const newPhones = [...(prev.contacts.phones || [])];
            newPhones[index] = value;
            return { ...prev, contacts: { ...prev.contacts, phones: newPhones } };
        });
    };

    const handleAddPhone = () => {
        setProfile(prev => ({
            ...prev,
            contacts: { ...prev.contacts, phones: [...(prev.contacts.phones || []), ''] }
        }));
    };

    const handleRemovePhone = (index: number) => {
        setProfile(prev => ({
            ...prev,
            contacts: { ...prev.contacts, phones: prev.contacts.phones.filter((_, i) => i !== index) }
        }));
    };

    const handleGenericChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleListChange = (listName: 'websites' | 'socialMedia', index: number, value: string) => {
        setProfile(prev => {
            const newList = [...prev[listName]];
            newList[index] = value;
            return { ...prev, [listName]: newList };
        });
    };

    const handleAddListItem = (listName: 'websites' | 'socialMedia') => {
        setProfile(prev => ({ ...prev, [listName]: [...prev[listName], ''] }));
    };

    const handleRemoveListItem = (listName: 'websites' | 'socialMedia', index: number) => {
        setProfile(prev => ({ ...prev, [listName]: prev[listName].filter((_, i) => i !== index) }));
    };

    const handleEmployeeChange = (id: string, field: 'name' | 'position', value: string) => {
        setProfile(prev => ({
            ...prev,
            employees: prev.employees.map(emp => emp.id === id ? { ...emp, [field]: value } : emp)
        }));
    };

    const handleAddEmployee = () => {
        setProfile(prev => ({
            ...prev,
            employees: [...prev.employees, { id: uuidv4(), name: '', position: '' }]
        }));
    };

    const handleRemoveEmployee = (id: string) => {
        setProfile(prev => ({
            ...prev,
            employees: prev.employees.filter(emp => emp.id !== id)
        }));
    };

    const handleAutoFillByBin = async () => {
        if (!binInput || binInput.length < 12) {
            setBinError('Введите корректный БИН (12 цифр)');
            return;
        }

        setBinError('');
        setBinSearchStatus('searching');
        try {
            const aiData = await fetchCompanyDataByBin(binInput);

            setProfile(prev => ({
                ...prev,
                companyName: aiData.companyName || prev.companyName,
                about: aiData.about || prev.about,
                details: {
                    ...prev.details,
                    ...(aiData.details || {})
                },
                contacts: {
                    ...prev.contacts,
                    ...(aiData.contacts || {}),
                    phones: aiData.contacts?.phones?.length ? aiData.contacts.phones : (prev.contacts.phones || [])
                },
                websites: aiData.websites && aiData.websites.length > 0 ? aiData.websites : prev.websites,
                socialMedia: aiData.socialMedia && aiData.socialMedia.length > 0 ? aiData.socialMedia : prev.socialMedia,
            }));

            setBinSearchStatus('idle');
            alert('Данные компании и информация с сайта успешно найдены. Проверьте их и нажмите "Сохранить профиль".');
        } catch (error) {
            setBinSearchStatus('error');
            setBinError(error instanceof Error ? error.message : 'Ошибка при поиске');
        }
    };

    const handleSaveProfile = () => {
        setStatus('saving');
        setCompanyProfile(profile);
        setTimeout(() => {
            setStatus('saved');
            setTimeout(() => setStatus('idle'), 2000);
        }, 500);
    };

    const triggerImportInput = () => {
        importFileInputRef.current?.click();
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(fullUserData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `lumetrya_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleFileImportChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const data = JSON.parse(text);
                if (window.confirm('Вы уверены? Импорт заменит все текущие данные в приложении.')) {
                    setAllUserData(data as UserData);
                    alert('Импорт завершен. Данные обновлены.');
                }
            } catch (error) {
                alert(`Ошибка при импорте: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
            }
        };
        reader.readAsText(file);
    };

    const DetailInput: React.FC<{ name: keyof CompanyDetails, label: string }> = ({ name, label }) => (
        <div><label className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</label><input name={name} value={profile.details[name]} onChange={handleDetailChange} className="w-full mt-1 bg-white dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg border dark:border-slate-600 focus:border-cyan-500" /></div>
    );

    return (
        <div className="space-y-6 pb-12 animate-fade-in">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Настройки и профиль</h1>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                    <h2 className="text-xl font-bold dark:text-slate-100">Профиль компании</h2>
                    <div className="flex items-center gap-3">

                        <button onClick={handleSaveProfile} disabled={status !== 'idle'} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg text-sm disabled:bg-slate-400 transition-all shadow-md hover:shadow-lg">
                            {status === 'saving' ? 'Сохранение...' : status === 'saved' ? '✓ Сохранено' : 'Сохранить изменения'}
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    {/* BIN Auto-fill Section */}
                    <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                                <h3 className="text-blue-900 dark:text-blue-200 font-bold flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    Быстрое заполнение по БИН
                                </h3>
                                <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">Lumi найдет данные в реестрах и проанализирует сайт компании для заполнения описания и контактов.</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative flex-grow min-w-[200px]">
                                    <input
                                        type="text"
                                        maxLength={12}
                                        value={binInput}
                                        onChange={(e) => setBinInput(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Введите БИН компании..."
                                        className="w-full p-2.5 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                    {binError && <p className="absolute top-full left-0 text-[10px] text-red-500 font-bold mt-0.5">{binError}</p>}
                                </div>
                                <button
                                    onClick={handleAutoFillByBin}
                                    disabled={binSearchStatus === 'searching'}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {binSearchStatus === 'searching' ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Поиск и анализ...
                                        </>
                                    ) : 'Найти'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-cyan-500 rounded-full"></span>
                                Основные данные
                            </label>
                            <div>
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Публичное название</label>
                                <input
                                    name="companyName"
                                    value={profile.companyName}
                                    onChange={handleGenericChange}
                                    className="w-full mt-1 bg-white dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg border dark:border-slate-600 focus:border-cyan-500"
                                />
                            </div>
                            <DetailInput name="legalName" label="Юридическое название" />
                            <div className="grid grid-cols-2 gap-4">
                                <DetailInput name="tin" label="БИН/ИНН" />
                                <DetailInput name="kpp" label="КПП (если есть)" />
                            </div>
                            <DetailInput name="legalAddress" label="Юридический адрес" />
                        </div>

                        <div className="space-y-4">
                            <label className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                                Банковские реквизиты
                            </label>
                            <DetailInput name="bankName" label="Название банка" />
                            <div className="grid grid-cols-2 gap-4">
                                <DetailInput name="bic" label="БИК" />
                                <DetailInput name="checkingAccount" label="ИИК / Расчетный счет" />
                            </div>
                            <DetailInput name="correspondentAccount" label="Корр. счет (если есть)" />
                            <DetailInput name="ogrn" label="ОГРН (если есть)" />
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 dark:bg-slate-900/30 rounded-2xl border dark:border-slate-700">
                        <label className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6">
                            <span className="w-1.5 h-6 bg-green-500 rounded-full"></span>
                            Контактная информация
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Phones section */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-400 block mb-1">Номера телефонов</label>
                                {(profile.contacts.phones || []).map((phone, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <input
                                            value={phone}
                                            onChange={(e) => handlePhoneChange(idx, e.target.value)}
                                            placeholder="+7 (___) ___-__-__"
                                            className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg border dark:border-slate-600 focus:border-cyan-500"
                                        />
                                        <button onClick={() => handleRemovePhone(idx)} className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">✕</button>
                                    </div>
                                ))}
                                <button onClick={handleAddPhone} className="text-sm text-cyan-600 dark:text-cyan-400 font-bold hover:underline">+ Добавить телефон</button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-slate-400 block mb-1">Email</label>
                                    <input name="email" value={profile.contacts.email} onChange={handleContactChange} className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg border dark:border-slate-600 focus:border-cyan-500" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-slate-400 block mb-1">Фактический адрес</label>
                                    <input name="address" value={profile.contacts.address} onChange={handleContactChange} className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg border dark:border-slate-600 focus:border-cyan-500" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-4 bg-gray-50/50 dark:bg-slate-900/20 rounded-xl border dark:border-slate-700 space-y-2">
                            <h4 className="font-semibold dark:text-slate-200">Веб-сайты</h4>
                            {profile.websites.map((item, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input value={item} onChange={(e) => handleListChange('websites', index, e.target.value)} className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg border dark:border-slate-600" />
                                    <button onClick={() => handleRemoveListItem('websites', index)} className="text-red-500 p-1">✕</button>
                                </div>
                            ))}
                            <button onClick={() => handleAddListItem('websites')} className="text-sm text-cyan-600 dark:text-cyan-400 font-semibold">+ Добавить</button>
                        </div>
                        <div className="p-4 bg-gray-50/50 dark:bg-slate-900/20 rounded-xl border dark:border-slate-700 space-y-2">
                            <h4 className="font-semibold dark:text-slate-200">Социальные сети</h4>
                            {profile.socialMedia.map((item, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input value={item} onChange={(e) => handleListChange('socialMedia', index, e.target.value)} className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg border dark:border-slate-600" />
                                    <button onClick={() => handleRemoveListItem('socialMedia', index)} className="text-red-500 p-1">✕</button>
                                </div>
                            ))}
                            <button onClick={() => handleAddListItem('socialMedia')} className="text-sm text-cyan-600 dark:text-cyan-400 font-semibold">+ Добавить</button>
                        </div>
                    </div>

                    <div className="space-y-4 p-4 bg-gray-50/50 dark:bg-slate-900/20 rounded-xl border dark:border-slate-700">
                        <h3 className="font-bold text-lg dark:text-slate-100">Команда и сотрудники</h3>
                        <div className="space-y-3">
                            {profile.employees.map((emp) => (
                                <div key={emp.id} className="flex items-center gap-2">
                                    <input value={emp.name} onChange={(e) => handleEmployeeChange(emp.id, 'name', e.target.value)} placeholder="Имя Фамилия" className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg border dark:border-slate-600" />
                                    <input value={emp.position} onChange={(e) => handleEmployeeChange(emp.id, 'position', e.target.value)} placeholder="Должность" className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg border dark:border-slate-600" />
                                    <button onClick={() => handleRemoveEmployee(emp.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors">✕</button>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAddEmployee} className="text-sm text-cyan-600 dark:text-cyan-400 font-bold hover:underline">+ Добавить сотрудника</button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-lg font-bold text-slate-800 dark:text-slate-100">О компании</label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Это описание используется ИИ Lumi для понимания контекста вашего бизнеса. Оно автоматически заполняется при анализе сайта компании через поиск по БИН.</p>
                        <textarea
                            name="about"
                            value={profile.about}
                            onChange={handleGenericChange}
                            rows={8}
                            className="w-full mt-1 bg-white dark:bg-slate-700 dark:text-slate-100 p-3 rounded-lg border dark:border-slate-600 focus:border-cyan-500 leading-relaxed text-sm"
                            placeholder="Миссия компании, подробное описание услуг, история..."
                        ></textarea>
                    </div>
                </div>
            </div>

            {/* Data Management */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border dark:border-slate-700">
                <div className="p-6 border-b dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50"><h2 className="text-xl font-bold dark:text-slate-100">Управление данными</h2></div>
                <div className="p-6 space-y-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Локальное резервное копирование</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Экспортируйте все данные (отчеты, КП, настройки) в один JSON файл для переноса или хранения.</p>
                        </div>
                        <div className="flex gap-3 shrink-0">
                            <button onClick={handleExport} className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-2.5 px-6 rounded-lg text-sm border dark:border-slate-600 transition-all">Экспорт</button>
                            <input type="file" ref={importFileInputRef} onChange={handleFileImportChange} className="hidden" accept="application/json" />
                            <button onClick={triggerImportInput} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm shadow-md transition-all">Импорт</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
