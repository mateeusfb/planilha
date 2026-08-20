'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Video } from 'lucide-react';
import { montarSemana, rotuloColuna, MINUTOS_NO_DIA } from '@/lib/google/semana';
import { hoje, minutosAgora } from '@/lib/google/tempo';
import type { AgendaEvento, StatusResposta } from '@/lib/types';

/**
 * Grade semanal no formato do Google Agenda: uma coluna por dia, régua de horas
 * à esquerda e cada evento ocupando a altura da própria duração.
 *
 * O posicionamento (colisões, virada de meia-noite, fuso) vem pronto de
 * `montarSemana` — aqui só se desenha.
 */

const ALTURA_HORA = 46; // px
const ALTURA_DIA = ALTURA_HORA * 24;

const CORES: Record<StatusResposta, string> = {
  accepted: '#10b981',
  declined: '#ef4444',
  tentative: '#f59e0b',
  needsAction: '#94a3b8',
};

function corDoEvento(e: AgendaEvento): string {
  if (e.souOrganizador || !e.minhaResposta) return 'var(--accent)';
  return CORES[e.minhaResposta];
}

function horaCurta(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}:${String(m).padStart(2, '0')}`;
}

export default function GradeSemana({
  eventos,
  dias,
  fuso,
  onAbrir,
}: {
  eventos: AgendaEvento[];
  dias: string[];
  fuso: string;
  onAbrir: (evento: AgendaEvento) => void;
}) {
  const { porDia, diaInteiroPorDia, primeiraHora } = useMemo(
    () => montarSemana(eventos, dias, fuso),
    [eventos, dias, fuso],
  );

  const diaDeHoje = hoje(fuso);
  const hojeNaSemana = dias.includes(diaDeHoje);
  const temDiaInteiro = dias.some(d => diaInteiroPorDia[d].length > 0);

  // Linha do "agora", atualizada de minuto em minuto.
  const [agora, setAgora] = useState(() => minutosAgora(fuso));
  useEffect(() => {
    const id = setInterval(() => setAgora(minutosAgora(fuso)), 60_000);
    return () => clearInterval(id);
  }, [fuso]);

  // Abre a grade já no primeiro compromisso, não às 00h.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scroller.current) return;
    const alvo = hojeNaSemana ? Math.min(primeiraHora, Math.floor(agora / 60)) : primeiraHora;
    scroller.current.scrollTop = Math.max(0, (alvo - 1) * ALTURA_HORA);
    // Só ao trocar de semana: rolar a cada minuto tiraria o usuário do lugar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias[0], primeiraHora]);

  return (
    // No celular sete colunas não cabem: a grade inteira rola na horizontal,
    // com o cabeçalho e a faixa de dia inteiro acompanhando as colunas.
    <div className="t-card border t-border rounded-xl overflow-x-auto">
      <div className="min-w-[620px]">
      {/* Cabeçalho dos dias */}
      <div className="flex border-b t-border-light">
        <div className="w-12 flex-shrink-0" />
        {dias.map(dia => {
          const { semana, numero } = rotuloColuna(dia);
          const ehHoje = dia === diaDeHoje;
          return (
            <div key={dia} className="flex-1 min-w-0 py-2 text-center">
              <div className="text-[10px] font-semibold t-text-dim uppercase tracking-wide">
                {semana}
              </div>
              <div
                className={`mx-auto mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                  ehHoje ? 't-accent-bg text-white' : 't-text'
                }`}
              >
                {numero}
              </div>
            </div>
          );
        })}
      </div>

      {/* Faixa de dia inteiro — só existe quando há algo nela */}
      {temDiaInteiro && (
        <div className="flex border-b t-border-light" style={{ background: 'var(--bg-card-hover)' }}>
          <div className="w-12 flex-shrink-0 flex items-start justify-end pr-1.5 pt-1.5">
            <span className="text-[9px] t-text-dim uppercase">dia</span>
          </div>
          {dias.map(dia => (
            <div key={dia} className="flex-1 min-w-0 p-1 space-y-0.5 border-l t-border-light">
              {diaInteiroPorDia[dia].map(e => (
                <button
                  key={e.id}
                  onClick={() => onAbrir(e)}
                  className="w-full text-left text-[10px] leading-tight truncate px-1.5 py-1 rounded cursor-pointer hover:opacity-80 font-semibold text-white"
                  style={{ background: corDoEvento(e) }}
                >
                  {e.titulo}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Grade de horas */}
      <div ref={scroller} className="overflow-y-auto" style={{ maxHeight: '62vh' }}>
        <div className="flex" style={{ height: ALTURA_DIA }}>
          {/* Régua */}
          <div className="w-12 flex-shrink-0 relative">
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className="absolute right-1.5 text-[10px] t-text-dim tabular-nums"
                style={{ top: h * ALTURA_HORA - 6 }}
              >
                {h > 0 ? `${String(h).padStart(2, '0')}:00` : ''}
              </div>
            ))}
          </div>

          {dias.map(dia => (
            <div key={dia} className="flex-1 min-w-0 relative border-l t-border-light">
              {/* Linhas das horas */}
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t t-border-light"
                  style={{ top: h * ALTURA_HORA }}
                />
              ))}

              {/* Linha do agora */}
              {dia === diaDeHoje && (
                <div
                  className="absolute left-0 right-0 z-10 pointer-events-none"
                  style={{ top: (agora / MINUTOS_NO_DIA) * ALTURA_DIA }}
                >
                  <div className="h-px" style={{ background: 'var(--accent)' }} />
                  <div
                    className="w-1.5 h-1.5 rounded-full -mt-[3.5px] -ml-[3px]"
                    style={{ background: 'var(--accent)' }}
                  />
                </div>
              )}

              {/* Eventos */}
              {porDia[dia].map(bloco => {
                const { evento, inicioMin, fimMin, coluna, colunas } = bloco;
                const altura = ((fimMin - inicioMin) / MINUTOS_NO_DIA) * ALTURA_DIA;
                const cor = corDoEvento(evento);
                const recusado = evento.minhaResposta === 'declined';

                return (
                  <button
                    key={`${evento.id}-${dia}`}
                    onClick={() => onAbrir(evento)}
                    title={`${horaCurta(inicioMin)} · ${evento.titulo}`}
                    className="absolute rounded-md px-1.5 py-0.5 text-left overflow-hidden cursor-pointer hover:brightness-95 transition-[filter]"
                    style={{
                      top: (inicioMin / MINUTOS_NO_DIA) * ALTURA_DIA,
                      height: Math.max(altura - 2, 16),
                      left: `calc(${(coluna / colunas) * 100}% + 2px)`,
                      width: `calc(${100 / colunas}% - 4px)`,
                      background: recusado ? 'transparent' : cor,
                      border: `1px solid ${cor}`,
                      color: recusado ? cor : '#fff',
                      borderTopLeftRadius: bloco.continuaAntes ? 0 : undefined,
                      borderTopRightRadius: bloco.continuaAntes ? 0 : undefined,
                      borderBottomLeftRadius: bloco.continuaDepois ? 0 : undefined,
                      borderBottomRightRadius: bloco.continuaDepois ? 0 : undefined,
                    }}
                  >
                    <span
                      className={`block text-[10px] font-semibold leading-tight truncate ${
                        recusado ? 'line-through' : ''
                      }`}
                    >
                      {evento.titulo}
                    </span>
                    {altura > 34 && (
                      <span className="flex items-center gap-1 text-[9px] opacity-90 leading-tight">
                        {horaCurta(inicioMin)}
                        {evento.linkMeet && <Video size={9} />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
