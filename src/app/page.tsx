'use client';
import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { StoreProvider, useStore } from '@/lib/store';
import { fmtMonth, buildMonthList } from '@/lib/helpers';
import type { PageId } from '@/lib/types';
import { Sidebar } from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import ExpensesPage from '@/components/ExpensesPage';
import AnalysisPage from '@/components/AnalysisPage';
import SummaryPage from '@/components/SummaryPage';
import SettingsPage from '@/components/SettingsPage';
import MemberModal from '@/components/MemberModal';
import DeleteModal from '@/components/DeleteModal';
import AuthPage from '@/components/AuthPage';

function AppContent() {
  const { user, signOut } = useAuth();
  const { state, setActiveMonth, removeExpense } = useStore();
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const titles: Record<PageId, string> = {
    dashboard: 'Dashboard',
    expenses: 'Lancamentos',
    analysis: 'Analise de Gastos',
    summary: 'Resumo Mensal',
    settings: 'Configuracoes',
  };

  const months = buildMonthList();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activePage={activePage}
        onPageChange={setActivePage}
        onAddMember={() => { setEditingMemberId(null); setMemberModalOpen(true); }}
      />

      <div className="ml-60 flex-1 flex flex-col">
        {/* Topbar */}
        <div className="bg-white border-b border-slate-200 px-7 py-3.5 flex items-center justify-between sticky top-0 z-50">
          <h2 className="text-lg font-bold">{titles[activePage]}</h2>
          <div className="flex items-center gap-2.5">
            <select
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50 cursor-pointer"
              value={state.activeMonth}
              onChange={(e) => setActiveMonth(e.target.value)}
            >
              {months.map(ym => (
                <option key={ym} value={ym}>{fmtMonth(ym)}</option>
              ))}
            </select>
            <button
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
              onClick={() => setActivePage('expenses')}
            >
              + Lancamento
            </button>
            <div className="relative group">
              <button className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center cursor-pointer">
                {user?.user_metadata?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-3 min-w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="text-sm font-semibold text-slate-700 mb-0.5">{user?.user_metadata?.name || 'Usuario'}</div>
                <div className="text-xs text-slate-400 mb-3">{user?.email}</div>
                <button onClick={signOut}
                  className="w-full text-left text-sm text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors cursor-pointer">
                  Sair da conta
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {activePage === 'dashboard' && <Dashboard />}
          {activePage === 'expenses' && (
            <ExpensesPage onDeleteRequest={(id) => { setDeleteId(id); setDeleteModalOpen(true); }} />
          )}
          {activePage === 'analysis' && <AnalysisPage />}
          {activePage === 'summary' && <SummaryPage />}
          {activePage === 'settings' && (
            <SettingsPage
              onAddMember={() => { setEditingMemberId(null); setMemberModalOpen(true); }}
              onEditMember={(id) => { setEditingMemberId(id); setMemberModalOpen(true); }}
            />
          )}
        </div>
      </div>

      <MemberModal
        isOpen={memberModalOpen}
        onClose={() => { setMemberModalOpen(false); setEditingMemberId(null); }}
        editingMemberId={editingMemberId}
      />
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeleteId(null); }}
        onConfirm={() => { if (deleteId) removeExpense(deleteId); setDeleteId(null); setDeleteModalOpen(false); }}
      />
    </div>
  );
}

function AuthGate() {
  const { user, loading, isRecovery } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="text-slate-400">Carregando...</div>
    </div>;
  }

  if (!user) return <AuthPage />;

  // Show reset password screen even if logged in via recovery link
  if (isRecovery) return <AuthPage forceMode="reset" />;

  return (
    <StoreProvider userId={user.id}>
      <AppContent />
    </StoreProvider>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
