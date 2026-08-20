'use client';

import { useMemo } from 'react';
import { MailOpen } from 'lucide-react';
import { useAgenda } from '@/lib/agenda';
import { useEventosAgenda } from '@/hooks/useEventosAgenda';
import { agruparPorDia, ehConvitePendente } from '@/lib/google/mapear';
import { diaDoEvento, hoje, somarDias } from '@/lib/google/tempo';
import EventoCard from '@/components/agenda/EventoCard';
import EstadoDesconectado from '@/components/agenda/EstadoDesconectado';
import { SkeletonDashboard } from '@/components/Skeleton';

/** Convites olham para a frente: os próximos dois meses bastam. */
const DIAS_A_FRENTE = 60;

function rotuloDoDia(dia: string): string {
  const texto = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${dia}T12:00:00Z`));
  return texto[0].toUpperCase() + texto.slice(1);
}

export default function AgendaConvitesPage() {
  const { conexao, carregandoConexao, fuso } = useAgenda();
  const conectado = !!conexao?.conectado;

  const janela = useMemo(() => {
    const inicio = hoje(fuso);
    return { inicio, fim: somarDias(inicio, DIAS_A_FRENTE) };
  }, [fuso]);

  const { eventos, carregando, ocupado, responder } = useEventosAgenda(janela, conectado);

  const porDia = useMemo(
    () => agruparPorDia(eventos.filter(ehConvitePendente), e => diaDoEvento(e.inicio, fuso)),
    [eventos, fuso],
  );

  if (carregandoConexao) return <SkeletonDashboard />;
  if (!conectado) return <EstadoDesconectado conexao={conexao} />;

  if (carregando) {
    return (
      <div className="space-y-2 animate-fade-in-up">
        {[0, 1].map(i => (
          <div key={i} className="t-card border t-border rounded-xl h-16 animate-shimmer" />
        ))}
      </div>
    );
  }

  if (porDia.length === 0) {
    return (
      <div className="t-card border t-border rounded-xl p-10 text-center max-w-lg mx-auto mt-6 animate-fade-in-up">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
          style={{ background: 'var(--accent-light)' }}
        >
          <MailOpen size={22} className="t-accent" />
        </div>
        <p className="text-sm font-semibold t-text mb-1">Nenhum convite esperando</p>
        <p className="text-xs t-text-muted">
          Convites que chegarem para os próximos {DIAS_A_FRENTE} dias aparecem aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      {porDia.map(({ dia, eventos }) => (
        <div key={dia}>
          <p className="text-xs font-bold t-text-muted mb-2">{rotuloDoDia(dia)}</p>
          <div className="space-y-2">
            {eventos.map(evento => (
              <EventoCard
                key={evento.id}
                evento={evento}
                fuso={fuso}
                ocupado={ocupado}
                onResponder={responder}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
