'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { generateTips } from '@/lib/tips';
import { getCurrentMonth } from '@/lib/helpers';

export interface AppNotification {
  id: string;
  type: 'good' | 'info' | 'warn' | 'bad';
  icon: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  month: string;
}

interface UseNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { userId, workspaceId, state, getExpensesForMonth, getIndividualMembers } = useStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = getCurrentMonth();

  // Fetch or generate notifications
  useEffect(() => {
    if (!userId || state.expenses === undefined) return;

    let cancelled = false;

    async function loadNotifications() {
      setLoading(true);

      // Build query for current user + workspace + month
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('month', currentMonth)
        .order('created_at', { ascending: false });

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      } else {
        query = query.is('workspace_id', null);
      }

      const { data: existing } = await query;

      if (cancelled) return;

      if (existing && existing.length > 0) {
        // Notifications already exist for this month — use them
        setNotifications(existing.map(rowToNotification));
        setLoading(false);
        return;
      }

      // No notifications yet — generate from tips
      const allEntries = getExpensesForMonth(currentMonth, 'all');

      // Only generate if there's data to analyze
      if (allEntries.length === 0) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const tips = generateTips(allEntries, 'all', getIndividualMembers, 0);

      if (tips.length === 0) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      // Insert into Supabase
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

      if (cancelled) return;

      if (inserted) {
        setNotifications(inserted.map(rowToNotification));
      }

      setLoading(false);
    }

    loadNotifications();
    return () => { cancelled = true; };
  }, [userId, workspaceId, currentMonth, state.expenses.length]);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}

function rowToNotification(r: Record<string, unknown>): AppNotification {
  return {
    id: r.id as string,
    type: r.type as AppNotification['type'],
    icon: r.icon as string,
    title: r.title as string,
    body: r.body as string,
    read: r.read as boolean,
    createdAt: r.created_at as string,
    month: r.month as string,
  };
}
