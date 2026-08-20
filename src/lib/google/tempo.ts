/**
 * Conversões de data/hora entre o Folga e o Google Calendar.
 *
 * Tudo aqui é função pura e testável, e por um bom motivo: o servidor da Vercel
 * roda em UTC, então qualquer conta feita com `new Date()` do servidor erra 3h e
 * joga evento para o dia (ou o mês) errado. As contas de fuso passam por `Intl`,
 * nunca pelo relógio da máquina.
 *
 * Duas regras que valem para o arquivo inteiro:
 *  • Escrita: mandamos `{ dateTime: '2026-08-25T14:00:00', timeZone: '...' }`,
 *    sem offset — o Google resolve fuso e horário de verão.
 *  • Leitura: `timeMin`/`timeMax` são query params e EXIGEM offset.
 */

export const FUSO_PADRAO = 'America/Sao_Paulo';

/** Offset do fuso naquele instante, no formato '-03:00'. */
export function offsetDoFuso(fuso: string, quando: Date): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso,
    timeZoneName: 'longOffset',
  }).formatToParts(quando);
  const nome = partes.find(p => p.type === 'timeZoneName')?.value ?? 'GMT+00:00';
  // 'GMT' puro (UTC) não traz o offset explícito.
  return nome === 'GMT' ? '+00:00' : nome.replace('GMT', '');
}

/** Meio-dia UTC do dia: longe das bordas de horário de verão. */
function meioDia(dia: string): Date {
  return new Date(`${dia}T12:00:00Z`);
}

/** Início do dia no fuso, em RFC3339 com offset. */
export function inicioDoDia(dia: string, fuso: string): string {
  return `${dia}T00:00:00${offsetDoFuso(fuso, meioDia(dia))}`;
}

/** Soma dias a uma data 'YYYY-MM-DD' sem passar pelo fuso local. */
export function somarDias(dia: string, dias: number): string {
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** 'YYYY-MM' → primeiro dia do mês seguinte, 'YYYY-MM-01'. */
export function primeiroDiaDoMesSeguinte(ym: string): string {
  const [ano, mes] = ym.split('-').map(Number);
  return mes === 12
    ? `${ano + 1}-01-01`
    : `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
}

export interface Janela {
  timeMin: string;
  timeMax: string;
}

/** Janela [1º dia 00:00, 1º do mês seguinte 00:00) para um 'YYYY-MM'. */
export function janelaDoMes(ym: string, fuso: string = FUSO_PADRAO): Janela {
  return {
    timeMin: inicioDoDia(`${ym}-01`, fuso),
    timeMax: inicioDoDia(primeiroDiaDoMesSeguinte(ym), fuso),
  };
}

/** Janela de um intervalo de dias, com `fim` inclusivo. */
export function janelaDeIntervalo(
  inicio: string,
  fim: string,
  fuso: string = FUSO_PADRAO,
): Janela {
  return {
    timeMin: inicioDoDia(inicio, fuso),
    timeMax: inicioDoDia(somarDias(fim, 1), fuso),
  };
}

/**
 * 'YYYY-MM-DDTHH:mm' local → o par que o Google espera na escrita.
 * Sem offset e sem 'Z': quem resolve o fuso é o `timeZone`.
 */
export function paraDataHoraGoogle(local: string, fuso: string = FUSO_PADRAO) {
  const completo = local.length === 16 ? `${local}:00` : local;
  return { dateTime: completo, timeZone: fuso };
}

/**
 * Dia inteiro no Google: `end.date` é EXCLUSIVO. Quem chama passa o último dia
 * como o usuário entende (inclusivo) e a conversão acontece aqui.
 */
export function paraDiaInteiroGoogle(data: string, dataFim?: string) {
  return { start: { date: data }, end: { date: somarDias(dataFim ?? data, 1) } };
}

/** O dia ('YYYY-MM-DD') em que o evento cai, no fuso de exibição. */
export function diaDoEvento(iso: string, fuso: string = FUSO_PADRAO): string {
  // Dia inteiro já vem como 'YYYY-MM-DD' — converter passaria pelo fuso à toa.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const p = (t: string) => partes.find(x => x.type === t)?.value ?? '';
  return `${p('year')}-${p('month')}-${p('day')}`;
}

/** 'HH:mm' do evento no fuso de exibição. */
export function horaDoEvento(iso: string, fuso: string = FUSO_PADRAO): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: fuso,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

/** 'YYYY-MM-DDTHH:mm' (o que o <input type="datetime-local"> quer) no fuso. */
export function paraInputLocal(iso: string, fuso: string = FUSO_PADRAO): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return `${iso}T00:00`;
  return `${diaDoEvento(iso, fuso)}T${horaDoEvento(iso, fuso)}`;
}

/** Segunda-feira da semana daquele dia. */
export function inicioDaSemana(dia: string): string {
  const d = new Date(`${dia}T00:00:00Z`);
  const diaDaSemana = d.getUTCDay(); // 0 = domingo
  return somarDias(dia, diaDaSemana === 0 ? -6 : 1 - diaDaSemana);
}

/** Hoje no fuso indicado, como 'YYYY-MM-DD'. */
export function hoje(fuso: string = FUSO_PADRAO): string {
  return diaDoEvento(new Date().toISOString(), fuso);
}

/** Minutos desde a meia-noite agora — posiciona a linha do "agora" na semana. */
export function minutosAgora(fuso: string = FUSO_PADRAO): number {
  const [h, m] = horaDoEvento(new Date().toISOString(), fuso).split(':').map(Number);
  return (h % 24) * 60 + m;
}
