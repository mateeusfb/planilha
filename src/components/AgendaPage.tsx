'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Columns3, List, Plus } from 'lucide-react';
import { useAgenda } from '@/lib/agenda';
import { useEventosAgenda } from '@/hooks/useEventosAgenda';
import { agruparPorDia } from '@/lib/google/mapear';
import { diaDoEvento, hoje, inicioDaSemana, somarDias } from '@/lib/google/tempo';
import { diasDaSemana, rotuloDaSemana } from '@/lib/google/semana';
import EventoCard from '@/components/agenda/EventoCard';
import EventoModal from '@/components/agenda/EventoModal';
import EventoDetalheModal from '@/components/agenda/EventoDetalheModal';
import EstadoDesconectado from '@/components/agenda/EstadoDesconectado';
import GradeSemana from '@/components/agenda/GradeSemana';
import DeleteModal from '@/components/DeleteModal';
import { SkeletonDashboard } from '@/components/Skeleton';
import type { AgendaEvento, EntradaEvento } from '@/lib/types';

type Modo = 'lista' | 'semana' | 'mes';

const MODOS: { id: Modo; label: string; icone: typeof List }[] = [
  { id: 'lista', label: 'Lista', icone: List },
  { id: 'semana', label: 'Semana', icone: Columns3 },
  { id: 'mes', label: 'Mês', icone: CalendarDays },
];

const CHAVE_MODO = 'agenda_modo';
const DIAS_SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

function rotuloDoMes(ym: string): string {
  const [ano, mes] = ym.split('-').map(Number);
  const nome = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(ano, mes - 1, 1));
  return `${nome[0].toUpperCase()}${nome.slice(1)} de ${ano}`;
}

function rotuloDoDia(dia: string): string {
  const texto = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${dia}T12:00:00Z`));
  return texto[0].toUpperCase() + texto.slice(1);
}

function mesVizinho(ym: string, passo: number): string {
  const [ano, mes] = ym.split('-').map(Number);
  const total = ano * 12 + (mes - 1) + passo;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** Segunda a domingo cobrindo o mês inteiro — a grade sempre fecha em semanas. */
function gradeDoMes(ym: string): string[] {
  const inicio = inicioDaSemana(`${ym}-01`);
  return Array.from({ length: 42 }, (_, i) => somarDias(inicio, i));
}

export default function AgendaPage() {
  const { conexao, carregandoConexao, fuso } = useAgenda();

  const [modo, setModo] = useState<Modo>('lista');
  // Um único âncora para os três modos: o mês ou a semana saem dele.
  const [ancora, setAncora] = useState(() => hoje());
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<AgendaEvento | null>(null);
  const [detalhe, setDetalhe] = useState<AgendaEvento | null>(null);
  const [aCancelar, setACancelar] = useState<AgendaEvento | null>(null);

  // O modo escolhido vira o padrão da próxima visita.
  useEffect(() => {
    const salvo = localStorage.getItem(CHAVE_MODO) as Modo | null;
    if (salvo && MODOS.some(m => m.id === salvo)) setModo(salvo);
  }, []);

  function trocarModo(novo: Modo) {
    setModo(novo);
    localStorage.setItem(CHAVE_MODO, novo);
  }

  const mes = ancora.slice(0, 7);
  const semanaInicio = inicioDaSemana(ancora);
  const dias = useMemo(() => diasDaSemana(semanaInicio), [semanaInicio]);

  // A semana busca o intervalo exato; lista e mês buscam o mês inteiro.
  const janela = useMemo(
    () => (modo === 'semana' ? { inicio: semanaInicio, fim: dias[6] } : { mes }),
    [modo, semanaInicio, dias, mes],
  );

  const conectado = !!conexao?.conectado;
  const { eventos, carregando, ocupado, salvar, cancelar, responder } = useEventosAgenda(
    janela,
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
  const noPeriodoAtual =
    modo === 'semana' ? dias.includes(diaDeHoje) : mes === diaDeHoje.slice(0, 7);

  function navegar(passo: number) {
    setAncora(atual =>
      modo === 'semana'
        ? somarDias(atual, 7 * passo)
        : `${mesVizinho(atual.slice(0, 7), passo)}-01`,
    );
  }

  async function handleSalvar(entrada: EntradaEvento, id?: string) {
    const deuCerto = await salvar(entrada, id);
    if (deuCerto) {
      setModalAberto(false);
      setEditando(null);
    }
  }

  function abrirEdicao(evento: AgendaEvento) {
    setDetalhe(null);
    setEditando(evento);
    setModalAberto(true);
  }

  function pedirCancelamento(evento: AgendaEvento) {
    setDetalhe(null);
    setACancelar(evento);
  }

  async function responderEFechar(evento: AgendaEvento, resposta: Parameters<typeof responder>[1]) {
    setDetalhe(null);
    await responder(evento, resposta);
  }

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navegar(-1)}
            aria-label={modo === 'semana' ? 'Semana anterior' : 'Mês anterior'}
            className="w-8 h-8 rounded-lg flex items-center justify-center t-card border t-border cursor-pointer hover:opacity-80"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold t-text px-2 min-w-[170px] text-center">
            {modo === 'semana' ? rotuloDaSemana(semanaInicio) : rotuloDoMes(mes)}
          </span>
          <button
            onClick={() => navegar(1)}
            aria-label={modo === 'semana' ? 'Próxima semana' : 'Próximo mês'}
            className="w-8 h-8 rounded-lg flex items-center justify-center t-card border t-border cursor-pointer hover:opacity-80"
          >
            <ChevronRight size={16} />
          </button>
          {!noPeriodoAtual && (
            <button
              onClick={() => setAncora(diaDeHoje)}
              className="ml-1 px-2.5 py-1 text-[11px] font-semibold t-text-muted border t-border rounded-lg cursor-pointer hover:opacity-80"
            >
              Hoje
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-0.5 rounded-lg border t-border">
            {MODOS.map(({ id, label, icone: Icone }) => (
              <button
                key={id}
                onClick={() => trocarModo(id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
                  modo === id ? 't-accent-bg text-white' : 't-text-muted hover:opacity-80'
                }`}
              >
                <Icone size={13} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setEditando(null);
              setModalAberto(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 t-accent-bg text-white rounded-lg text-xs font-semibold cursor-pointer hover:opacity-90"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Nova reunião</span>
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="t-card border t-border rounded-xl h-16 animate-shimmer" />
          ))}
        </div>
      ) : modo === 'semana' ? (
        <GradeSemana eventos={eventos} dias={dias} fuso={fuso} onAbrir={setDetalhe} />
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
                    onEditar={abrirEdicao}
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
                  <button
                    onClick={() => {
                      setAncora(dia);
                      trocarModo('semana');
                    }}
                    title="Abrir a semana deste dia"
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold mb-1 cursor-pointer ${
                      dia === diaDeHoje ? 't-accent-bg text-white' : 't-text-muted hover:opacity-70'
                    }`}
                  >
                    {Number(dia.slice(-2))}
                  </button>
                  <div className="space-y-0.5">
                    {doDia.slice(0, 3).map(evento => (
                      <button
                        key={evento.id}
                        onClick={() => setDetalhe(evento)}
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

      <EventoDetalheModal
        evento={detalhe}
        fuso={fuso}
        ocupado={ocupado}
        onFechar={() => setDetalhe(null)}
        onEditar={abrirEdicao}
        onCancelar={pedirCancelamento}
        onResponder={responderEFechar}
      />

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
