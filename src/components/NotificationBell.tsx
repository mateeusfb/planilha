'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, AlertTriangle, Info, CheckCheck, Megaphone, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import type { AppNotification } from '@/hooks/useNotifications';
import type { PageId } from '@/lib/types';

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
  system: <Megaphone size={14} className="text-indigo-500" />,
};

const typeIconsLarge: Record<string, React.ReactNode> = {
  ok: <Check size={22} className="text-green-500" />,
  '!': <AlertTriangle size={22} className="text-amber-500" />,
  i: <Info size={22} className="text-blue-500" />,
  system: <Megaphone size={22} className="text-indigo-500" />,
};

const ACTION_LABELS: Record<string, { label: string; page: PageId }> = {
  go_settings_profile: { label: 'Ir para Configurações', page: 'settings' },
};

/* ── Modal de notificação completa ── */
function NotificationModal({ notification, onClose, onNavigate }: {
  notification: AppNotification;
  onClose: () => void;
  onNavigate?: (page: PageId) => void;
}) {
  const style = typeStyles[notification.type] || typeStyles.info;
  const isSystem = notification.source === 'system';
  const icon = isSystem ? typeIconsLarge.system : (typeIconsLarge[notification.icon] || typeIconsLarge.i);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md border t-border rounded-2xl shadow-2xl animate-modal-in overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        {/* Header colorido */}
        <div className={`px-5 py-4 border-b t-border ${style.bg}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${style.bg} border ${style.border} flex items-center justify-center`}>
                {icon}
              </div>
              <div>
                <h3 className="text-sm font-bold t-text">{notification.title}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {isSystem && (
                    <span className="text-[0.6rem] px-1.5 py-px rounded-full bg-indigo-500/10 text-indigo-500 font-semibold">
                      Folga
                    </span>
                  )}
                  <span className="text-[0.65rem] t-text-dim">{timeAgo(notification.createdAt)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-60 transition-opacity cursor-pointer t-text-muted"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-sm t-text leading-relaxed whitespace-pre-wrap">{notification.body}</p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t t-border flex justify-end gap-2">
          {notification.action && ACTION_LABELS[notification.action] && onNavigate && (
            <button
              onClick={() => { onNavigate(ACTION_LABELS[notification.action!].page); onClose(); }}
              className="px-4 py-2 text-sm font-medium t-accent-bg text-white rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
            >
              {ACTION_LABELS[notification.action].label}
            </button>
          )}
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity cursor-pointer ${
              notification.action ? 'border t-border t-text' : 't-accent-bg text-white'
            }`}
          >
            {notification.action ? 'Fechar' : 'Entendi'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Item da lista ── */
function NotificationItem({ notification, onRead, onOpen }: {
  notification: AppNotification;
  onRead: (id: string, source: 'assistant' | 'system') => void;
  onOpen: (n: AppNotification) => void;
}) {
  const style = typeStyles[notification.type] || typeStyles.info;
  const isSystem = notification.source === 'system';
  const icon = isSystem ? typeIcons.system : (typeIcons[notification.icon] || typeIcons.i);

  function handleClick() {
    if (!notification.read) {
      onRead(notification.id, notification.source);
    }
    onOpen(notification);
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-3 rounded-lg border-l-[3px] transition-all cursor-pointer ${style.border} ${
        notification.read ? 'opacity-50' : `${style.bg} hover:opacity-80`
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 mt-0.5">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold t-text truncate">{notification.title}</span>
            {isSystem && (
              <span className="text-[0.6rem] px-1.5 py-px rounded-full bg-indigo-500/10 text-indigo-500 font-semibold flex-shrink-0">
                Folga
              </span>
            )}
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

/* ── Bell principal ── */
export default function NotificationBell({ onNavigate }: { onNavigate?: (page: PageId) => void }) {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<AppNotification | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function handleOpenNotif(n: AppNotification) {
    setSelectedNotif(n);
    setOpen(false);
  }

  return (
    <>
      <div className="relative z-[60]">
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
            <div className="absolute right-0 top-full mt-1.5 w-80 md:w-96 max-h-[70vh] border t-border rounded-xl shadow-lg z-[60] flex flex-col overflow-hidden animate-fade-in-up" style={{ background: 'var(--bg-elevated)' }}>
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
                    <NotificationItem
                      key={`${n.source}-${n.id}`}
                      notification={n}
                      onRead={markAsRead}
                      onOpen={handleOpenNotif}
                    />
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de notificação completa */}
      {selectedNotif && (
        <NotificationModal
          notification={selectedNotif}
          onClose={() => setSelectedNotif(null)}
          onNavigate={onNavigate}
        />
      )}
    </>
  );
}
