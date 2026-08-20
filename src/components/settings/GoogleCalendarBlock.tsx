'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useAgenda } from '@/lib/agenda';
import { conectarGoogle, desconectarGoogle } from '@/lib/apiFolga';
import { useToast } from '@/components/Toast';

const AVISOS: Record<string, { texto: string; tipo: 'success' | 'error' | 'info' }> = {
  conectado: { texto: 'Google Agenda conectado!', tipo: 'success' },
  cancelado: { texto: 'Conexão cancelada.', tipo: 'info' },
  erro: { texto: 'Não deu para conectar. Tente de novo.', tipo: 'error' },
};

/**
 * Conexão com o Google Agenda, dentro das Configurações.
 *
 * É também onde o callback do OAuth aterrissa: a rota redireciona para
 * /configuracoes?google=… e o efeito abaixo transforma isso em toast, recarrega
 * o status e limpa a URL.
 */
export default function GoogleCalendarBlock() {
  const { conexao, carregandoConexao, recarregarConexao, recarregarProximos } = useAgenda();
  const { toast } = useToast();
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resultado = params.get('google');
    if (!resultado) return;

    const aviso = AVISOS[resultado] ?? AVISOS.erro;
    toast(aviso.texto, aviso.tipo);
    setAberto(true);
    window.history.replaceState(null, '', window.location.pathname);

    if (resultado === 'conectado') {
      recarregarConexao().then(() => recarregarProximos());
    }
  }, [toast, recarregarConexao, recarregarProximos]);

  async function conectar() {
    setOcupado(true);
    try {
      await conectarGoogle(); // navega para o Google
    } catch (e) {
      setOcupado(false);
      toast(e instanceof Error ? e.message : 'Não foi possível conectar.', 'error');
    }
  }

  async function desconectar() {
    setOcupado(true);
    try {
      await desconectarGoogle();
      await recarregarConexao();
      await recarregarProximos();
      toast('Google Agenda desconectado.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível desconectar.', 'error');
    } finally {
      setOcupado(false);
    }
  }

  const conectado = !!conexao?.conectado;
  const revogada = conexao?.status === 'revogada';

  return (
    <div className="t-card rounded-xl border mb-6 overflow-hidden">
      <button
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer hover:opacity-80"
      >
        <h3 className="text-sm font-bold t-text flex items-center gap-2">
          <CalendarDays size={16} className="t-accent" />
          Google Agenda
          {!carregandoConexao && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: conectado ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.15)',
                color: conectado ? '#10b981' : 'var(--text-dim)',
              }}
            >
              {conectado ? 'conectado' : revogada ? 'expirado' : 'desconectado'}
            </span>
          )}
        </h3>
        <ChevronDown
          size={14}
          className="t-text-dim transition-transform"
          style={{ transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {aberto && (
        <div className="px-5 pb-5">
          {conectado ? (
            <>
              <p className="text-xs t-text-muted mb-1">
                Conectado como <strong className="t-text">{conexao?.email}</strong>
              </p>
              {conexao?.conectadaEm && (
                <p className="text-[11px] t-text-dim mb-4">
                  Desde{' '}
                  {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(
                    new Date(conexao.conectadaEm),
                  )}
                </p>
              )}
              <button
                onClick={desconectar}
                disabled={ocupado}
                className="px-4 py-2 border t-border rounded-lg text-sm font-semibold t-text cursor-pointer hover:opacity-80 disabled:opacity-50"
              >
                {ocupado ? 'Desconectando…' : 'Desconectar'}
              </button>
              <p className="text-[11px] t-text-dim mt-3 leading-relaxed">
                Desconectar revoga o acesso do Folga no Google. Seus eventos continuam intactos —
                eles moram no Google Agenda, não aqui.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs t-text-muted mb-4 leading-relaxed">
                {revogada ? (
                  <>
                    O acesso a <strong>{conexao?.email}</strong> perdeu a validade. Reconecte para
                    voltar a usar a Agenda.
                  </>
                ) : (
                  <>
                    Ligue sua conta para ver os compromissos, responder convites e criar reuniões que
                    enviam convite de verdade aos participantes.
                  </>
                )}
              </p>
              <button
                onClick={conectar}
                disabled={ocupado}
                className="px-4 py-2 t-accent-bg text-white rounded-lg text-sm font-semibold cursor-pointer hover:opacity-90 disabled:opacity-50"
              >
                {ocupado ? 'Abrindo o Google…' : revogada ? 'Reconectar' : 'Conectar Google Agenda'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
