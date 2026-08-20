'use client';

import { supabase } from './supabase';
import type {
  AgendaEvento,
  EntradaEvento,
  RespostaConvite,
  StatusConexaoGoogle,
} from './types';

/**
 * Ponte do cliente com as rotas em `src/app/api/**`.
 *
 * A sessão do Folga vive no localStorage, então cada chamada leva o access
 * token do Supabase no header Authorization — é assim que a rota sabe quem é
 * você. O `getSession()` renova o token sozinho quando está perto de expirar,
 * por isso ele é lido a cada chamada em vez de memoizado.
 */

export class ErroApi extends Error {
  readonly codigo: string;
  constructor(codigo: string, mensagem: string) {
    super(mensagem);
    this.name = 'ErroApi';
    this.codigo = codigo;
  }
}

/** A conexão com o Google caiu ou nunca existiu: a UI mostra tela, não toast. */
export function precisaConectar(e: unknown): boolean {
  return e instanceof ErroApi && (e.codigo === 'GOOGLE_NAO_CONECTADO' || e.codigo === 'GOOGLE_REVOGADO');
}

async function chamarApi<T>(caminho: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new ErroApi('NAO_AUTENTICADO', 'Sua sessão expirou. Entre de novo.');

  const res = await fetch(caminho, {
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
      authorization: `Bearer ${session.access_token}`,
    },
  });

  const corpo = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ErroApi(
      corpo?.erro?.codigo ?? 'ERRO_INTERNO',
      corpo?.erro?.mensagem ?? 'Algo deu errado. Tente de novo.',
    );
  }
  return corpo as T;
}

// ── conexão ─────────────────────────────────────────────────────────────────

export function statusConexao(): Promise<StatusConexaoGoogle> {
  return chamarApi<StatusConexaoGoogle>('/api/google/status');
}

/** Leva o navegador para a tela de consentimento do Google. */
export async function conectarGoogle(): Promise<void> {
  const { urlAutorizacao } = await chamarApi<{ urlAutorizacao: string }>('/api/google/auth');
  window.location.href = urlAutorizacao;
}

export function desconectarGoogle(): Promise<{ ok: boolean }> {
  return chamarApi('/api/google/disconnect', { method: 'POST' });
}

// ── eventos ─────────────────────────────────────────────────────────────────

export function listarEventos(
  janela: { mes: string } | { inicio: string; fim: string },
  signal?: AbortSignal,
): Promise<{ eventos: AgendaEvento[]; fuso: string }> {
  const params = new URLSearchParams(janela as Record<string, string>);
  return chamarApi(`/api/google/events?${params}`, { signal });
}

export async function criarEvento(entrada: EntradaEvento): Promise<AgendaEvento> {
  const { evento } = await chamarApi<{ evento: AgendaEvento }>('/api/google/events', {
    method: 'POST',
    body: JSON.stringify(entrada),
  });
  return evento;
}

export async function atualizarEvento(
  id: string,
  entrada: Partial<EntradaEvento>,
): Promise<AgendaEvento> {
  const { evento } = await chamarApi<{ evento: AgendaEvento }>(
    `/api/google/events/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(entrada) },
  );
  return evento;
}

export function cancelarEvento(id: string, notificar = true): Promise<{ ok: boolean }> {
  return chamarApi(
    `/api/google/events/${encodeURIComponent(id)}?notificar=${notificar}`,
    { method: 'DELETE' },
  );
}

export async function responderConvite(
  id: string,
  resposta: RespostaConvite,
  comentario?: string,
): Promise<AgendaEvento> {
  const { evento } = await chamarApi<{ evento: AgendaEvento }>(
    `/api/google/events/${encodeURIComponent(id)}/rsvp`,
    { method: 'POST', body: JSON.stringify({ resposta, comentario }) },
  );
  return evento;
}
