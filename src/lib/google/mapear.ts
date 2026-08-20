import type { AgendaConvidado, AgendaEvento, EntradaEvento, RespostaConvite, StatusResposta } from '@/lib/types';
import type { ConvidadoGoogle, EventoGoogle } from './tipos';
import { FUSO_PADRAO, paraDataHoraGoogle, paraDiaInteiroGoogle, somarDias } from './tempo';

/**
 * Tradução entre o evento do Google e o `AgendaEvento` do app.
 *
 * Funções puras — é aqui que moram os erros caros da integração (apagar os
 * convidados de uma reunião num RSVP, criar evento sem Meet, pintar um dia a
 * mais num evento de dia inteiro), então é aqui que os testes batem.
 */

const RESPOSTAS_VALIDAS: StatusResposta[] = ['accepted', 'declined', 'tentative', 'needsAction'];

function resposta(valor?: string): StatusResposta {
  return RESPOSTAS_VALIDAS.includes(valor as StatusResposta)
    ? (valor as StatusResposta)
    : 'needsAction';
}

function mapearConvidado(c: ConvidadoGoogle): AgendaConvidado {
  return {
    email: c.email ?? '',
    nome: c.displayName,
    opcional: c.optional || undefined,
    organizador: c.organizer || undefined,
    souEu: c.self || undefined,
    resposta: resposta(c.responseStatus),
  };
}

function linkDaConferencia(e: EventoGoogle): string | undefined {
  if (e.hangoutLink) return e.hangoutLink;
  return e.conferenceData?.entryPoints?.find(p => p.entryPointType === 'video')?.uri;
}

export function mapearEvento(e: EventoGoogle): AgendaEvento {
  const diaInteiro = !!e.start?.date;
  const convidados = (e.attendees ?? []).map(mapearConvidado);
  const eu = convidados.find(c => c.souEu);

  return {
    id: e.id ?? '',
    titulo: e.summary?.trim() || '(sem título)',
    descricao: e.description,
    local: e.location,
    diaInteiro,
    inicio: (diaInteiro ? e.start?.date : e.start?.dateTime) ?? '',
    // O `end.date` do Google é exclusivo; o app trabalha com o último dia real.
    fim: diaInteiro
      ? somarDias(e.end?.date ?? e.start?.date ?? '', -1)
      : (e.end?.dateTime ?? ''),
    fuso: e.start?.timeZone,
    linkMeet: linkDaConferencia(e),
    linkGoogle: e.htmlLink,
    organizadorEmail: e.organizer?.email,
    souOrganizador: !!e.organizer?.self || !!e.creator?.self,
    convidados,
    minhaResposta: eu?.resposta,
    recorrente: !!e.recurringEventId,
  };
}

/** Convite que ainda espera resposta sua (e que não é seu próprio evento). */
export function ehConvitePendente(evento: AgendaEvento): boolean {
  return !evento.souOrganizador && evento.minhaResposta === 'needsAction';
}

/** Agrupa por dia, preservando a ordem cronológica que o Google já devolve. */
export function agruparPorDia(
  eventos: AgendaEvento[],
  dia: (e: AgendaEvento) => string,
): { dia: string; eventos: AgendaEvento[] }[] {
  const mapa = new Map<string, AgendaEvento[]>();
  for (const evento of eventos) {
    const chave = dia(evento);
    const lista = mapa.get(chave);
    if (lista) lista.push(evento);
    else mapa.set(chave, [evento]);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, eventos]) => ({ dia, eventos }));
}

// ── Corpos das requisições ──────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CONVIDADOS = 100;

/** Valida a entrada do formulário. Devolve a mensagem do primeiro problema. */
export function validarEntradaEvento(e: EntradaEvento): string | null {
  if (!e.titulo?.trim()) return 'Dê um título para a reunião.';
  if (e.titulo.length > 1024) return 'O título está longo demais.';

  if (e.diaInteiro) {
    if (!e.data) return 'Escolha o dia da reunião.';
    if (e.dataFim && e.dataFim < e.data) return 'O último dia não pode ser antes do primeiro.';
  } else {
    if (!e.inicio || !e.fim) return 'Preencha o horário de início e de fim.';
    if (e.fim <= e.inicio) return 'O fim precisa ser depois do início.';
  }

  const convidados = e.convidados ?? [];
  if (convidados.length > MAX_CONVIDADOS) {
    return `São no máximo ${MAX_CONVIDADOS} convidados por reunião.`;
  }
  const invalido = convidados.find(c => !EMAIL_RE.test(c.email.trim()));
  if (invalido) return `O e-mail "${invalido.email}" não parece válido.`;

  return null;
}

function periodo(e: EntradaEvento) {
  const fuso = e.fuso || FUSO_PADRAO;
  return e.diaInteiro
    ? paraDiaInteiroGoogle(e.data!, e.dataFim)
    : { start: paraDataHoraGoogle(e.inicio!, fuso), end: paraDataHoraGoogle(e.fim!, fuso) };
}

function convidadosGoogle(lista: EntradaEvento['convidados']) {
  return (lista ?? []).map(c => ({
    email: c.email.trim(),
    ...(c.opcional ? { optional: true } : {}),
  }));
}

/**
 * Corpo do POST de criação.
 *
 * `conferenceData` só entra quando o Meet foi pedido — e a rota precisa mandar
 * `conferenceDataVersion=1` na query, senão o Google descarta esse bloco
 * silenciosamente e devolve 200 com um evento sem Meet.
 */
export function corpoDeCriacao(e: EntradaEvento, requestId: string): Record<string, unknown> {
  const { start, end } = periodo(e);
  return {
    summary: e.titulo.trim(),
    ...(e.descricao?.trim() ? { description: e.descricao.trim() } : {}),
    ...(e.local?.trim() ? { location: e.local.trim() } : {}),
    start,
    end,
    ...(e.convidados?.length ? { attendees: convidadosGoogle(e.convidados) } : {}),
    guestsCanInviteOthers: false,
    guestsCanModify: false,
    reminders: { useDefault: true },
    ...(e.criarMeet
      ? {
          conferenceData: {
            createRequest: {
              requestId,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        }
      : {}),
  };
}

/**
 * Corpo do PATCH. Só entra no objeto o que veio — em especial `attendees`, que
 * o Google SUBSTITUI por inteiro: mandar a chave sem querer apagaria a lista.
 */
export function corpoDeAtualizacao(e: Partial<EntradaEvento>, requestId?: string): Record<string, unknown> {
  const corpo: Record<string, unknown> = {};

  if (e.titulo !== undefined) corpo.summary = e.titulo.trim();
  if (e.descricao !== undefined) corpo.description = e.descricao.trim();
  if (e.local !== undefined) corpo.location = e.local.trim();

  const temPeriodo = e.diaInteiro ? !!e.data : !!(e.inicio && e.fim);
  if (temPeriodo) {
    const { start, end } = periodo(e as EntradaEvento);
    corpo.start = start;
    corpo.end = end;
  }

  if (e.convidados !== undefined) corpo.attendees = convidadosGoogle(e.convidados);

  if (e.criarMeet && requestId) {
    corpo.conferenceData = {
      createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } },
    };
  }

  return corpo;
}

/**
 * Junta a lista nova de convidados com a que já está no evento.
 *
 * Duas coisas se perdem num PATCH ingênuo de `attendees`:
 *  • o `responseStatus` de quem já tinha respondido — todo mundo voltaria para
 *    "sem resposta" só porque você mudou o título;
 *  • o organizador, que é um attendee como os outros e some se não for reenviado.
 */
export function mesclarConvidados(
  atuais: ConvidadoGoogle[],
  novos: { email: string; opcional?: boolean }[],
): ConvidadoGoogle[] {
  const porEmail = new Map(
    atuais.filter(c => c.email).map(c => [c.email!.toLowerCase(), c]),
  );

  const lista: ConvidadoGoogle[] = novos.map(n => {
    const email = n.email.trim();
    const anterior = porEmail.get(email.toLowerCase());
    return {
      email,
      ...(anterior?.responseStatus ? { responseStatus: anterior.responseStatus } : {}),
      ...(n.opcional ? { optional: true } : {}),
    };
  });

  const jaListados = new Set(lista.map(c => c.email!.toLowerCase()));
  for (const c of atuais) {
    if (!c.email || jaListados.has(c.email.toLowerCase())) continue;
    // Você e o organizador ficam mesmo sem estarem no formulário.
    if (c.self || c.organizer) {
      lista.push({
        email: c.email,
        ...(c.responseStatus ? { responseStatus: c.responseStatus } : {}),
        ...(c.optional ? { optional: true } : {}),
      });
    }
  }

  return lista;
}

/**
 * Corpo do PATCH de RSVP.
 *
 * Não existe endpoint de "responder convite": responder é dar PATCH no evento
 * mudando o próprio `responseStatus`. E como o Google substitui a lista de
 * convidados inteira, mandar só a si mesmo APAGA todos os outros convidados da
 * reunião. Por isso a lista completa é reenviada, com um campo alterado.
 */
export function corpoDeRsvp(
  evento: EventoGoogle,
  resposta: RespostaConvite,
  comentario?: string,
): { attendees: ConvidadoGoogle[] } {
  const convidados = evento.attendees ?? [];
  if (!convidados.some(c => c.self)) {
    throw new Error('NAO_SOU_CONVIDADO');
  }

  return {
    attendees: convidados.map(c =>
      c.self
        ? {
            email: c.email,
            responseStatus: resposta,
            ...(c.optional ? { optional: true } : {}),
            ...(comentario?.trim() ? { comment: comentario.trim() } : {}),
          }
        : {
            email: c.email,
            responseStatus: c.responseStatus,
            ...(c.optional ? { optional: true } : {}),
          },
    ),
  };
}
