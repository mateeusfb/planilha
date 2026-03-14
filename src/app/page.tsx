'use client';
import { useState } from 'react';
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

function AppContent() {
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

  function handleAddMember() {
    setEditingMemberId(null);
    setMemberModalOpen(true);
  }

  function handleEditMember(id: string) {
    setEditingMemberId(id);
    setMemberModalOpen(true);
  }

  function handleDeleteRequest(id: string) {
    setDeleteId(id);
    setDeleteModalOpen(true);
  }

  function handleConfirmDelete() {
    if (deleteId) {
      removeExpense(deleteId);
    }
    setDeleteId(null);
    setDeleteModalOpen(false);
  }

  function handleOpenAddExpense() {
    setActivePage('expenses');
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activePage={activePage}
        onPageChange={setActivePage}
        onAddMember={handleAddMember}
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
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              onClick={handleOpenAddExpense}
            >
              + Lancamento
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {activePage === 'dashboard' && <Dashboard />}
          {activePage === 'expenses' && (
            <ExpensesPage onDeleteRequest={handleDeleteRequest} />
          )}
          {activePage === 'analysis' && <AnalysisPage />}
          {activePage === 'summary' && <SummaryPage />}
          {activePage === 'settings' && (
            <SettingsPage
              onAddMember={handleAddMember}
              onEditMember={handleEditMember}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <MemberModal
        isOpen={memberModalOpen}
        onClose={() => { setMemberModalOpen(false); setEditingMemberId(null); }}
        editingMemberId={editingMemberId}
      />
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeleteId(null); }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default function Home() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
