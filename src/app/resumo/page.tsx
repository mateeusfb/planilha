'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { StoreProvider } from '@/lib/store';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/Toast';
import { PlanProvider } from '@/lib/plans';
import { supabase } from '@/lib/supabase';
import SummaryPage from '@/components/SummaryPage';

function ResumoContent() {
  const { user, loading } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);

  const loadWorkspace = useCallback(async () => {
    if (!user) return;

    // Ler workspace ativo do localStorage (mesmo que a app principal salva)
    const savedWsId = typeof window !== 'undefined' ? localStorage.getItem('active_workspace_id') : null;

    if (savedWsId && savedWsId !== 'personal') {
      // Verificar se o workspace existe e o usuário tem acesso
      const { data: ws } = await supabase.from('workspaces').select('id, owner_id').eq('id', savedWsId).single();
      if (ws) {
        setUserId(ws.owner_id);
        setWorkspaceId(ws.id);
        setReady(true);
        return;
      }
    }

    // Fallback: workspace pessoal
    setUserId(user.id);
    setWorkspaceId(undefined);
    setReady(true);
  }, [user]);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-400">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-500 mb-2">Sessao expirada.</p>
          <a href="/" className="text-blue-500 underline">Voltar para o app</a>
        </div>
      </div>
    );
  }

  if (!ready || !userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-400">Carregando dados...</div>
      </div>
    );
  }

  return (
    <PlanProvider>
      <StoreProvider userId={userId} workspaceId={workspaceId}>
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          <SummaryPage />
        </div>
      </StoreProvider>
    </PlanProvider>
  );
}

export default function ResumoPage() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ResumoContent />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
