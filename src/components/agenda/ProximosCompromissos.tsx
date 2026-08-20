'use client';

import { ArrowRight, CalendarDays, MailOpen, Video } from 'lucide-react';
import { useAgenda } from '@/lib/agenda';
import { diaDoEvento, horaDoEvento, hoje, somarDias } from '@/lib/google/tempo';
import type { PageId } from '@/lib/types';

const MAX_VISIVEIS = 4;

/**
 * A Agenda aparecendo no Início. Fica quieto quando não há conta conectada — o
 * convite para conectar mora na área Agenda e nas Configurações, não aqui.
 */
export default function ProximosCompromissos({
  onNavigate,
}: {
  onNavigate?: (page: PageId) => void;
}) {
  const { conexao, proximos, convitesPendentes, fuso } = useAgenda();
  if (!conexao?.conectado) return null;

  const diaDeHoje = hoje(fuso);
  const amanha = somarDias(diaDeHoje, 1);

  const daVez = proximos
    .filter(e => {
      const dia = diaDoEvento(e.inicio, fuso);
      return dia === diaDeHoje || dia === amanha;
    })
    .slice(0, MAX_VISIVEIS);

  if (daVez.length === 0 && convitesPendentes.length === 0) return null;

  return (
    <div className="glass-card rounded-xl p-4 md:p-5 mb-4 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <CalendarDays size={18} className="t-accent" />
          Próximos compromissos
        </h3>
        {onNavigate && (
          <button
            onClick={() => onNavigate('agenda')}
            className="flex items-center gap-1 text-[11px] font-semibold t-text-muted cursor-pointer hover:opacity-70"
          >
            Ver agenda <ArrowRight size={12} />
          </button>
        )}
      </div>

      {convitesPendentes.length > 0 && onNavigate && (
        <button
          onClick={() => onNavigate('agendaConvites')}
          className="w-full flex items-center gap-2 mb-2 px-3 py-2 rounded-lg text-left cursor-pointer hover:opacity-80"
          style={{ background: 'var(--accent-light)' }}
        >
          <MailOpen size={14} className="t-accent flex-shrink-0" />
          <span className="text-xs font-semibold t-accent">
            {convitesPendentes.length === 1
              ? '1 convite esperando sua resposta'
              : `${convitesPendentes.length} convites esperando sua resposta`}
          </span>
        </button>
      )}

      {daVez.length === 0 ? (
        <p className="text-xs t-text-muted">Nada marcado para hoje nem amanhã.</p>
      ) : (
        <div className="space-y-1.5">
          {daVez.map(evento => {
            const dia = diaDoEvento(evento.inicio, fuso);
            return (
              <div key={evento.id} className="flex items-center gap-3 text-xs">
                <span className="t-text-dim whitespace-nowrap w-[92px] flex-shrink-0 font-semibold">
                  {dia === diaDeHoje ? 'Hoje' : 'Amanhã'}
                  {!evento.diaInteiro && ` ${horaDoEvento(evento.inicio, fuso)}`}
                </span>
                <span className="t-text truncate flex-1">{evento.titulo}</span>
                {evento.linkMeet && <Video size={12} className="t-text-dim flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
