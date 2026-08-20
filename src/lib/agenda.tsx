'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { listarEventos, statusConexao } from './apiFolga';
import { ehConvitePendente } from './google/mapear';
import { FUSO_PADRAO, hoje, somarDias } from './google/tempo';
import type { AgendaEvento, StatusConexaoGoogle } from './types';

/**
 * Estado compartilhado da Agenda: a conexão com o Google e a janela curta de
 * "o que vem por aí", que o Início e o sino de notificações consomem.
 *
 * De propósito NÃO fica dentro do `StoreProvider`: aquele bloqueia o app
 * inteiro atrás do skeleton até terminar de carregar, e a agenda depende de uma
 * chamada externa. Aqui os filhos renderizam na hora e os dados chegam depois.
 *
 * A janela do mês que a tela da Agenda usa é buscada pela própria tela
 * (`useEventosDoMes`), porque muda a cada clique de navegação.
 */

const DIAS_A_FRENTE = 7;

interface AgendaContextType {
  conexao: StatusConexaoGoogle | null;
  carregandoConexao: boolean;
  recarregarConexao: () => Promise<StatusConexaoGoogle | null>;
  proximos: AgendaEvento[];
  convitesPendentes: AgendaEvento[];
  recarregarProximos: () => Promise<void>;
  fuso: string;
}

const AgendaContext = createContext<AgendaContextType | null>(null);

export function AgendaProvider({ children }: { children: ReactNode }) {
  const [conexao, setConexao] = useState<StatusConexaoGoogle | null>(null);
  const [carregandoConexao, setCarregandoConexao] = useState(true);
  const [proximos, setProximos] = useState<AgendaEvento[]>([]);

  const fuso = conexao?.fuso || FUSO_PADRAO;
  const conectado = !!conexao?.conectado;

  const recarregarConexao = useCallback(async () => {
    try {
      const status = await statusConexao();
      setConexao(status);
      return status;
    } catch {
      // Sem conexão de rede ou sessão expirada: a tela mostra o estado vazio.
      setConexao({ conectado: false });
      return null;
    } finally {
      setCarregandoConexao(false);
    }
  }, []);

  const recarregarProximos = useCallback(async () => {
    if (!conectado) {
      setProximos([]);
      return;
    }
    try {
      const inicio = hoje(fuso);
      const { eventos } = await listarEventos({ inicio, fim: somarDias(inicio, DIAS_A_FRENTE) });
      setProximos(eventos);
    } catch {
      setProximos([]);
    }
  }, [conectado, fuso]);

  // Uma checagem de conexão por sessão do app.
  const jaChecou = useRef(false);
  useEffect(() => {
    if (jaChecou.current) return;
    jaChecou.current = true;
    recarregarConexao();
  }, [recarregarConexao]);

  useEffect(() => {
    recarregarProximos();
  }, [recarregarProximos]);

  const convitesPendentes = proximos.filter(ehConvitePendente);

  return (
    <AgendaContext.Provider
      value={{
        conexao,
        carregandoConexao,
        recarregarConexao,
        proximos,
        convitesPendentes,
        recarregarProximos,
        fuso,
      }}
    >
      {children}
    </AgendaContext.Provider>
  );
}

export function useAgenda(): AgendaContextType {
  const ctx = useContext(AgendaContext);
  if (!ctx) throw new Error('useAgenda precisa estar dentro de AgendaProvider');
  return ctx;
}
