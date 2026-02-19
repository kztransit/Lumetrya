import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UserData, CompanyProfile, CompanyDetails, CompanyContacts } from '../types';
import { fetchCompanyDataByBin } from '../services/geminiService';

interface SettingsPageProps {
    fullUserData: UserData;
    setAllUserData: (data: UserData) => void;
    setCompanyProfile: (profile: CompanyProfile) => void;
}

/**
 * Нормализуем профиль под UI, чтобы не падать на undefined
 * + делаем совместимость: если данные пришли из Postgres (phones/email/address на верхнем уровне),
 *   переносим их в contacts.*
 */
const normalizeCompanyProfile = (raw: CompanyProfile | any): CompanyProfile => {
    const base: any = raw ?? {};

    // details
    const details: CompanyDetails = {
        legalName: base.details?.legalName ?? base.legalName ?? '',
        tin: base.details?.tin ?? base.tin ?? '',
        kpp: base.details?.kpp ?? base.kpp ?? '',
        ogrn: base.details?.ogrn ?? base.ogrn ?? '',
        legalAddress: base.details?.legalAddress ?? base.legalAddress ?? '',
        bankName: base.details?.bankName ?? base.bankName ?? '',
        bic: base.details?.bic ?? base.bic ?? '',
        correspondentAccount: base.details?.correspondentAccount ?? base.correspondentAccount ?? '',
        checkingAccount: base.details?.checkingAccount ?? base.checkingAccount ?? '',
    };

    // contacts
    const phonesFromDb: string[] = Array.isArray(base.phones) ? base.phones : [];
    const contactsPhones: string[] = Array.isArray(base.contacts?.phones) ? base.contacts.phones : [];
    const mergedPhones = contactsPhones.length ? contactsPhones : phonesFromDb;

    const contacts: CompanyContacts = {
        email: base.contacts?.email ?? base.email ?? '',
        address: base.contacts?.address ?? base.address ?? '',
        phones: Array.isArray(mergedPhones) ? mergedPhones : [],
    };

    // lists / employees
    const websites: string[] = Array.isArray(base.websites) ? base.websites : [];
    const socialMedia: string[] = Array.isArray(base.socialMedia) ? base.socialMedia : [];
    const employees: any[] = Array.isArray(base.employees) ? base.employees : [];

    // собираем профиль как ожидает UI
    const normalized: any = {
        ...base,
        companyName: base.companyName ?? '',
        about: base.about ?? '',
        aiSystemInstruction: base.aiSystemInstruction ?? '',
        darkModeEnabled: typeof base.darkModeEnabled === 'boolean' ? base.darkModeEnabled : false,
        language: base.language ?? 'ru',
        details,
        contacts,
        websites,
        socialMedia,
        employees,
        // синхронизируем верхний уровень для совместимости с БД
        phones: contacts.phones,
        email: contacts.email,
        address: contacts.address,
    };

    return normalized as CompanyProfile;
};

const SettingsPage: React.FC<SettingsPageProps> = ({ fullUserData, setAllUserData, setCompanyProfile }) => {
    const [profile, setProfile] = useState<CompanyProfile>(() => normalizeCompanyProfile(fullUserData.companyProfile));
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [binSearchStatus, setBinSearchStatus] = useState<'idle' | 'searching' | 'error'>('idle');
    const [binInput, setBinInput] = useState('');
    const [binError, setBinError] = useState('');
    const importFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setProfile(normalizeCompanyProfile(fullUserData.companyProfile));
    }, [fullUserData.companyProfile]);

    const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, details: { ...prev.details, [name]: value } as any }));
    };

    const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => {
            const nextContacts = { ...(prev as any).contacts, [name]: value };
            // синк на верхний уровень (для БД/Prisma)
            const patch: any = { contacts: nextContacts };
            if (name === 'email') patch.email = value;
            if (name === 'address') patch.address = value;
            return { ...(prev as any), ...patch };
        });
    };

    const handlePhoneChange = (index: number, value: string) => {
        setProfile(prev => {
            const prevPhones = Array.isArray((prev as any).contacts?.phones) ? (prev as any).contacts.phones : [];
            const newPhones = [...prevPhones];
            newPhones[index] = value;
            return {
                ...(prev as any),
                contacts: { ...(prev as any).contacts, phones: newPhones },
                phones: newPhones, // синк на верхний уровень
            };
        });
    };

    const handleAddPhone = () => {
        setProfile(prev => {
            const prevPhones = Array.isArray((prev as any).contacts?.phones) ? (prev as any).contacts.phones : [];
            const newPhones = [...prevPhones, ''];
            return {
                ...(prev as any),
                contacts: { ...(prev as any).contacts, phones: newPhones },
                phones: newPhones,
            };
        });
    };

    const handleRemovePhone = (index: number) => {
        setProfile(prev => {
            const prevPhones = Array.isArray((prev as any).contacts?.phones) ? (prev as any).contacts.phones : [];
            const newPhones = prevPhones.filter((_: any, i: number) => i !== index);
            return {
                ...(prev as any),
                contacts: { ...(prev as any).contacts, phones: newPhones },
                phones: newPhones,
            };
        });
    };

    const handleGenericChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value } as any));
    };

    const handleListChange = (listName: 'websites' | 'socialMedia', index: number, value: string) => {
        setProfile(prev => {
            const prevList = Array.isArray((prev as any)[listName]) ? (prev as any)[listName] : [];
            const newList = [...prevList];
            newList[index] = value;
            return { ...(prev as any), [listName]: newList };
        });
    };

    const handleAddListItem = (listName: 'websites' | 'socialMedia') => {
        setProfile(prev => {
            const prevList = Array.isArray((prev as any)[listName]) ? (prev as any)[listName] : [];
            return { ...(prev as any), [listName]: [...prevList, ''] };
        });
    };

    const handleRemoveListItem = (listName: 'websites' | 'socialMedia', index: number) => {
        setProfile(prev => {
            const prevList = Array.isArray((prev as any)[listName]) ? (prev as any)[listName] : [];
            return { ...(prev as any), [listName]: prevList.filter((_: any, i: number) => i !== index) };
        });
    };

    const handleEmployeeChange = (id: string, field: 'name' | 'position', value: string) => {
        setProfile(prev => ({
            ...(prev as any),
            employees: (prev as any).employees.map((emp: any) => (emp.id === id ? { ...emp, [field]: value } : emp)),
        }));
    };

    const handleAddEmployee = () => {
        setProfile(prev => ({
            ...(prev as any),
            employees: [...((prev as any).employees || []), { id: uuidv4(), name: '', position: '' }],
        }));
    };

    const handleRemoveEmployee = (id: string) => {
        setProfile(prev => ({
            ...(prev as any),
            employees: ((prev as any).employees || []).filter((emp: any) => emp.id !== id),
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

            setProfile(prev => {
                const prevNorm: any = normalizeCompanyProfile(prev as any);

                const nextPhones =
                    aiData.contacts?.phones?.length ? aiData.contacts.phones : (prevNorm.contacts.phones || []);

                const nextContacts = {
                    ...prevNorm.contacts,
                    ...(aiData.contacts || {}),
                    phones: nextPhones,
                };

                return {
                    ...prevNorm,
                    companyName: aiData.companyName || prevNorm.companyName,
                    about: aiData.about || prevNorm.about,
                    details: { ...prevNorm.details, ...(aiData.details || {}) },
                    contacts: nextContacts,
                    phones: nextPhones,
                    email: nextContacts.email,
                    address: nextContacts.address,
                    websites: aiData.websites && aiData.websites.length > 0 ? aiData.websites : prevNorm.websites,
                    socialMedia: aiData.socialMedia && aiData.socialMedia.length > 0 ? aiData.socialMedia : prevNorm.socialMedia,
                } as any;
            });

            setBinSearchStatus('idle');
            alert('Данные компании и информация с сайта успешно найдены. Проверьте их и нажмите "Сохранить профиль".');
        } catch (error) {
            setBinSearchStatus('error');
            setBinError(error instanceof Error ? error.message : 'Ошибка при поиске');
        }
    };

    const handleSaveProfile = () => {
        setStatus('saving');

        // Перед сохранением — ещё раз нормализуем и синхронизируем поля для БД
        const normalized = normalizeCompanyProfile(profile as any);

        setCompanyProfile(normalized);

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

    const DetailInput: React.FC<{ name: keyof CompanyDetails; label: string }> = ({ name, label }) => (
        <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</label>
            <input
                name={name as any}
                value={(profile as any).details?.[name] ?? ''}
                onChange={handleDetailChange}
                className="w-full mt-1 bg-white dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg border dark:border-slate-600 focus:border-cyan-500"
            />
        </div>
    );

    return (
        <div className="space-y-6 pb-12 animate-fade-in">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Настройки и профиль</h1>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                    <h2 className="text-xl font-bold dark:text-slate-100">Профиль компании</h2>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSaveProfile}
                            disabled={status !== 'idle'}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg text-sm disabled:bg-slate-400 transition-all shadow-md hover:shadow-lg"
                        >
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
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Быстрое заполнение по БИН
                                </h3>
                                <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                                    Lumi найдет данные в реестрах и проанализирует сайт компании для заполнения описания и контактов.
                                </p>
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
                                            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            Поиск и анализ...
                                        </>
                                    ) : (
                                        'Найти'
                                    )}
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
                                    value={(profile as any).companyName ?? ''}
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
                                {(((profile as any).contacts?.phones ?? []) as string[]).map((phone, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <input
                                            value={phone}
                                            onChange={(e) => handlePhoneChange(idx, e.target.value)}
                                            placeholder="+7 (___) ___-__-__"
                                            className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg border dark:border-slate-600 focus:border-cyan-500"
                                        />
                                        <button
                                            onClick={() => handleRemovePhone(idx)}
                                            className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                <button onClick={handleAddPhone} className="text-sm text-cyan-600 dark:text-cyan-400 font-bold hover:underline">
                                    + Добавить телефон
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-slate-400 block mb-1">Email</label>
                                    <input
                                        name="email"
                                        value={(profile as any).contacts?.email ?? ''}
                                        onChange={handleContactChange}
                                        className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg border dark:border-slate-600 focus:border-cyan-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-slate-400 block mb-1">Фактический адрес</label>
                                    <input
                                        name="address"
                                        value={(profile as any).contacts?.address ?? ''}
                                        onChange={handleContactChange}
                                        className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg border dark:border-slate-600 focus:border-cyan-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-4 bg-gray-50/50 dark:bg-slate-900/20 rounded-xl border dark:border-slate-700 space-y-2">
                            <h4 className="font-semibold dark:text-slate-200">Веб-сайты</h4>
                            {(((profile as any).websites ?? []) as string[]).map((item, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        value={item}
                                        onChange={(e) => handleListChange('websites', index, e.target.value)}
                                        className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg border dark:border-slate-600"
                                    />
                                    <button onClick={() => handleRemoveListItem('websites', index)} className="text-red-500 p-1">
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => handleAddListItem('websites')} className="text-sm text-cyan-600 dark:text-cyan-400 font-semibold">
                                + Добавить
                            </button>
                        </div>

                        <div className="p-4 bg-gray-50/50 dark:bg-slate-900/20 rounded-xl border dark:border-slate-700 space-y-2">
                            <h4 className="font-semibold dark:text-slate-200">Социальные сети</h4>
                            {(((profile as any).socialMedia ?? []) as string[]).map((item, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        value={item}
                                        onChange={(e) => handleListChange('socialMedia', index, e.target.value)}
                                        className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg border dark:border-slate-600"
                                    />
                                    <button onClick={() => handleRemoveListItem('socialMedia', index)} className="text-red-500 p-1">
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => handleAddListItem('socialMedia')} className="text-sm text-cyan-600 dark:text-cyan-400 font-semibold">
                                + Добавить
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4 p-4 bg-gray-50/50 dark:bg-slate-900/20 rounded-xl border dark:border-slate-700">
                        <h3 className="font-bold text-lg dark:text-slate-100">Команда и сотрудники</h3>
                        <div className="space-y-3">
                            {(((profile as any).employees ?? []) as any[]).map((emp) => (
                                <div key={emp.id} className="flex items-center gap-2">
                                    <input
                                        value={emp.name}
                                        onChange={(e) => handleEmployeeChange(emp.id, 'name', e.target.value)}
                                        placeholder="Имя Фамилия"
                                        className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg border dark:border-slate-600"
                                    />
                                    <input
                                        value={emp.position}
                                        onChange={(e) => handleEmployeeChange(emp.id, 'position', e.target.value)}
                                        placeholder="Должность"
                                        className="w-full bg-white dark:bg-slate-700 dark:text-slate-100 p-2 rounded-lg border dark:border-slate-600"
                                    />
                                    <button
                                        onClick={() => handleRemoveEmployee(emp.id)}
                                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAddEmployee} className="text-sm text-cyan-600 dark:text-cyan-400 font-bold hover:underline">
                            + Добавить сотрудника
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-lg font-bold text-slate-800 dark:text-slate-100">О компании</label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Это описание используется ИИ Lumi для понимания контекста вашего бизнеса. Оно автоматически заполняется при анализе сайта компании через поиск по БИН.
                        </p>
                        <textarea
                            name="about"
                            value={(profile as any).about ?? ''}
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
                <div className="p-6 border-b dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
                    <h2 className="text-xl font-bold dark:text-slate-100">Управление данными</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Локальное резервное копирование</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Экспортируйте все данные (отчеты, КП, настройки) в один JSON файл для переноса или хранения.
                            </p>
                        </div>
                        <div className="flex gap-3 shrink-0">
                            <button
                                onClick={handleExport}
                                className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-2.5 px-6 rounded-lg text-sm border dark:border-slate-600 transition-all"
                            >
                                Экспорт
                            </button>
                            <input type="file" ref={importFileInputRef} onChange={handleFileImportChange} className="hidden" accept="application/json" />
                            <button
                                onClick={triggerImportInput}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm shadow-md transition-all"
                            >
                                Импорт
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;