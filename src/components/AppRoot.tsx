'use client';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { StoreProvider, useStore } from '@/lib/store';
import { AgendaProvider } from '@/lib/agenda';
import { ThemeProvider, useTheme } from '@/lib/theme';
import type { PageId } from '@/lib/types';
import { areaForPage, pageForPath, pathForPage, titleForPage } from '@/lib/navigation';
import { Sidebar } from '@/components/Sidebar';
import Tabs from '@/components/ui/Tabs';
import { ToastProvider, useToast } from '@/components/Toast';
import { Moon, Sun } from 'lucide-react';
import dynamic from 'next/dynamic';
import { SkeletonDashboard } from '@/components/Skeleton';
import Dashboard from '@/components/Dashboard';
import ExpensesPage from '@/components/ExpensesPage';
import SettingsPage from '@/components/SettingsPage';
import MemberModal from '@/components/MemberModal';
import DeleteModal from '@/components/DeleteModal';
import AuthPage from '@/components/AuthPage';
import Onboarding from '@/components/Onboarding';
import QuickExpense from '@/components/QuickExpense';
import UserMenu from '@/components/UserMenu';
import NotificationBell from '@/components/NotificationBell';
import ProfilePage from '@/components/ProfilePage';

// Páginas pesadas (chart.js, tabelas grandes) carregadas sob demanda — só entram
// no bundle quando o usuário abre a aba correspondente.
const loading = () => <SkeletonDashboard />;
const AnalysisPage = dynamic(() => import('@/components/AnalysisPage'), { loading });
const InvestmentsPage = dynamic(() => import('@/components/InvestmentsPage'), { loading });
const BudgetPage = dynamic(() => import('@/components/BudgetPage'), { loading });
const ClosingPage = dynamic(() => import('@/components/ClosingPage'), { loading });
const AgendaPage = dynamic(() => import('@/components/AgendaPage'), { loading });
const AgendaConvitesPage = dynamic(() => import('@/components/AgendaConvitesPage'), { loading });

function AppContent({ initialPage }: {
  initialPage: PageId;
}) {
  const { user, signOut } = useAuth();
  const { toggleMode, mode } = useTheme();
  const { state, removeExpense } = useStore();
  const { toast } = useToast();
  const [activePage, setActivePage] = useState<PageId>(initialPage);
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

  // Botão voltar/avançar do navegador: a URL já mudou, só reagimos a ela.
  useEffect(() => {
    function onPop() {
      setActivePage(pageForPath(window.location.pathname));
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Canoniza a URL na entrada: "/" vira "/inicio" e um slug inválido
  // ("/financeiro/xpto") assume a URL da aba em que caiu.
  useEffect(() => {
    const canonical = pathForPage(initialPage);
    if (window.location.pathname !== canonical) {
      window.history.replaceState(null, '', canonical + window.location.search);
    }
  }, [initialPage]);

  function handlePageChange(page: PageId) {
    if (page === activePage) return;
    // History API nativa: troca a URL sem disparar navegação do Next, então
    // nenhum provider remonta e nada é recarregado do Supabase.
    window.history.pushState(null, '', pathForPage(page));
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

  const activeArea = areaForPage(activePage);
  const areaTabs = activeArea && activeArea.tabs.length > 1 ? activeArea.tabs : null;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activePage={activePage}
        onPageChange={handlePageChange}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="t-topbar border-b sticky top-0 z-50">
          <div className="px-4 md:px-7 py-3 flex items-center justify-between">
            <h2 className="text-sm md:text-lg font-bold t-text ml-11 md:ml-0 truncate">{titleForPage(activePage)}</h2>
            <div className="flex items-center gap-1 md:gap-2.5 flex-shrink-0">
              <button onClick={toggleMode} title={mode === 'light' ? 'Modo escuro' : 'Modo claro'}
                className="w-8 h-8 rounded-full flex items-center justify-center t-card t-border border transition-colors cursor-pointer hover:opacity-80">
                {mode === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <NotificationBell onNavigate={(page) => handlePageChange(page)} />
              <UserMenu
                user={user}
                onSignOut={signOut}
                onGoToProfile={() => handlePageChange('profile')}
                onGoToSettings={() => handlePageChange('settings')}
              />
            </div>
          </div>

          {areaTabs && (
            <div className="px-2 md:px-5 -mb-px">
              <Tabs
                items={areaTabs.map(t => ({ id: t.page, label: t.label, icon: t.icon }))}
                activeId={activePage}
                onChange={handlePageChange}
              />
            </div>
          )}
        </div>

        <div className="p-3 md:p-6 flex-1 overflow-y-auto">
          {showOnboarding && isNewUser ? (
            <Onboarding
              onComplete={handleOnboardingComplete}
              onAddMember={() => { setEditingMemberId(null); setMemberModalOpen(true); }}
            />
          ) : (
            <div className={`transition-opacity duration-150 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
              {activePage === 'dashboard' && <Dashboard onNavigate={handlePageChange} />}
              {activePage === 'expenses' && (
                <ExpensesPage onDeleteRequest={(id) => { setDeleteId(id); setDeleteModalOpen(true); }} />
              )}
              {activePage === 'analysis' && <AnalysisPage />}
              {activePage === 'investments' && <InvestmentsPage />}
              {activePage === 'budget' && <BudgetPage />}
              {activePage === 'closing' && (
                <ClosingPage onDeleteRequest={(id) => { setDeleteId(id); setDeleteModalOpen(true); }} />
              )}
              {activePage === 'agenda' && <AgendaPage />}
              {activePage === 'agendaConvites' && <AgendaConvitesPage />}
              {activePage === 'profile' && <ProfilePage />}
              {activePage === 'settings' && (
                <SettingsPage
                  onAddMember={() => { setEditingMemberId(null); setMemberModalOpen(true); }}
                  onEditMember={(id) => { setEditingMemberId(id); setMemberModalOpen(true); }}
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
      />
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeleteId(null); }}
        onConfirm={async () => {
          try {
            if (deleteId) await removeExpense(deleteId);
          } catch {
            toast('Erro ao excluir lançamento. Tente novamente.', 'error');
          }
          setDeleteId(null); setDeleteModalOpen(false);
        }}
      />
      <QuickExpense />
    </div>
  );
}

function AuthGate({ initialPage }: { initialPage: PageId }) {
  const { user, loading, isRecovery } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="text-slate-400">Carregando...</div>
    </div>;
  }

  if (!user) return <AuthPage />;
  if (isRecovery) return <AuthPage forceMode="reset" />;

  // AgendaProvider fica POR FORA do StoreProvider de propósito: o store segura
  // o app atrás do skeleton até terminar de carregar, e a agenda depende de uma
  // chamada externa que não pode entrar nesse caminho crítico.
  return (
    <AgendaProvider>
      <StoreProvider userId={user.id}>
        <AppContent initialPage={initialPage} />
      </StoreProvider>
    </AgendaProvider>
  );
}

/**
 * Casca do app logado. Os arquivos em `src/app/**` são só pontos de entrada de URL:
 * cada um resolve a página inicial e monta este componente. A navegação depois disso
 * acontece toda pela History API, sem navegação do Next e sem remontar providers.
 */
export default function AppRoot({ initialPage }: { initialPage: PageId }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AuthGate initialPage={initialPage} />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
