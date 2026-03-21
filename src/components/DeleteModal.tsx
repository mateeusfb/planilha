'use client';

import { useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message?: string;
}

export default function DeleteModal({ isOpen, onClose, onConfirm, message }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') onConfirm();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="t-card rounded-2xl p-5 md:p-7 w-[90%] max-w-md shadow-xl border">
        <h3 className="text-base font-bold mb-3">Confirmar exclusão</h3>
        <p className="text-sm text-slate-500 mb-5">
          {message || 'Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.'}
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border t-border rounded-lg text-sm font-semibold hover:bg-slate-50 cursor-pointer">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 cursor-pointer">Excluir</button>
        </div>
      </div>
    </div>
  );
}
