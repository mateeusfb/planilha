'use client';
import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { StoreProvider, useStore } from '@/lib/store';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import PeriodFilter from '@/components/PeriodFilter';
import type { PageId, Workspace } from '@/lib/types';
import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';
import { Moon, Sun } from 'lucide-react';
import Dashboard from '@/components/Dashboard';
import ExpensesPage from '@/components/ExpensesPage';
import AnalysisPage from '@/components/AnalysisPage';
import SummaryPage from '@/components/SummaryPage';
import SettingsPage from '@/components/SettingsPage';
import MemberModal from '@/components/MemberModal';
import DeleteModal from '@/components/DeleteModal';
import AuthPage from '@/components/AuthPage';
import Onboarding from '@/components/Onboarding';
import QuickExpense from '@/components/QuickExpense';
import WorkspaceSwitcher from '@/components/WorkspaceSwitcher';
import CreateWorkspaceModal from '@/components/CreateWorkspaceModal';
import UserMenu from '@/components/UserMenu';
import NotificationBell from '@/components/NotificationBell';
import InvestmentsPage from '@/components/InvestmentsPage';

function AppContent({ workspaces, activeWorkspace, onSwitchWorkspace, onCreateWorkspace }: {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  onSwitchWorkspace: (ws: Workspace) => void;
  onCreateWorkspace: () => void;
}) {
  const { user, signOut } = useAuth();
  const { toggleMode, mode } = useTheme();
  const { state, removeExpense } = useStore();
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('onboarding_done');
  });

  const isNewUser = state.members.filter(m => m.id !== 'all').length === 0 && state.expenses.length === 0;

  function handlePageChange(page: PageId) {
    if (page === activePage) return;
    setTransitioning(true);
    setTimeout(() => {
      setActivePage(page);
      setTransitioning(false);
    }, 150);
  }

  function handleOnboardingComplete() {
    localStorage.setItem('onboarding_done', 'true');
    setShowOnboarding(false);
  }

  const titles: Record<PageId, string> = {
    dashboard: 'Início',
    expenses: 'Lançamentos',
    analysis: 'Análise de Gastos',
    investments: 'Investimentos',
    summary: 'Resumo Mensal',
    settings: 'Configurações',
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activePage={activePage}
        onPageChange={handlePageChange}
        onAddMember={() => { setEditingMemberId(null); setMemberModalOpen(true); }}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="t-topbar border-b px-4 md:px-7 py-3 flex items-center justify-between sticky top-0 z-50">
          <h2 className="text-sm md:text-lg font-bold t-text ml-11 md:ml-0 truncate">{titles[activePage]}</h2>
          <div className="flex items-center gap-1 md:gap-2.5 flex-shrink-0">
            <div className="hidden sm:block">
              <WorkspaceSwitcher
                workspaces={workspaces}
                active={activeWorkspace}
                onSwitch={onSwitchWorkspace}
                onCreateNew={onCreateWorkspace}
              />
            </div>
            <PeriodFilter />
            <button onClick={toggleMode} title={mode === 'light' ? 'Modo escuro' : 'Modo claro'}
              className="w-8 h-8 rounded-full flex items-center justify-center t-card t-border border transition-colors cursor-pointer hover:opacity-80">
              {mode === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <NotificationBell />
            <UserMenu
              user={user}
              onSignOut={signOut}
              onGoToSettings={() => setActivePage('settings')}
              workspaces={workspaces}
              activeWorkspace={activeWorkspace}
              onSwitchWorkspace={onSwitchWorkspace}
              onCreateWorkspace={onCreateWorkspace}
            />
          </div>
        </div>

        <div className="p-3 md:p-6 flex-1 overflow-y-auto">
          {showOnboarding && isNewUser ? (
            <Onboarding
              onComplete={handleOnboardingComplete}
              onAddMember={() => { setEditingMemberId(null); setMemberModalOpen(true); }}
            />
          ) : (
            <div className={`transition-opacity duration-150 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
              {activePage === 'dashboard' && <Dashboard />}
              {activePage === 'expenses' && (
                <ExpensesPage onDeleteRequest={(id) => { setDeleteId(id); setDeleteModalOpen(true); }} />
              )}
              {activePage === 'analysis' && <AnalysisPage />}
              {activePage === 'investments' && <InvestmentsPage />}
              {activePage === 'summary' && <SummaryPage />}
              {activePage === 'settings' && (
                <SettingsPage
                  onAddMember={() => { setEditingMemberId(null); setMemberModalOpen(true); }}
                  onEditMember={(id) => { setEditingMemberId(id); setMemberModalOpen(true); }}
                  workspaces={workspaces}
                  activeWorkspace={activeWorkspace}
                  onWorkspaceDeleted={() => onSwitchWorkspace(workspaces.find(w => w.id === 'personal') || workspaces[0])}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <MemberModal
        isOpen={memberModalOpen}
        onClose={() => { setMemberModalOpen(false); setEditingMemberId(null); }}
        editingMemberId={editingMemberId}
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
      />
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeleteId(null); }}
        onConfirm={() => { if (deleteId) removeExpense(deleteId); setDeleteId(null); setDeleteModalOpen(false); }}
      />
      <QuickExpense />
    </div>
  );
}

function AuthGate() {
  const { user, loading, isRecovery } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [wsLoaded, setWsLoaded] = useState(false);
  const [showCreateWs, setShowCreateWs] = useState(false);

  const loadWorkspaces = useCallback(async () => {
    if (!user) return;

    const personal: Workspace = {
      id: 'personal',
      userId: user.id,
      label: 'Pessoal',
      icon: '🏠',
      isOwn: true,
    };

    const { data: ownWs } = await supabase
      .from('workspaces')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at');

    const ownWorkspaces: Workspace[] = (ownWs || []).map(w => ({
      id: w.id,
      userId: user.id,
      workspaceId: w.id,
      label: w.name,
      icon: w.icon || '📁',
      isOwn: true,
    }));

    const { data: shared } = await supabase
      .from('shares')
      .select('owner_id, workspace_id')
      .eq('shared_user_id', user.id)
      .eq('accepted', true);

    const sharedWorkspaces: Workspace[] = [];
    if (shared) {
      for (const s of shared) {
        if (s.workspace_id) {
          const { data: wsData } = await supabase.from('workspaces').select('*').eq('id', s.workspace_id).single();
          if (wsData) {
            sharedWorkspaces.push({
              id: `shared-${s.workspace_id}`,
              userId: s.owner_id,
              workspaceId: s.workspace_id,
              label: wsData.name,
              icon: wsData.icon || '📁',
              isOwn: false,
              ownerEmail: 'Compartilhado',
            });
          }
        } else {
          sharedWorkspaces.push({
            id: `shared-${s.owner_id}`,
            userId: s.owner_id,
            label: 'Planilha compartilhada',
            icon: '👥',
            isOwn: false,
            ownerEmail: 'Compartilhado',
          });
        }
      }
    }

    const all = [personal, ...ownWorkspaces, ...sharedWorkspaces];
    setWorkspaces(all);
    setActiveWorkspace(prev => {
      if (prev) {
        const stillExists = all.find(w => w.id === prev.id);
        if (stillExists) return stillExists;
      }
      return personal;
    });
    setWsLoaded(true);
  }, [user]);

  useEffect(() => { loadWorkspaces(); }, [loadWorkspaces]);

  async function createWorkspace(name: string, icon: string) {
    if (!user) return;
    await supabase.from('workspaces').insert({ owner_id: user.id, name, icon });
    setShowCreateWs(false);
    await loadWorkspaces();
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="text-slate-400">Carregando...</div>
    </div>;
  }

  if (!user) return <AuthPage />;
  if (isRecovery) return <AuthPage forceMode="reset" />;

  const pendingCode = typeof window !== 'undefined' ? localStorage.getItem('pending_invite_code') : null;
  if (pendingCode) {
    localStorage.removeItem('pending_invite_code');
    window.location.href = `/convite?code=${pendingCode}`;
    return <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="text-slate-400">Redirecionando para o convite...</div>
    </div>;
  }
  if (!wsLoaded || !activeWorkspace) {
    return <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="text-slate-400">Carregando...</div>
    </div>;
  }

  return (
    <>
      <StoreProvider key={activeWorkspace.id} userId={activeWorkspace.userId} workspaceId={activeWorkspace.workspaceId}>
        <AppContent
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          onSwitchWorkspace={setActiveWorkspace}
          onCreateWorkspace={() => setShowCreateWs(true)}
        />
      </StoreProvider>
      <CreateWorkspaceModal
        isOpen={showCreateWs}
        onClose={() => setShowCreateWs(false)}
        onCreate={createWorkspace}
      />
    </>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
