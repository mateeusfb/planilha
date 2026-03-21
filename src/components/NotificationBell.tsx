'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, AlertTriangle, Info, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import type { AppNotification } from '@/hooks/useNotifications';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ontem';
  return `${days} dias atrás`;
}

const typeStyles: Record<string, { bg: string; border: string; dot: string }> = {
  good: { bg: 'bg-green-500/10', border: 'border-green-500', dot: 'bg-green-500' },
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500', dot: 'bg-blue-500' },
  warn: { bg: 'bg-amber-500/10', border: 'border-amber-500', dot: 'bg-amber-500' },
  bad: { bg: 'bg-red-500/10', border: 'border-red-500', dot: 'bg-red-500' },
};

const typeIcons: Record<string, React.ReactNode> = {
  ok: <Check size={14} className="text-green-500" />,
  '!': <AlertTriangle size={14} className="text-amber-500" />,
  i: <Info size={14} className="text-blue-500" />,
};

function NotificationItem({ notification, onRead }: { notification: AppNotification; onRead: (id: string) => void }) {
  const style = typeStyles[notification.type] || typeStyles.info;

  return (
    <button
      onClick={() => !notification.read && onRead(notification.id)}
      className={`w-full text-left p-3 rounded-lg border-l-[3px] transition-all cursor-pointer ${style.border} ${
        notification.read ? 'opacity-50' : `${style.bg} hover:opacity-80`
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 mt-0.5">
          {typeIcons[notification.icon] || typeIcons.i}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold t-text truncate">{notification.title}</span>
            {!notification.read && (
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
            )}
          </div>
          <p className="text-[0.75rem] t-text-muted leading-relaxed line-clamp-2">{notification.body}</p>
          <span className="text-[0.65rem] t-text-dim mt-1 block">{timeAgo(notification.createdAt)}</span>
        </div>
      </div>
    </button>
  );
}

export default function NotificationBell() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="relative z-[60]" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-8 h-8 rounded-full flex items-center justify-center t-card t-border border transition-colors cursor-pointer hover:opacity-80"
        title="Notificações"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[0.6rem] font-bold rounded-full flex items-center justify-center shadow-sm animate-fade-in-up">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-80 md:w-96 max-h-[70vh] t-card border rounded-xl shadow-lg z-[60] flex flex-col overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b t-border">
              <h3 className="text-sm font-bold t-text">Notificações</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-[0.7rem] t-accent hover:opacity-70 transition-opacity cursor-pointer flex items-center gap-1"
                >
                  <CheckCheck size={12} />
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {loading ? (
                <div className="py-8 text-center">
                  <div className="w-5 h-5 border-2 t-border border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span className="text-xs t-text-dim">Analisando suas finanças...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell size={24} className="mx-auto mb-2 t-text-dim opacity-40" />
                  <span className="text-xs t-text-dim">Nenhuma notificação este mês</span>
                </div>
              ) : (
                notifications.map(n => (
                  <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
