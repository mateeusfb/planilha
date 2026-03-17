'use client';
import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { StoreProvider, useStore } from '@/lib/store';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import PeriodFilter from '@/components/PeriodFilter';
import type { PageId } from '@/lib/types';
import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';
import { Settings, LogOut, Moon, Sun, ChevronDown, Plus } from 'lucide-react';
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

interface Workspace {
  id: string;          // 'personal' ou UUID do workspace
  userId: string;      // userId do dono dos dados
  workspaceId?: string; // UUID do workspace (null = pessoal padrão)
  label: string;
  icon: string;
  isOwn: boolean;
  ownerEmail?: string;
}

function WorkspaceSwitcher({ workspaces, active, onSwitch, onCreateNew }: {
  workspaces: Workspace[];
  active: Workspace;
  onSwitch: (ws: Workspace) => void;
  onCreateNew: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="px-3 py-1.5 border rounded-lg text-xs font-medium t-card t-border cursor-pointer hover:opacity-80 flex items-center gap-1.5">
        <span>{active.icon}</span>
        <span className="max-w-[120px] truncate">{active.label}</span>
        <ChevronDown size={14} className="t-text-dim" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 t-popup border rounded-xl shadow-lg p-2 min-w-56 z-50">
            <div className="text-[0.65rem] font-semibold uppercase tracking-wider t-text-dim px-2 mb-1">Meus espaços</div>
            {workspaces.filter(w => w.isOwn).map(ws => (
              <button key={ws.id} onClick={() => { onSwitch(ws); setOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors mb-0.5 ${
                  active.id === ws.id ? 't-accent-light font-semibold' : 't-text hover:opacity-80'
                }`}>
                <span className="mr-2">{ws.icon}</span>{ws.label}
              </button>
            ))}

            <button onClick={() => { onCreateNew(); setOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors text-blue-600 hover:bg-blue-50 mb-0.5">
              <Plus size={14} className="mr-1" />Novo espaço
            </button>

            {workspaces.some(w => !w.isOwn) && (
              <>
                <div className="text-[0.65rem] font-semibold uppercase tracking-wider t-text-dim px-2 mt-2 mb-1">Compartilhados comigo</div>
                {workspaces.filter(w => !w.isOwn).map(ws => (
                  <button key={ws.id} onClick={() => { onSwitch(ws); setOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors mb-0.5 ${
                      active.id === ws.id ? 't-accent-light font-semibold' : 't-text hover:opacity-80'
                    }`}>
                    <div className="flex items-center gap-2">
                      <span>{ws.icon}</span>
                      <div>
                        <div className="font-medium">{ws.label}</div>
                        <div className="text-[0.7rem] t-text-dim">{ws.ownerEmail}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CreateWorkspaceModal({ isOpen, onClose, onCreate }: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, icon: string) => void;
}) {
  const [name, setName] = useState('');
  const icons = ['📁', '🏢', '💼', '🏠', '🎯', '📊', '💰', '🛒'];
  const [selectedIcon, setSelectedIcon] = useState('📁');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="t-popup rounded-2xl p-7 w-full max-w-md shadow-xl border">
        <h3 className="text-base font-bold mb-4">Criar novo espaço</h3>
        <div className="mb-4">
          <label className="block text-xs font-semibold t-text-muted uppercase tracking-wide mb-1.5">Nome</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Ex: Empresa, Freelance, Casa..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </div>
        <div className="mb-5">
          <label className="block text-xs font-semibold t-text-muted uppercase tracking-wide mb-1.5">Ícone</label>
          <div className="flex gap-2 flex-wrap">
            {icons.map(ic => (
              <button key={ic} onClick={() => setSelectedIcon(ic)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg cursor-pointer border-2 transition-all ${
                  selectedIcon === ic ? 'border-blue-500 bg-blue-50 scale-110' : 'border-slate-200'
                }`}>
                {ic}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 cursor-pointer">Cancelar</button>
          <button onClick={() => { if (name.trim()) { onCreate(name.trim(), selectedIcon); setName(''); } }}
            disabled={!name.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer">
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}

function UserMenu({ user, onSignOut, onGoToSettings, workspaces, activeWorkspace, onSwitchWorkspace, onCreateWorkspace }: {
  user: { email?: string; user_metadata?: { name?: string } } | null;
  onSignOut: () => void;
  onGoToSettings: () => void;
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  onSwitchWorkspace: (ws: Workspace) => void;
  onCreateWorkspace: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative z-[60]">
      <button onClick={() => setOpen(!open)}
        className="w-10 h-10 md:w-8 md:h-8 rounded-full t-accent-bg text-white text-sm md:text-xs font-bold flex items-center justify-center cursor-pointer">
        {user?.user_metadata?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 t-popup border rounded-xl shadow-lg p-3 min-w-48 z-[60]">
            <div className="text-sm font-semibold t-text mb-0.5">{user?.user_metadata?.name || 'Usuário'}</div>
            <div className="text-xs t-text-dim mb-3">{user?.email}</div>
            {/* Workspace switcher mobile */}
            <div className="sm:hidden mb-2 pb-2 border-b t-border">
              <WorkspaceSwitcher
                workspaces={workspaces}
                active={activeWorkspace}
                onSwitch={(ws) => { onSwitchWorkspace(ws); setOpen(false); }}
                onCreateNew={() => { onCreateWorkspace(); setOpen(false); }}
              />
            </div>
            <button onClick={() => { onGoToSettings(); setOpen(false); }}
              className="w-full text-left text-sm t-text hover:opacity-80 px-2 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2">
              <Settings size={16} /> Configurações
            </button>
            <button onClick={() => { onSignOut(); setOpen(false); }}
              className="w-full text-left text-sm text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2 mt-1">
              <LogOut size={16} /> Sair da conta
            </button>
          </div>
        </>
      )}
    </div>
  );
}

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

  // Check if truly new user (no members, no expenses)
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
        {/* Topbar */}
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

        {/* Content */}
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

    // 1. Workspace pessoal padrão
    const personal: Workspace = {
      id: 'personal',
      userId: user.id,
      label: 'Pessoal',
      icon: '🏠',
      isOwn: true,
    };

    // 2. Workspaces próprios criados pelo usuário
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

    // 3. Workspaces compartilhados comigo
    const { data: shared } = await supabase
      .from('shares')
      .select('owner_id, workspace_id')
      .eq('shared_user_id', user.id)
      .eq('accepted', true);

    const sharedWorkspaces: Workspace[] = [];
    if (shared) {
      for (const s of shared) {
        if (s.workspace_id) {
          // Workspace específico compartilhado
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
          // Workspace pessoal compartilhado
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

  // Verificar se há convite pendente no localStorage (vindo da página /convite)
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
