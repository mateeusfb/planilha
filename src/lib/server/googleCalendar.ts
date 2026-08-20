import 'server-only';
import { accessTokenValido } from './googleContas';
import { ErroApp, traduzirErroGoogle, type CorpoErroGoogle } from '@/lib/google/erros';
import {
  corpoDeAtualizacao,
  corpoDeCriacao,
  corpoDeRsvp,
  mapearEvento,
  mesclarConvidados,
} from '@/lib/google/mapear';
import type { AgendaEvento, EntradaEvento, RespostaConvite } from '@/lib/types';
import type { EventoGoogle, ListaEventosGoogle } from '@/lib/google/tipos';

/**
 * Google Calendar API v3 em `fetch` puro — sem `googleapis`.
 *
 * São seis endpoints; a SDK oficial traria quatro dependências transitivas e
 * dezenas de MB na function serverless para tipar isso.
 */

const BASE = 'https://www.googleapis.com/calendar/v3';
const CALENDARIO = 'primary';
const TIMEOUT_MS = 10_000;
const ESPERAS_MS = [250, 750, 2000];

interface OpcoesChamada extends RequestInit {
  /** Corpo já em objeto — vira JSON e o content-type sai de graça. */
  json?: unknown;
}

async function chamarGoogle<T>(userId: string, caminho: string, opcoes: OpcoesChamada = {}): Promise<T> {
  const { json, ...init } = opcoes;

  for (let tentativa = 0; ; tentativa++) {
    const token = await accessTokenValido(userId);
    let res: Response;

    try {
      res = await fetch(`${BASE}${caminho}`, {
        ...init,
        headers: {
          ...init.headers,
          authorization: `Bearer ${token}`,
          ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
        },
        ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      // Timeout ou queda de rede: mesma política de retry dos 5xx.
      if (tentativa < ESPERAS_MS.length) {
        await esperar(ESPERAS_MS[tentativa]);
        continue;
      }
      console.error('[google] falha de rede:', e instanceof Error ? e.message : e);
      throw new ErroApp('ERRO_GOOGLE');
    }

    if (res.status === 204) return undefined as T;
    if (res.ok) return (await res.json()) as T;

    const corpo = (await res.json().catch(() => null)) as CorpoErroGoogle | null;
    const traducao = traduzirErroGoogle(res.status, corpo);

    if (traducao.repetir && tentativa < ESPERAS_MS.length) {
      const retryAfter = Number(res.headers.get('retry-after'));
      await esperar(retryAfter > 0 ? retryAfter * 1000 : ESPERAS_MS[tentativa]);
      continue;
    }

    console.error(`[google] ${res.status} em ${caminho}:`, corpo?.error?.message ?? '');
    throw new ErroApp(traducao.codigo, traducao.mensagem);
  }
}

function esperar(ms: number) {
  // Jitter para duas requisições paralelas não voltarem juntas no mesmo instante.
  return new Promise(r => setTimeout(r, ms + Math.random() * 200));
}

const rota = (id?: string) =>
  `/calendars/${CALENDARIO}/events${id ? `/${encodeURIComponent(id)}` : ''}`;

// ── leitura ─────────────────────────────────────────────────────────────────

/**
 * `singleEvents=true` é obrigatório: sem ele o Google devolve as regras de
 * recorrência cruas em vez das ocorrências, e a tela fica vazia. E
 * `orderBy=startTime` só é aceito junto com ele.
 */
export async function listarEventos(
  userId: string,
  timeMin: string,
  timeMax: string,
  max = 250,
): Promise<AgendaEvento[]> {
  const eventos: EventoGoogle[] = [];
  let pageToken: string | undefined;

  for (let pagina = 0; pagina < 4; pagina++) {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      showDeleted: 'false',
      maxResults: String(max),
      ...(pageToken ? { pageToken } : {}),
    });

    const pagina_ = await chamarGoogle<ListaEventosGoogle>(userId, `${rota()}?${params}`);
    eventos.push(...(pagina_.items ?? []));
    pageToken = pagina_.nextPageToken;
    if (!pageToken) break;
  }

  return eventos.filter(e => e.status !== 'cancelled').map(mapearEvento);
}

export async function obterEventoCru(userId: string, id: string): Promise<EventoGoogle> {
  return chamarGoogle<EventoGoogle>(userId, rota(id));
}

export async function obterEvento(userId: string, id: string): Promise<AgendaEvento> {
  return mapearEvento(await obterEventoCru(userId, id));
}

// ── escrita ─────────────────────────────────────────────────────────────────

const notificar = (sim?: boolean) => (sim === false ? 'none' : 'all');

/**
 * A criação da sala do Meet é assíncrona: a resposta pode voltar com
 * `status: pending` e sem `hangoutLink`. Uma releitura resolve na prática.
 */
async function completarMeet(userId: string, evento: EventoGoogle): Promise<EventoGoogle> {
  if (evento.hangoutLink || !evento.conferenceData?.createRequest) return evento;
  await esperar(800);
  try {
    return await obterEventoCru(userId, evento.id!);
  } catch {
    return evento; // A UI avisa que o link está sendo gerado.
  }
}

export async function criarEvento(userId: string, entrada: EntradaEvento): Promise<AgendaEvento> {
  const params = new URLSearchParams({
    sendUpdates: notificar(entrada.notificarConvidados),
    // ⚠️ Sem conferenceDataVersion=1 o Google DESCARTA o conferenceData sem
    // erro nenhum: vem 200 e um evento sem Meet.
    conferenceDataVersion: '1',
  });

  const criado = await chamarGoogle<EventoGoogle>(userId, `${rota()}?${params}`, {
    method: 'POST',
    json: corpoDeCriacao(entrada, `folga-${crypto.randomUUID()}`),
  });

  return mapearEvento(entrada.criarMeet ? await completarMeet(userId, criado) : criado);
}

export async function atualizarEvento(
  userId: string,
  id: string,
  entrada: Partial<EntradaEvento>,
): Promise<AgendaEvento> {
  // Ler o evento antes é o que evita dois estragos silenciosos: zerar o RSVP de
  // quem já respondeu (o PATCH substitui a lista inteira) e gerar uma sala do
  // Meet nova numa reunião que já tinha link — o antigo, já enviado aos
  // convidados, morreria.
  const precisaLer = entrada.convidados !== undefined || !!entrada.criarMeet;
  const atual = precisaLer ? await obterEventoCru(userId, id) : null;

  const jaTemMeet = !!(atual?.hangoutLink || atual?.conferenceData?.entryPoints?.length);
  const pedirMeet = !!entrada.criarMeet && !jaTemMeet;

  const corpo = corpoDeAtualizacao(
    { ...entrada, criarMeet: pedirMeet },
    `folga-${crypto.randomUUID()}`,
  );

  if (entrada.convidados !== undefined && atual) {
    corpo.attendees = mesclarConvidados(atual.attendees ?? [], entrada.convidados);
  }

  if (Object.keys(corpo).length === 0) throw new ErroApp('PARAMETROS_INVALIDOS', 'Nada foi alterado.');

  const params = new URLSearchParams({
    sendUpdates: notificar(entrada.notificarConvidados),
    ...(pedirMeet ? { conferenceDataVersion: '1' } : {}),
  });

  const atualizado = await chamarGoogle<EventoGoogle>(userId, `${rota(id)}?${params}`, {
    method: 'PATCH',
    json: corpo,
  });

  return mapearEvento(pedirMeet ? await completarMeet(userId, atualizado) : atualizado);
}

export async function cancelarEvento(userId: string, id: string, avisar = true): Promise<void> {
  const params = new URLSearchParams({ sendUpdates: notificar(avisar) });
  try {
    await chamarGoogle<void>(userId, `${rota(id)}?${params}`, { method: 'DELETE' });
  } catch (e) {
    // Já estava cancelado: para quem pediu o cancelamento, isso é sucesso.
    if (e instanceof ErroApp && e.codigo === 'EVENTO_NAO_ENCONTRADO') return;
    throw e;
  }
}

/**
 * Responder convite = PATCH no evento mudando o próprio `responseStatus`.
 * O passo de ler antes não é opcional: o Google substitui a lista de convidados
 * inteira, então mandar só a si mesmo apagaria todos os outros da reunião.
 */
export async function responderConvite(
  userId: string,
  id: string,
  resposta: RespostaConvite,
  comentario?: string,
  avisar = true,
): Promise<AgendaEvento> {
  const evento = await obterEventoCru(userId, id);

  let corpo: { attendees: unknown[] };
  try {
    corpo = corpoDeRsvp(evento, resposta, comentario);
  } catch {
    throw new ErroApp('NAO_SOU_CONVIDADO');
  }

  const params = new URLSearchParams({ sendUpdates: notificar(avisar) });
  const atualizado = await chamarGoogle<EventoGoogle>(userId, `${rota(id)}?${params}`, {
    method: 'PATCH',
    json: corpo,
  });

  return mapearEvento(atualizado);
}
