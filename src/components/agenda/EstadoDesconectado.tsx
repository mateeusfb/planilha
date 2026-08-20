'use client';

import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { conectarGoogle } from '@/lib/apiFolga';
import { useToast } from '@/components/Toast';
import type { StatusConexaoGoogle } from '@/lib/types';

/**
 * Tela da Agenda enquanto não há conta conectada — ou quando a conexão caiu
 * (acesso revogado no Google, senha trocada). Os dois casos terminam no mesmo
 * botão, o que muda é o texto.
 */
export default function EstadoDesconectado({ conexao }: { conexao: StatusConexaoGoogle | null }) {
  const { toast } = useToast();
  const [conectando, setConectando] = useState(false);
  const revogada = conexao?.status === 'revogada';

  async function conectar() {
    setConectando(true);
    try {
      await conectarGoogle(); // sai do app: navega para o Google
    } catch (e) {
      setConectando(false);
      toast(e instanceof Error ? e.message : 'Não foi possível conectar.', 'error');
    }
  }

  return (
    <div className="t-card border t-border rounded-xl p-8 md:p-12 text-center max-w-lg mx-auto mt-6 animate-fade-in-up">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: 'var(--accent-light)' }}
      >
        <CalendarDays size={26} className="t-accent" />
      </div>

      <h3 className="text-base font-bold t-text mb-2">
        {revogada ? 'A conexão com o Google expirou' : 'Conecte sua agenda'}
      </h3>

      <p className="text-sm t-text-muted mb-6 leading-relaxed">
        {revogada ? (
          <>
            O acesso a <strong>{conexao?.email}</strong> foi revogado ou perdeu a validade.
            Reconecte para voltar a ver e criar reuniões por aqui.
          </>
        ) : (
          <>
            Ligue sua conta do Google Agenda para ver seus compromissos, responder convites e criar
            reuniões que enviam convite de verdade para os participantes.
          </>
        )}
      </p>

      <button
        onClick={conectar}
        disabled={conectando}
        className="px-5 py-2.5 t-accent-bg text-white rounded-lg text-sm font-semibold cursor-pointer hover:opacity-90 disabled:opacity-50"
      >
        {conectando ? 'Abrindo o Google…' : revogada ? 'Reconectar' : 'Conectar Google Agenda'}
      </button>
    </div>
  );
}
