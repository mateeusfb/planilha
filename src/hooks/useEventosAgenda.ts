'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  atualizarEvento,
  cancelarEvento,
  criarEvento,
  listarEventos,
  precisaConectar,
  responderConvite,
} from '@/lib/apiFolga';
import { useAgenda } from '@/lib/agenda';
import { useToast } from '@/components/Toast';
import type { AgendaEvento, EntradaEvento, RespostaConvite } from '@/lib/types';

type Janela = { mes: string } | { inicio: string; fim: string };

/**
 * Eventos de uma janela + as mutações que mexem nela.
 *
 * Toda mutação recarrega a janela e a lista curta do Início, para os dois
 * ficarem coerentes sem um estado global de eventos — o Google é a fonte da
 * verdade, então reler é mais simples (e mais correto) do que remendar a lista
 * local.
 */
export function useEventosAgenda(janela: Janela, ativo: boolean) {
  const { recarregarProximos, recarregarConexao } = useAgenda();
  const { toast } = useToast();

  const [eventos, setEventos] = useState<AgendaEvento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  // A janela vem como objeto novo a cada render; a chave é o que de fato muda.
  const chave = JSON.stringify(janela);
  const abortRef = useRef<AbortController | null>(null);

  const carregar = useCallback(async () => {
    if (!ativo) {
      setEventos([]);
      setCarregando(false);
      return;
    }

    // Trocar de mês rápido cancela a busca anterior em vez de empilhar respostas.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setCarregando(true);
    try {
      const { eventos } = await listarEventos(JSON.parse(chave), controller.signal);
      if (!controller.signal.aborted) setEventos(eventos);
    } catch (e) {
      if (controller.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return;
      setEventos([]);
      if (precisaConectar(e)) await recarregarConexao();
      else toast(e instanceof Error ? e.message : 'Não foi possível carregar a agenda.', 'error');
    } finally {
      if (!controller.signal.aborted) setCarregando(false);
    }
  }, [ativo, chave, recarregarConexao, toast]);

  useEffect(() => {
    carregar();
    return () => abortRef.current?.abort();
  }, [carregar]);

  /** Roda a mutação, avisa e deixa janela e Início em dia. */
  const executar = useCallback(
    async (acao: () => Promise<unknown>, sucesso: string) => {
      setOcupado(true);
      try {
        await acao();
        toast(sucesso, 'success');
        await Promise.all([carregar(), recarregarProximos()]);
        return true;
      } catch (e) {
        if (precisaConectar(e)) await recarregarConexao();
        toast(e instanceof Error ? e.message : 'Não foi possível concluir.', 'error');
        return false;
      } finally {
        setOcupado(false);
      }
    },
    [carregar, recarregarConexao, recarregarProximos, toast],
  );

  const salvar = useCallback(
    (entrada: EntradaEvento, id?: string) =>
      executar(
        () => (id ? atualizarEvento(id, entrada) : criarEvento(entrada)),
        id
          ? entrada.notificarConvidados === false
            ? 'Reunião atualizada.'
            : 'Reunião atualizada e convidados avisados.'
          : entrada.convidados?.length && entrada.notificarConvidados !== false
            ? 'Reunião criada e convites enviados.'
            : 'Reunião criada.',
      ),
    [executar],
  );

  const cancelar = useCallback(
    (evento: AgendaEvento) =>
      executar(
        () => cancelarEvento(evento.id),
        evento.convidados.length ? 'Reunião cancelada e convidados avisados.' : 'Reunião cancelada.',
      ),
    [executar],
  );

  const responder = useCallback(
    (evento: AgendaEvento, resposta: RespostaConvite) => {
      const recado: Record<RespostaConvite, string> = {
        accepted: 'Confirmado! O organizador foi avisado.',
        declined: 'Recusado. O organizador foi avisado.',
        tentative: 'Marcado como talvez. O organizador foi avisado.',
      };
      return executar(() => responderConvite(evento.id, resposta), recado[resposta]);
    },
    [executar],
  );

  return { eventos, carregando, ocupado, recarregar: carregar, salvar, cancelar, responder };
}
