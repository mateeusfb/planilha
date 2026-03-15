'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import AuthPage from '@/components/AuthPage';

function InviteHandler() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const [status, setStatus] = useState<'loading' | 'accepting' | 'accepted' | 'expired' | 'error' | 'already' | 'own'>('loading');
  const [wsName, setWsName] = useState('');

  useEffect(() => {
    if (!user || !code) return;

    async function handleInvite() {
      // Buscar o link de convite pelo código
      const { data: invite, error } = await supabase
        .from('invite_links')
        .select('*')
        .eq('code', code)
        .single();

      if (error || !invite) {
        setStatus('expired');
        return;
      }

      // Verificar se é o próprio dono
      if (invite.owner_id === user!.id) {
        setStatus('own');
        return;
      }

      // Verificar se já foi usado
      if (invite.used_by) {
        if (invite.used_by === user!.id) {
          setStatus('already');
        } else {
          setStatus('expired');
        }
        return;
      }

      // Verificar se expirou
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        setStatus('expired');
        return;
      }

      setStatus('accepting');

      // Buscar nome do workspace se tiver
      if (invite.workspace_id) {
        const { data: ws } = await supabase.from('workspaces').select('name').eq('id', invite.workspace_id).single();
        if (ws) setWsName(ws.name);
      } else {
        setWsName('Planilha pessoal');
      }

      // Criar o share
      const { error: shareError } = await supabase.from('shares').insert({
        owner_id: invite.owner_id,
        shared_email: user!.email,
        shared_user_id: user!.id,
        workspace_id: invite.workspace_id || null,
        accepted: true,
      });

      if (shareError) {
        if (shareError.message.includes('duplicate') || shareError.message.includes('unique')) {
          setStatus('already');
          return;
        }
        setStatus('error');
        return;
      }

      // Marcar link como usado
      await supabase.from('invite_links').update({
        used_by: user!.id,
        used_at: new Date().toISOString(),
      }).eq('id', invite.id);

      setStatus('accepted');
    }

    handleInvite();
  }, [user, code]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-slate-400">Carregando...</div>
      </div>
    );
  }

  // Se não está logado, mostra tela de login/cadastro
  if (!user) {
    return (
      <div>
        <div className="bg-blue-600 text-white text-center py-3 px-4 text-sm font-medium">
          📩 Você recebeu um convite! Faça login ou crie sua conta para aceitar.
        </div>
        <AuthPage />
      </div>
    );
  }

  if (!code) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="t-card rounded-2xl p-8 max-w-md text-center border shadow-xl">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-lg font-bold mb-2">Link inválido</h2>
          <p className="text-sm text-slate-500 mb-4">Este link de convite não é válido.</p>
          <a href="/" className="text-blue-600 text-sm font-semibold hover:underline">Ir para a planilha</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="bg-white rounded-2xl p-8 max-w-md text-center border shadow-xl">
        {status === 'loading' && (
          <>
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <h2 className="text-lg font-bold mb-2">Verificando convite...</h2>
          </>
        )}

        {status === 'accepting' && (
          <>
            <div className="text-4xl mb-4 animate-pulse">🔄</div>
            <h2 className="text-lg font-bold mb-2">Aceitando convite...</h2>
          </>
        )}

        {status === 'accepted' && (
          <>
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-lg font-bold mb-2">Convite aceito!</h2>
            <p className="text-sm text-slate-500 mb-1">Você agora tem acesso a:</p>
            <p className="text-base font-semibold text-blue-600 mb-4">{wsName || 'Planilha compartilhada'}</p>
            <p className="text-xs text-slate-400 mb-5">Selecione o espaço compartilhado no seletor do topo da página.</p>
            <a href="/" className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
              Acessar planilha
            </a>
          </>
        )}

        {status === 'already' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-lg font-bold mb-2">Você já tem acesso!</h2>
            <p className="text-sm text-slate-500 mb-5">Este convite já foi aceito anteriormente.</p>
            <a href="/" className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
              Acessar planilha
            </a>
          </>
        )}

        {status === 'own' && (
          <>
            <div className="text-4xl mb-4">🤔</div>
            <h2 className="text-lg font-bold mb-2">Este é seu próprio convite!</h2>
            <p className="text-sm text-slate-500 mb-5">Você não pode aceitar um convite que você mesmo criou.</p>
            <a href="/" className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
              Voltar para a planilha
            </a>
          </>
        )}

        {status === 'expired' && (
          <>
            <div className="text-4xl mb-4">⏰</div>
            <h2 className="text-lg font-bold mb-2">Convite expirado</h2>
            <p className="text-sm text-slate-500 mb-5">Este link de convite expirou ou já foi utilizado. Peça um novo convite.</p>
            <a href="/" className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
              Ir para a planilha
            </a>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-lg font-bold mb-2">Erro ao aceitar convite</h2>
            <p className="text-sm text-slate-500 mb-5">Algo deu errado. Tente novamente ou peça um novo convite.</p>
            <a href="/" className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
              Ir para a planilha
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConvitePage() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <InviteHandler />
      </AuthProvider>
    </ThemeProvider>
  );
}
