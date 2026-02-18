import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import CommercialProposalsPage from './pages/CommercialProposalsPage';
import ComparePeriodsPage from './pages/ComparePeriodsPage';
import ConversionsPage from './pages/ConversionsPage';
import NetConversionsPage from './pages/NetConversionsPage';
import AdCampaignsPage from './pages/AdCampaignsPage';
import UnitEconomicsPage from './pages/UnitEconomicsPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import PaymentsPage from './pages/PaymentsPage';
import AIAssistantPage from './pages/AIAssistantPage';
import OtherReportsPage from './pages/OtherReportsPage';
import BrandHealthPage from './pages/BrandHealthPage';
import ShewhartChartPage from './pages/ShewhartChartPage';
import CompanyStrategyPage from './pages/CompanyStrategyPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';

import { initialUserData, mockUser } from './services/mockData';
import { User, UserData, Report, CommercialProposal, AdCampaign, Link, StoredFile, CompanyProfile, Payment, OtherReport, KnowledgeItem } from './types';

// ✅ Исправленные импорты
import { healthCheck, fetchUserData, updateUserData } from './services/api';

import Logo from './components/Logo';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
    const [userData, setUserData] = useState<UserData>(initialUserData);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState<boolean>(true);

    // 1. Проверка связи с бэкендом
    useEffect(() => {
        healthCheck()
            .then((data) => console.log('✅ Cloud Run API connected:', data))
            .catch((err) => console.error('❌ API Connection failed:', err));
    }, []);

    // 2. Загрузка данных из PostgreSQL
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoadingData(true);
            try {
                const cloudData = await fetchUserData();
                if (cloudData && Object.keys(cloudData).length > 0) {
                    setUserData(cloudData);
                    console.log("✅ Data loaded from PostgreSQL");
                } else {
                    console.log("ℹ️ No data in DB, using initial template");
                    setUserData(initialUserData);
                }
            } catch (error) {
                console.error("❌ Failed to load data from server:", error);
                setUserData(initialUserData);
            } finally {
                setIsLoadingData(false);
            }
        };
        loadInitialData();
    }, []);

    // 3. Сохранение данных при изменениях
    useEffect(() => {
        if (isLoadingData) return;

        const saveData = async () => {
            try {
                await updateUserData(userData);
            } catch (error) {
                console.error("❌ Cloud Save error:", error);
            }
        };

        const timeoutId = setTimeout(saveData, 1000); // Небольшой дебаунс на 1 секунду
        return () => clearTimeout(timeoutId);
    }, [userData, isLoadingData]);

    // 4. Логика авторизации
    useEffect(() => {
        const rememberedUserJSON = localStorage.getItem('rememberedUser');
        if (rememberedUserJSON) {
            try {
                const rememberedUser = JSON.parse(rememberedUserJSON);
                if (rememberedUser.email === mockUser.email) {
                    const { password, ...userToLogin } = mockUser;
                    setCurrentUser(userToLogin as User);
                }
            } catch (e) {
                localStorage.removeItem('rememberedUser');
            }
        }
    }, []);

    const handleLogin = useCallback((email: string, pass: string, rememberMe: boolean) => {
        if (email === mockUser.email && pass === mockUser.password) {
            const { password, ...userToLogin } = mockUser;
            setCurrentUser(userToLogin as User);
            if (rememberMe) localStorage.setItem('rememberedUser', JSON.stringify(userToLogin));
            return true;
        }
        return false;
    }, []);

    const handleLogout = useCallback(() => {
        setCurrentUser(null);
        localStorage.removeItem('rememberedUser');
    }, []);

    // 5. CRUD функции (без изменений)
    const crudFunctions = useMemo(() => ({
        setReports: (updater: Report[] | ((prevReports: Report[]) => Report[])) => {
            setUserData(prev => ({ ...prev, reports: typeof updater === 'function' ? updater(prev.reports) : updater }));
        },
        addReport: (report: Omit<Report, 'id'>) => {
            setUserData(prev => ({ ...prev, reports: [{ ...report, id: uuidv4() }, ...prev.reports] }));
        },
        updateReport: (updatedReport: Report) => {
            setUserData(prev => ({ ...prev, reports: prev.reports.map(r => r.id === updatedReport.id ? updatedReport : r) }));
        },
        deleteReport: (id: string) => {
            setUserData(prev => ({ ...prev, reports: prev.reports.filter(r => r.id !== id) }));
        },
        addOtherReport: (report: Omit<OtherReport, 'id'>) => {
            setUserData(prev => ({ ...prev, otherReports: [{ ...report, id: uuidv4() }, ...prev.otherReports] }));
        },
        updateOtherReport: (updatedReport: OtherReport) => {
            setUserData(prev => ({ ...prev, otherReports: prev.otherReports.map(r => r.id === updatedReport.id ? updatedReport : r) }));
        },
        deleteOtherReport: (id: string) => {
            setUserData(prev => ({ ...prev, otherReports: prev.otherReports.filter(r => r.id !== id) }));
        },
        setProposals: (updater: CommercialProposal[] | ((prevProposals: CommercialProposal[]) => CommercialProposal[])) => {
            setUserData(prev => ({ ...prev, proposals: typeof updater === 'function' ? updater(prev.proposals) : updater }));
        },
        addProposal: (proposal: Omit<CommercialProposal, 'id'>) => {
            setUserData(prev => ({ ...prev, proposals: [{ ...proposal, id: uuidv4() }, ...prev.proposals] }));
        },
        updateProposal: (updatedProposal: CommercialProposal) => {
            setUserData(prev => ({ ...prev, proposals: prev.proposals.map(p => p.id === updatedProposal.id ? updatedProposal : p) }));
        },
        addMultipleProposals: (proposals: Omit<CommercialProposal, 'id'>[]) => {
            const newProposals = proposals.map(p => ({ ...p, id: uuidv4() }));
            setUserData(prev => ({ ...prev, proposals: [...newProposals, ...prev.proposals] }));
        },
        deleteProposal: (id: string) => {
            setUserData(prev => ({ ...prev, proposals: prev.proposals.filter(p => p.id !== id) }));
        },
        setCampaigns: (updater: AdCampaign[] | ((prevCampaigns: AdCampaign[]) => AdCampaign[])) => {
            setUserData(prev => ({ ...prev, campaigns: typeof updater === 'function' ? updater(prev.campaigns) : updater }));
        },
        addCampaign: (campaign: Omit<AdCampaign, 'id'>) => {
            setUserData(prev => ({ ...prev, campaigns: [{ ...campaign, id: uuidv4() }, ...prev.campaigns] }));
        },
        addMultipleCampaigns: (campaigns: Omit<AdCampaign, 'id'>[]) => {
            const newCampaigns = campaigns.map(c => ({ ...c, id: uuidv4() }));
            setUserData(prev => ({ ...prev, campaigns: [...newCampaigns, ...prev.campaigns] }));
        },
        deleteCampaign: (id: string) => {
            setUserData(prev => ({ ...prev, campaigns: prev.campaigns.filter(c => c.id !== id) }));
        },
        addLink: (link: Omit<Link, 'id'>) => {
            setUserData(prev => ({ ...prev, links: [{ ...link, id: uuidv4() }, ...prev.links] }));
        },
        deleteLink: (id: string) => {
            setUserData(prev => ({ ...prev, links: prev.links.filter(l => l.id !== id) }));
        },
        addFile: async (fileData: Omit<StoredFile, 'id'>) => {
            const newFile = { ...fileData, id: uuidv4() };
            setUserData(prev => ({ ...prev, files: [newFile, ...prev.files] }));
            return newFile;
        },
        deleteFile: (id: string) => {
            setUserData(prev => ({ ...prev, files: prev.files.filter(f => f.id !== id) }));
        },
        addPayment: (payment: Omit<Payment, 'id'>) => {
            setUserData(prev => ({ ...prev, payments: [{ ...payment, id: uuidv4() }, ...prev.payments] }));
        },
        updatePayment: (updatedPayment: Payment) => {
            setUserData(prev => ({ ...prev, payments: prev.payments.map(p => p.id === updatedPayment.id ? updatedPayment : p) }));
        },
        deletePayment: (id: string) => {
            setUserData(prev => ({ ...prev, payments: prev.payments.filter(p => p.id !== id) }));
        },
        setCompanyProfile: (profile: CompanyProfile) => {
            setUserData(prev => ({ ...prev, companyProfile: profile }));
        },
        setAllUserData: (data: UserData) => {
            setUserData(data);
        },
        updateCompanyStrategy: (strategy: string) => {
            setUserData(prev => ({ ...prev, companyStrategy: strategy }));
        },
        addKnowledgeItem: (item: Omit<KnowledgeItem, 'id'>) => {
            setUserData(prev => ({ ...prev, knowledgeBase: [{ ...item, id: uuidv4() }, ...prev.knowledgeBase] }));
        },
        updateKnowledgeItem: (updatedItem: KnowledgeItem) => {
            setUserData(prev => ({ ...prev, knowledgeBase: prev.knowledgeBase.map(i => i.id === updatedItem.id ? updatedItem : i) }));
        },
        deleteKnowledgeItem: (id: string) => {
            setUserData(prev => ({ ...prev, knowledgeBase: prev.knowledgeBase.filter(i => i.id !== id) }));
        },
    }), []);

    if (isLoadingData) return <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-slate-900"><Logo className="mx-auto h-14 w-auto animate-pulse" /></div>;
    if (!currentUser) return <LoginPage onLogin={handleLogin} />;

    return (
        <ErrorBoundary>
            <div className="flex h-screen bg-gray-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200">
                <Sidebar
                    isOpen={isSidebarOpen}
                    setOpen={setSidebarOpen}
                    companyProfile={userData.companyProfile}
                    setCompanyProfile={crudFunctions.setCompanyProfile}
                    onLogout={handleLogout}
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-slate-900 p-4 sm:p-6 lg:p-8 relative">
                        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden fixed top-4 left-4 z-20 p-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-full text-gray-600 dark:text-gray-300 shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <Routes>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<DashboardPage reports={userData.reports} proposals={userData.proposals} />} />
                            <Route path="/ai-assistant" element={<AIAssistantPage userData={userData} addReport={crudFunctions.addReport} addMultipleProposals={crudFunctions.addMultipleProposals} addMultipleCampaigns={crudFunctions.addMultipleCampaigns} addOtherReport={crudFunctions.addOtherReport} updateOtherReport={crudFunctions.updateOtherReport} addProposal={crudFunctions.addProposal} updateProposal={crudFunctions.updateProposal} />} />
                            <Route path="/reports" element={<ReportsPage reports={userData.reports} addReport={crudFunctions.addReport} deleteReport={crudFunctions.deleteReport} updateReport={crudFunctions.updateReport} />} />
                            <Route path="/other-reports" element={<OtherReportsPage reports={userData.otherReports} addReport={crudFunctions.addOtherReport} updateReport={crudFunctions.updateOtherReport} deleteReport={crudFunctions.deleteOtherReport} />} />
                            <Route path="/proposals" element={<CommercialProposalsPage proposals={userData.proposals} addProposal={crudFunctions.addProposal} deleteProposal={crudFunctions.deleteProposal} setProposals={crudFunctions.setProposals} updateProposal={crudFunctions.updateProposal} />} />
                            <Route path="/compare" element={<ComparePeriodsPage reports={userData.reports} />} />
                            <Route path="/shewhart-charts" element={<ShewhartChartPage reports={userData.reports} />} />
                            <Route path="/conversions" element={<ConversionsPage reports={userData.reports} />} />
                            <Route path="/net-conversions" element={<NetConversionsPage reports={userData.reports} updateReport={crudFunctions.updateReport} />} />
                            <Route path="/campaigns" element={<AdCampaignsPage campaigns={userData.campaigns} addCampaign={crudFunctions.addCampaign} deleteCampaign={crudFunctions.deleteCampaign} setCampaigns={crudFunctions.setCampaigns} userData={userData} updateUserData={crudFunctions.setAllUserData} />} />
                            <Route path="/unit-economics" element={<UnitEconomicsPage proposals={userData.proposals} reports={userData.reports} />} />
                            <Route path="/brand-health" element={<BrandHealthPage userData={userData} updateUserData={crudFunctions.setAllUserData} />} />
                            <Route path="/knowledge-base" element={<KnowledgeBasePage knowledgeBase={userData.knowledgeBase} addKnowledgeItem={crudFunctions.addKnowledgeItem} updateKnowledgeItem={crudFunctions.updateKnowledgeItem} deleteKnowledgeItem={crudFunctions.deleteKnowledgeItem} />} />
                            <Route path="/payments" element={<PaymentsPage payments={userData.payments} files={userData.files} addPayment={crudFunctions.addPayment} updatePayment={crudPayment => crudFunctions.updatePayment(crudPayment)} deletePayment={crudFunctions.deletePayment} addFile={crudFunctions.addFile} />} />
                            <Route path="/strategy" element={<CompanyStrategyPage strategy={userData.companyStrategy || ''} updateStrategy={crudFunctions.updateCompanyStrategy} />} />
                            <Route path="/settings" element={<SettingsPage fullUserData={userData} setAllUserData={crudFunctions.setAllUserData} setCompanyProfile={crudFunctions.setCompanyProfile} />} />
                        </Routes>
                    </main>
                </div>
            </div>
        </ErrorBoundary>
    );
};

const AppWithRouter: React.FC = () => (
    <HashRouter>
        <App />
    </HashRouter>
);

export default AppWithRouter;