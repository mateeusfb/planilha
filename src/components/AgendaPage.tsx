'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react';
import { useAgenda } from '@/lib/agenda';
import { useEventosAgenda } from '@/hooks/useEventosAgenda';
import { agruparPorDia } from '@/lib/google/mapear';
import { diaDoEvento, hoje, somarDias } from '@/lib/google/tempo';
import { getCurrentMonth } from '@/lib/helpers';
import EventoCard from '@/components/agenda/EventoCard';
import EventoModal from '@/components/agenda/EventoModal';
import EstadoDesconectado from '@/components/agenda/EstadoDesconectado';
import DeleteModal from '@/components/DeleteModal';
import { SkeletonDashboard } from '@/components/Skeleton';
import type { AgendaEvento, EntradaEvento } from '@/lib/types';

const DIAS_SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

function rotuloDoMes(ym: string): string {
  const [ano, mes] = ym.split('-').map(Number);
  const nome = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(ano, mes - 1, 1));
  return `${nome[0].toUpperCase()}${nome.slice(1)} de ${ano}`;
}

function rotuloDoDia(dia: string): string {
  const d = new Date(`${dia}T12:00:00Z`);
  const texto = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(d);
  return texto[0].toUpperCase() + texto.slice(1);
}

function mesVizinho(ym: string, passo: number): string {
  const [ano, mes] = ym.split('-').map(Number);
  const total = ano * 12 + (mes - 1) + passo;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** Segunda a domingo cobrindo o mês inteiro — a grade sempre fecha em semanas. */
function gradeDoMes(ym: string): string[] {
  const primeiro = `${ym}-01`;
  const diaDaSemana = new Date(`${primeiro}T00:00:00Z`).getUTCDay(); // 0 = domingo
  const inicio = somarDias(primeiro, diaDaSemana === 0 ? -6 : 1 - diaDaSemana);
  return Array.from({ length: 42 }, (_, i) => somarDias(inicio, i));
}

export default function AgendaPage() {
  const { conexao, carregandoConexao, fuso } = useAgenda();
  const [mes, setMes] = useState(getCurrentMonth());
  const [modo, setModo] = useState<'lista' | 'mes'>('lista');
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<AgendaEvento | null>(null);
  const [aCancelar, setACancelar] = useState<AgendaEvento | null>(null);

  const conectado = !!conexao?.conectado;
  const { eventos, carregando, ocupado, salvar, cancelar, responder } = useEventosAgenda(
    { mes },
    conectado,
  );

  const porDia = useMemo(
    () => agruparPorDia(eventos, e => diaDoEvento(e.inicio, fuso)),
    [eventos, fuso],
  );

  const eventosDoDia = useMemo(() => {
    const mapa = new Map<string, AgendaEvento[]>();
    for (const { dia, eventos } of porDia) mapa.set(dia, eventos);
    return mapa;
  }, [porDia]);

  if (carregandoConexao) return <SkeletonDashboard />;
  if (!conectado) return <EstadoDesconectado conexao={conexao} />;

  const diaDeHoje = hoje(fuso);

  async function handleSalvar(entrada: EntradaEvento, id?: string) {
    const deuCerto = await salvar(entrada, id);
    if (deuCerto) {
      setModalAberto(false);
      setEditando(null);
    }
  }

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMes(mesVizinho(mes, -1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center t-card border t-border cursor-pointer hover:opacity-80"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold t-text px-2 min-w-[150px] text-center">
            {rotuloDoMes(mes)}
          </span>
          <button
            onClick={() => setMes(mesVizinho(mes, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center t-card border t-border cursor-pointer hover:opacity-80"
          >
            <ChevronRight size={16} />
          </button>
          {mes !== getCurrentMonth() && (
            <button
              onClick={() => setMes(getCurrentMonth())}
              className="ml-1 px-2.5 py-1 text-[11px] font-semibold t-text-muted border t-border rounded-lg cursor-pointer hover:opacity-80"
            >
              Hoje
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-0.5 rounded-lg border t-border">
            <button
              onClick={() => setModo('lista')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
                modo === 'lista' ? 't-accent-bg text-white' : 't-text-muted hover:opacity-80'
              }`}
            >
              <List size={13} /> Lista
            </button>
            <button
              onClick={() => setModo('mes')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
                modo === 'mes' ? 't-accent-bg text-white' : 't-text-muted hover:opacity-80'
              }`}
            >
              <CalendarDays size={13} /> Mês
            </button>
          </div>

          <button
            onClick={() => {
              setEditando(null);
              setModalAberto(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 t-accent-bg text-white rounded-lg text-xs font-semibold cursor-pointer hover:opacity-90"
          >
            <Plus size={14} /> Nova reunião
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="t-card border t-border rounded-xl h-16 animate-shimmer" />
          ))}
        </div>
      ) : eventos.length === 0 ? (
        <div className="t-card border t-border rounded-xl p-10 text-center">
          <p className="text-sm t-text-muted">Nenhum compromisso neste mês.</p>
        </div>
      ) : modo === 'lista' ? (
        <div className="space-y-5">
          {porDia.map(({ dia, eventos }) => (
            <div key={dia} id={`dia-${dia}`}>
              <p
                className={`text-xs font-bold mb-2 ${dia === diaDeHoje ? 't-accent' : 't-text-muted'}`}
              >
                {rotuloDoDia(dia)}
                {dia === diaDeHoje && ' · hoje'}
              </p>
              <div className="space-y-2">
                {eventos.map(evento => (
                  <EventoCard
                    key={evento.id}
                    evento={evento}
                    fuso={fuso}
                    ocupado={ocupado}
                    onEditar={e => {
                      setEditando(e);
                      setModalAberto(true);
                    }}
                    onCancelar={setACancelar}
                    onResponder={responder}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="t-card border t-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b t-border-light">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-bold t-text-dim">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {gradeDoMes(mes).map(dia => {
              const doMes = dia.startsWith(mes);
              const doDia = eventosDoDia.get(dia) ?? [];
              return (
                <div
                  key={dia}
                  className="min-h-[86px] border-b border-r t-border-light p-1.5 last:border-r-0"
                  style={{ opacity: doMes ? 1 : 0.35 }}
                >
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold mb-1 ${
                      dia === diaDeHoje ? 't-accent-bg text-white' : 't-text-muted'
                    }`}
                  >
                    {Number(dia.slice(-2))}
                  </span>
                  <div className="space-y-0.5">
                    {doDia.slice(0, 3).map(evento => (
                      <button
                        key={evento.id}
                        onClick={() => {
                          setModo('lista');
                          setTimeout(() => {
                            document.getElementById(`dia-${dia}`)?.scrollIntoView({ behavior: 'smooth' });
                          }, 50);
                        }}
                        className="w-full text-left text-[10px] leading-tight truncate px-1 py-0.5 rounded cursor-pointer hover:opacity-80 t-accent-light t-accent font-semibold"
                      >
                        {evento.titulo}
                      </button>
                    ))}
                    {doDia.length > 3 && (
                      <span className="text-[10px] t-text-dim px-1">+{doDia.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <EventoModal
        isOpen={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setEditando(null);
        }}
        onSalvar={handleSalvar}
        editando={editando}
        fuso={fuso}
        salvando={ocupado}
      />

      <DeleteModal
        isOpen={!!aCancelar}
        onClose={() => setACancelar(null)}
        onConfirm={() => {
          const evento = aCancelar;
          setACancelar(null);
          if (evento) cancelar(evento);
        }}
        message={
          aCancelar?.convidados.length
            ? `Cancelar "${aCancelar.titulo}"? Os convidados serão avisados por e-mail.`
            : `Cancelar "${aCancelar?.titulo}"?`
        }
      />
    </div>
  );
}
