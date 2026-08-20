import type { AgendaEvento } from '@/lib/types';
import { FUSO_PADRAO, diaDoEvento, somarDias } from './tempo';

/**
 * Posicionamento dos eventos na grade da semana.
 *
 * Três problemas moram aqui, e todos são de cálculo puro — por isso ficam fora
 * do componente e são testados:
 *
 *  • um evento pode atravessar a meia-noite e precisa virar um bloco por dia;
 *  • eventos que se sobrepõem têm que dividir a largura da coluna do dia;
 *  • a posição vertical vem do horário NO FUSO DA CONTA, não no do servidor.
 */

export const MINUTOS_NO_DIA = 1440;
/** Bloco mínimo visível: reunião de 5 min ainda precisa dar para clicar. */
const DURACAO_MINIMA = 20;

export interface BlocoSemana {
  evento: AgendaEvento;
  dia: string;
  inicioMin: number;
  fimMin: number;
  /** Coluna dentro do dia quando há sobreposição (0 = primeira). */
  coluna: number;
  /** Quantas colunas o grupo de sobreposição ocupa. */
  colunas: number;
  /** O evento começou antes deste dia / termina depois dele. */
  continuaAntes: boolean;
  continuaDepois: boolean;
}

/** Minutos desde a meia-noite, no fuso indicado. */
export function minutosDoDia(iso: string, fuso: string = FUSO_PADRAO): number {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: fuso,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const valor = (t: string) => Number(partes.find(p => p.type === t)?.value ?? 0);
  // 24:00 aparece em alguns locales para meia-noite; normalizamos para 0.
  return (valor('hour') % 24) * 60 + valor('minute');
}

/** Os sete dias da semana que começa na segunda informada. */
export function diasDaSemana(inicio: string): string[] {
  return Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
}

/**
 * Divide um evento com hora nos pedaços que cabem em cada dia.
 * Evento que termina exatamente à meia-noite não vaza para o dia seguinte.
 */
function segmentosDoEvento(
  evento: AgendaEvento,
  dias: string[],
  fuso: string,
): Omit<BlocoSemana, 'coluna' | 'colunas'>[] {
  const diaInicio = diaDoEvento(evento.inicio, fuso);
  const diaFim = evento.fim ? diaDoEvento(evento.fim, fuso) : diaInicio;
  const minInicio = minutosDoDia(evento.inicio, fuso);
  const minFim = evento.fim ? minutosDoDia(evento.fim, fuso) : minInicio + DURACAO_MINIMA;

  const segmentos: Omit<BlocoSemana, 'coluna' | 'colunas'>[] = [];

  for (const dia of dias) {
    if (dia < diaInicio || dia > diaFim) continue;

    const comeca = dia === diaInicio;
    const termina = dia === diaFim;

    // Termina 00:00 num dia posterior: pertence só ao dia anterior.
    if (termina && !comeca && minFim === 0) continue;

    let inicioMin = comeca ? minInicio : 0;
    let fimMin = termina ? minFim : MINUTOS_NO_DIA;

    if (fimMin - inicioMin < DURACAO_MINIMA) fimMin = inicioMin + DURACAO_MINIMA;
    if (fimMin > MINUTOS_NO_DIA) fimMin = MINUTOS_NO_DIA;
    if (inicioMin > MINUTOS_NO_DIA - DURACAO_MINIMA) inicioMin = MINUTOS_NO_DIA - DURACAO_MINIMA;

    segmentos.push({
      evento,
      dia,
      inicioMin,
      fimMin,
      continuaAntes: !comeca,
      continuaDepois: !termina,
    });
  }

  return segmentos;
}

/**
 * Divide a largura entre eventos que se sobrepõem.
 *
 * Agrupa em blocos que se tocam (direta ou indiretamente) e, dentro de cada
 * grupo, dá a cada evento a primeira coluna livre. É o mesmo comportamento do
 * Google Agenda: dois eventos no mesmo horário viram meia largura cada.
 */
function distribuirColunas(
  segmentos: Omit<BlocoSemana, 'coluna' | 'colunas'>[],
): BlocoSemana[] {
  const ordenados = [...segmentos].sort(
    (a, b) => a.inicioMin - b.inicioMin || b.fimMin - a.fimMin,
  );

  const resultado: BlocoSemana[] = [];
  let grupo: BlocoSemana[] = [];
  let fimDoGrupo = -1;

  const fecharGrupo = () => {
    if (!grupo.length) return;
    const colunas = Math.max(...grupo.map(b => b.coluna)) + 1;
    for (const bloco of grupo) bloco.colunas = colunas;
    resultado.push(...grupo);
    grupo = [];
    fimDoGrupo = -1;
  };

  for (const seg of ordenados) {
    if (seg.inicioMin >= fimDoGrupo) fecharGrupo();

    // Primeira coluna cujo último evento já terminou.
    const ocupadas = new Set(
      grupo.filter(b => b.fimMin > seg.inicioMin).map(b => b.coluna),
    );
    let coluna = 0;
    while (ocupadas.has(coluna)) coluna++;

    grupo.push({ ...seg, coluna, colunas: 1 });
    fimDoGrupo = Math.max(fimDoGrupo, seg.fimMin);
  }

  fecharGrupo();
  return resultado;
}

export interface SemanaMontada {
  /** Blocos com hora, já posicionados, indexados por dia. */
  porDia: Record<string, BlocoSemana[]>;
  /** Eventos de dia inteiro que aparecem na faixa do topo, por dia. */
  diaInteiroPorDia: Record<string, AgendaEvento[]>;
  /** Menor e maior hora com evento — para a grade abrir no lugar certo. */
  primeiraHora: number;
  ultimaHora: number;
}

export function montarSemana(
  eventos: AgendaEvento[],
  dias: string[],
  fuso: string = FUSO_PADRAO,
): SemanaMontada {
  const porDia: Record<string, BlocoSemana[]> = {};
  const diaInteiroPorDia: Record<string, AgendaEvento[]> = {};
  for (const dia of dias) {
    porDia[dia] = [];
    diaInteiroPorDia[dia] = [];
  }

  const comHora: Omit<BlocoSemana, 'coluna' | 'colunas'>[] = [];

  for (const evento of eventos) {
    if (evento.diaInteiro) {
      for (const dia of dias) {
        if (dia >= evento.inicio && dia <= (evento.fim || evento.inicio)) {
          diaInteiroPorDia[dia].push(evento);
        }
      }
      continue;
    }
    comHora.push(...segmentosDoEvento(evento, dias, fuso));
  }

  // Um dia por vez: duas reuniões às 14h em dias diferentes não concorrem
  // por largura, só as que dividem a mesma coluna do calendário.
  for (const dia of dias) {
    porDia[dia] = distribuirColunas(comHora.filter(s => s.dia === dia));
  }

  const inicios = comHora.map(s => s.inicioMin);
  const fins = comHora.map(s => s.fimMin);

  return {
    porDia,
    diaInteiroPorDia,
    primeiraHora: inicios.length ? Math.floor(Math.min(...inicios) / 60) : 8,
    ultimaHora: fins.length ? Math.ceil(Math.max(...fins) / 60) : 18,
  };
}

/** 'Segunda 17' etc. — cabeçalho de cada coluna. */
export function rotuloColuna(dia: string): { semana: string; numero: string } {
  const d = new Date(`${dia}T12:00:00Z`);
  const semana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })
    .format(d)
    .replace('.', '');
  return { semana, numero: dia.slice(-2) };
}

/** '17 – 23 de agosto' ou '31 de ago – 6 de set' quando vira o mês. */
export function rotuloDaSemana(inicio: string): string {
  const fim = somarDias(inicio, 6);
  const mes = (dia: string, formato: 'long' | 'short') =>
    new Intl.DateTimeFormat('pt-BR', { month: formato, timeZone: 'UTC' })
      .format(new Date(`${dia}T12:00:00Z`))
      .replace('.', '');

  const diaDe = (d: string) => String(Number(d.slice(-2)));

  return inicio.slice(0, 7) === fim.slice(0, 7)
    ? `${diaDe(inicio)} – ${diaDe(fim)} de ${mes(inicio, 'long')}`
    : `${diaDe(inicio)} de ${mes(inicio, 'short')} – ${diaDe(fim)} de ${mes(fim, 'short')}`;
}
