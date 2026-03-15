'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Check, X, Info, AlertTriangle } from 'lucide-react';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastItem['type'], duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastItem['type'] = 'success', duration = 3000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[999] flex flex-col gap-2 max-w-[90vw] md:max-w-sm">
        {toasts.map(t => (
          <ToastItem key={t.id} item={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(item.id), 300);
    }, item.duration || 3000);
    return () => clearTimeout(timer);
  }, [item, onRemove]);

  const styles: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
    success: { bg: 'bg-green-50', border: 'border-green-400', icon: <Check size={18} className="text-green-600" /> },
    error: { bg: 'bg-red-50', border: 'border-red-400', icon: <X size={18} className="text-red-600" /> },
    info: { bg: 'bg-blue-50', border: 'border-blue-400', icon: <Info size={18} className="text-blue-600" /> },
    warning: { bg: 'bg-amber-50', border: 'border-amber-400', icon: <AlertTriangle size={18} className="text-amber-600" /> },
  };

  const s = styles[item.type];

  return (
    <div
      className={`${s.bg} border ${s.border} rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 transition-all duration-300 ${
        visible && !exiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <span className="flex-shrink-0">{s.icon}</span>
      <span className="text-sm font-medium text-slate-700 flex-1">{item.message}</span>
      <button
        onClick={() => { setExiting(true); setTimeout(() => onRemove(item.id), 300); }}
        className="text-slate-400 hover:text-slate-600 cursor-pointer flex-shrink-0 w-6 h-6 flex items-center justify-center"
      >
        <X size={14} />
      </button>
    </div>
  );
}
