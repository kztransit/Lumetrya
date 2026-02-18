
import React from 'react';
import { NavLink } from 'react-router-dom';
import { CompanyProfile } from '../types';
import Logo from './Logo';

const navItems = [
    { to: "/dashboard", label: "Общий отчет", icon: <><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" /></> },
    { to: "/ai-assistant", label: "AI Ассистент", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /> },
    { to: "/reports", label: "Отчеты", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /> },
    { to: "/brand-health", label: "Здоровье бренда", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A11.952 11.952 0 0 1 12 13.5c-2.998 0-5.74 1.1-7.843 2.918m7.843-2.918a11.952 11.952 0 0 0-7.843 2.253" /> },
    { to: "/other-reports", label: "Другие отчеты", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" /> },
    { to: "/proposals", label: "КП", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.092 1.21-.138 2.43-.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7Zm-1.5 0a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" /> },
    { to: "/compare", label: "Сравнить периоды", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /> },
    { to: "/shewhart-charts", label: "Карта Шухарта", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0V3m0 13.5v3m0-3H6m12 0v3m0-3h1.5" /> },
    { to: "/conversions", label: "Конверсии", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52v16.5m-13.5-16.5v16.5m13.5 0c.351.21.701.43 1.05.67m-12 0c.351.21.701.43 1.05.67m6.75-1.282A35.846 35.846 0 0 1 12 20.25a35.846 35.846 0 0 1-6.75-1.282" /> },
    { to: "/net-conversions", label: "Чистые конверсии", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.667 0l3.181-3.183m-4.991-2.492v4.992" /> },
    { to: "/campaigns", label: "Рекламные кампании", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" /> },
    { to: "/unit-economics", label: "Юнит экономика", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125-1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /> },
    { to: "/payments", label: "Управление платежами", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15A2.25 2.25 0 0 0 2.25 6.75v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /> },
    { to: "/knowledge-base", label: "База знаний", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" /> },
    { to: "/settings", label: "Настройки и профиль", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-1.226M10.343 3.94a3.75 3.75 0 0 1-1.04-2.288M9 3.75a3.75 3.75 0 0 0-1.04 2.288M9 3.75c-.344.026-.68.096-1.006.205M16.5 3.75c.344.026.68.096 1.006.205M16.5 3.75a3.75 3.75 0 0 0 1.04-2.288M17.557 3.94c.55.219 1.02.684 1.11 1.226M17.557 3.94a3.75 3.75 0 0 1 1.04 2.288M18 9.75a3.75 3.75 0 0 0-1.04-2.288M18 9.75c-.344.026-.68.096-1.006.205M13.5 9.75c.344.026.68.096 1.006.205M13.5 9.75a3.75 3.75 0 0 0 1.04-2.288M12.443 9.54c.55.219 1.02.684 1.11 1.226M12.443 9.54a3.75 3.75 0 0 1 1.04 2.288M13.5 15.75a3.75 3.75 0 0 0 1.04 2.288M13.5 15.75c.344.026.68.096 1.006.205M10.343 15.94c.55.219 1.02.684 1.11 1.226M10.343 15.94a3.75 3.75 0 0 1-1.04 2.288M9 15.75a3.75 3.75 0 0 0-1.04 2.288M9 15.75c-.344.026-.68.096-1.006.205M4.5 15.75a3.75 3.75 0 0 1-1.04-2.288M4.5 15.75c.344.026.68.096 1.006.205M6.443 15.54c.55.219 1.02.684 1.11 1.226M6.443 15.54a3.75 3.75 0 0 0 1.04 2.288M5.25 9.75a3.75 3.75 0 0 1-1.04-2.288M5.25 9.75c.344.026.68.096 1.006.205M7.657 9.54c.55.219 1.02.684 1.11 1.226M7.657 9.54a3.75 3.75 0 0 0 1.04 2.288M12 3.75a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75h-.008a.75.75 0 0 1-.75-.75v-.008a.75.75 0 0 1 .75-.75h.008Zm0 6a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75h-.008a.75.75 0 0 1-.75-.75v-.008a.75.75 0 0 1 .75-.75h.008Zm0 6a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75h-.008a.75.75 0 0 1-.75-.75v-.008a.75.75 0 0 1 .75-.75h.008Z" /> },
    { to: "/strategy", label: "Стратегия компании", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h10.5m-10.5 3h10.5m-10.5-9h10.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-10.5a2.25 2.25 0 0 1-2.25-2.25V5.25A2.25 2.25 0 0 1 6.75 3h10.5a2.25 2.25 0 0 1 2.25 2.25v.75" /> },
];

interface SidebarProps {
    isOpen: boolean;
    setOpen: (isOpen: boolean) => void;
    companyProfile: CompanyProfile;
    setCompanyProfile: (profile: CompanyProfile) => void;
    onLogout: () => void;
}

// Fixed implementation of the Sidebar component.
const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    setOpen,
    companyProfile,
    setCompanyProfile,
    onLogout,
}) => {
    return (
        <>
            <div
                className={`fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setOpen(false)}
            />
            <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
                <div className="p-6 flex items-center justify-between">
                    <Logo className="h-8 w-auto" />
                    <button onClick={() => setOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => window.innerWidth < 1024 && setOpen(false)}
                            className={({ isActive }) => `flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                {item.icon}
                            </svg>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-200 dark:border-slate-700 space-y-2">


                    <button
                        onClick={onLogout}
                        className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-all"
                    >
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                        </svg>
                        Выйти
                    </button>
                    <div className="text-xs text-center text-slate-400 mt-4">v.1.0.2</div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
