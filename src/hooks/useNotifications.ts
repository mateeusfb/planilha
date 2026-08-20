'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { generateTips } from '@/lib/tips';
import { getCurrentMonth } from '@/lib/helpers';
import { useAgenda } from '@/lib/agenda';
import { diaDoEvento, horaDoEvento, hoje } from '@/lib/google/tempo';

export interface AppNotification {
  id: string;
  /** 'agenda' é derivada em memória do Google Calendar — não existe no banco. */
  source: 'assistant' | 'system' | 'agenda';
  type: 'good' | 'info' | 'warn' | 'bad';
  icon: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  month?: string;
  action?: string; // ex: 'go_settings_profile'
}

interface UseNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string, source: AppNotification['source']) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { userId, getExpensesForMonth, getIndividualMembers } = useStore();
  const { conexao, proximos, convitesPendentes, fuso } = useAgenda();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  // As da agenda são só desta sessão: marcá-las como lidas não vai ao banco.
  const [lidasDaAgenda, setLidasDaAgenda] = useState<Set<string>>(new Set());

  const currentMonth = getCurrentMonth();

  // Os seletores mudam de identidade a cada render; guardamos a versão mais recente
  // numa ref para que o efeito abaixo não precise tê-los como dependência.
  const selectorsRef = useRef({ getExpensesForMonth, getIndividualMembers });
  useEffect(() => {
    selectorsRef.current = { getExpensesForMonth, getIndividualMembers };
  });

  // Evita recarregar (e reinserir) as notificações do mesmo escopo mais de uma vez.
  const loadKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const loadKey = `${userId}|${currentMonth}`;
    if (loadKeyRef.current === loadKey) return;
    loadKeyRef.current = loadKey;

    let cancelled = false;
    let completed = false;

    async function loadNotifications() {
      setLoading(true);

      // ── 1. Load personal (assistant) notifications ──
      const { data: existingPersonal } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('month', currentMonth)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      let personalNotifs: AppNotification[] = [];

      if (existingPersonal && existingPersonal.length > 0) {
        personalNotifs = existingPersonal.map(r => {
          const n = rowToNotification(r, 'assistant');
          if (n.title === 'Complete seu perfil') n.action = 'go_settings_profile';
          return n;
        });
      } else {
        // Generate from tips
        const allEntries = selectorsRef.current.getExpensesForMonth(currentMonth, 'all');
        if (allEntries.length > 0) {
          const tips = generateTips(allEntries, 'all', selectorsRef.current.getIndividualMembers, 0);

          // Add monthly info tip at the end
          tips.push({
            type: 'info',
            icon: 'i',
            title: 'Suas dicas são atualizadas 1x por mês',
            text: 'Essas análises são geradas automaticamente a cada novo mês com base nos seus lançamentos. Quer dicas personalizadas mais frequentes? Entre em contato com o suporte.',
          });

          if (tips.length > 0) {
            const rows = tips.map(tip => ({
              user_id: userId,
              workspace_id: null,
              month: currentMonth,
              type: tip.type,
              icon: tip.icon,
              title: tip.title,
              body: tip.text,
              read: false,
            }));

            const { data: inserted } = await supabase
              .from('notifications')
              .insert(rows)
              .select();

            if (!cancelled && inserted) {
              personalNotifs = inserted.map(r => rowToNotification(r, 'assistant'));
            }
          }
        }
      }

      if (cancelled) return;

      // ── 2. Load system announcements ──
      const { data: announcements } = await supabase
        .from('system_announcements')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      const { data: reads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', userId);

      if (cancelled) return;

      const readIds = new Set((reads || []).map(r => r.announcement_id));

      const systemNotifs: AppNotification[] = (announcements || [])
        .filter(a => !a.expires_at || new Date(a.expires_at) > new Date())
        .map(a => ({
          id: a.id as string,
          source: 'system' as const,
          type: (a.type || 'info') as AppNotification['type'],
          icon: (a.icon || 'i') as string,
          title: a.title as string,
          body: a.body as string,
          read: readIds.has(a.id),
          createdAt: a.created_at as string,
        }));

      // ── 3. Check incomplete profile (daily reminder) ──
      const today = new Date().toISOString().slice(0, 10);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('phone, gender, birth_date, city, occupation')
        .eq('user_id', userId)
        .single();

      if (cancelled) return;

      const isProfileComplete = profile && profile.phone && profile.gender && profile.birth_date;

      if (!isProfileComplete) {
        // Check if we already sent a reminder today
        const alreadySent = personalNotifs.some(n => n.title === 'Complete seu perfil' && n.createdAt?.startsWith(today));

        if (!alreadySent) {
          const reminderRow = {
            user_id: userId,
            workspace_id: null,
            month: currentMonth,
            type: 'info',
            icon: 'i',
            title: 'Complete seu perfil',
            body: 'Preencha seu telefone, gênero e data de nascimento para uma experiência personalizada. Toque aqui para ir às Configurações.',
            read: false,
          };
          const { data: reminderInserted } = await supabase
            .from('notifications')
            .insert(reminderRow)
            .select()
            .single();

          if (!cancelled && reminderInserted) {
            const notif = rowToNotification(reminderInserted, 'assistant');
            notif.action = 'go_settings_profile';
            personalNotifs = [notif, ...personalNotifs];
          }
        }
      }

      // ── 4. Merge: system first, then personal ──
      const all = [...systemNotifs, ...personalNotifs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotifications(all);
      setLoading(false);
      completed = true;
    }

    loadNotifications();
    return () => {
      cancelled = true;
      // Se abortou no meio, libera a chave para que uma nova montagem recarregue.
      if (!completed) loadKeyRef.current = null;
    };
  }, [userId, currentMonth]);

  const markAsRead = useCallback(async (id: string, source: AppNotification['source']) => {
    if (source === 'agenda') {
      setLidasDaAgenda(prev => new Set(prev).add(id));
      return;
    }

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );

    if (source === 'assistant') {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    } else {
      await supabase.from('announcement_reads').upsert({
        user_id: userId,
        announcement_id: id,
      });
    }
  }, [userId]);

  /**
   * Avisos da agenda. Vivem só em memória: são derivados do que o Google já
   * devolveu, então gravá-los na tabela `notifications` só criaria linha velha
   * para limpar depois. O preço é que "lida" vale por sessão.
   */
  const notificacoesDaAgenda = useMemo<AppNotification[]>(() => {
    if (!conexao?.conectado) return [];

    const lista: AppNotification[] = [];
    const dia = hoje(fuso);
    const deHoje = proximos.filter(e => diaDoEvento(e.inicio, fuso) === dia);

    if (deHoje.length > 0) {
      const id = `agenda-hoje-${dia}`;
      lista.push({
        id,
        source: 'agenda',
        type: 'info',
        icon: 'i',
        title: deHoje.length === 1 ? '1 reunião hoje' : `${deHoje.length} reuniões hoje`,
        body: deHoje
          .slice(0, 3)
          .map(e => (e.diaInteiro ? e.titulo : `${horaDoEvento(e.inicio, fuso)} · ${e.titulo}`))
          .join('\n'),
        read: lidasDaAgenda.has(id),
        createdAt: `${dia}T00:00:00.000Z`,
        action: 'go_agenda',
      });
    }

    if (convitesPendentes.length > 0) {
      const id = `agenda-convites-${dia}-${convitesPendentes.length}`;
      lista.push({
        id,
        source: 'agenda',
        type: 'warn',
        icon: '!',
        title:
          convitesPendentes.length === 1
            ? '1 convite esperando resposta'
            : `${convitesPendentes.length} convites esperando resposta`,
        body: convitesPendentes.slice(0, 3).map(e => e.titulo).join('\n'),
        read: lidasDaAgenda.has(id),
        createdAt: `${dia}T00:00:00.000Z`,
        action: 'go_agenda_convites',
      });
    }

    return lista;
  }, [conexao?.conectado, proximos, convitesPendentes, fuso, lidasDaAgenda]);

  const markAllAsRead = useCallback(async () => {
    const naoLidasDaAgenda = notificacoesDaAgenda.filter(n => !n.read).map(n => n.id);
    if (naoLidasDaAgenda.length > 0) {
      setLidasDaAgenda(prev => new Set([...prev, ...naoLidasDaAgenda]));
    }

    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    // Mark personal notifications
    const personalIds = unread.filter(n => n.source === 'assistant').map(n => n.id);
    if (personalIds.length > 0) {
      await supabase.from('notifications').update({ read: true }).in('id', personalIds);
    }

    // Mark system announcements
    const systemIds = unread.filter(n => n.source === 'system').map(n => n.id);
    if (systemIds.length > 0) {
      const readRows = systemIds.map(aid => ({
        user_id: userId,
        announcement_id: aid,
      }));
      await supabase.from('announcement_reads').upsert(readRows);
    }
  }, [notifications, notificacoesDaAgenda, userId]);

  // A agenda vem primeiro: é o que é sobre hoje.
  const todas = [...notificacoesDaAgenda, ...notifications];
  const unreadCount = todas.filter(n => !n.read).length;

  return { notifications: todas, unreadCount, loading, markAsRead, markAllAsRead };
}

function rowToNotification(r: Record<string, unknown>, source: 'assistant' | 'system'): AppNotification {
  return {
    id: r.id as string,
    source,
    type: r.type as AppNotification['type'],
    icon: r.icon as string,
    title: r.title as string,
    body: r.body as string,
    read: r.read as boolean,
    createdAt: r.created_at as string,
    month: r.month as string | undefined,
  };
}
