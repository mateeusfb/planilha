'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { generateTips } from '@/lib/tips';
import { getCurrentMonth } from '@/lib/helpers';

export interface AppNotification {
  id: string;
  source: 'assistant' | 'system';
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
  markAsRead: (id: string, source: 'assistant' | 'system') => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { userId, workspaceId, state, getExpensesForMonth, getIndividualMembers } = useStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = getCurrentMonth();

  useEffect(() => {
    if (!userId || state.expenses === undefined) return;

    let cancelled = false;

    async function loadNotifications() {
      setLoading(true);

      // ── 1. Load personal (assistant) notifications ──
      let personalQuery = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('month', currentMonth)
        .order('created_at', { ascending: false });

      if (workspaceId) {
        personalQuery = personalQuery.eq('workspace_id', workspaceId);
      } else {
        personalQuery = personalQuery.is('workspace_id', null);
      }

      const { data: existingPersonal } = await personalQuery;

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
        const allEntries = getExpensesForMonth(currentMonth, 'all');
        if (allEntries.length > 0) {
          const tips = generateTips(allEntries, 'all', getIndividualMembers, 0);

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
              workspace_id: workspaceId || null,
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
            workspace_id: workspaceId || null,
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
    }

    loadNotifications();
    return () => { cancelled = true; };
  }, [userId, workspaceId, currentMonth, state.expenses.length]);

  const markAsRead = useCallback(async (id: string, source: 'assistant' | 'system') => {
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

  const markAllAsRead = useCallback(async () => {
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
  }, [notifications, userId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
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
