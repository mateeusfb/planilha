'use client';

import { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, icon: string) => void;
}

export default function CreateWorkspaceModal({ isOpen, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const icons = ['📁', '🏢', '💼', '🏠', '🎯', '📊', '💰', '🛒'];
  const [selectedIcon, setSelectedIcon] = useState('📁');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="t-card rounded-2xl p-7 w-full max-w-md shadow-xl border">
        <h3 className="text-base font-bold mb-4">Criar novo espaço</h3>
        <div className="mb-4">
          <label className="block text-xs font-semibold t-text-muted uppercase tracking-wide mb-1.5">Nome</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Ex: Empresa, Freelance, Casa..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </div>
        <div className="mb-5">
          <label className="block text-xs font-semibold t-text-muted uppercase tracking-wide mb-1.5">Ícone</label>
          <div className="flex gap-2 flex-wrap">
            {icons.map(ic => (
              <button key={ic} onClick={() => setSelectedIcon(ic)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg cursor-pointer border-2 transition-all ${
                  selectedIcon === ic ? 'border-blue-500 bg-blue-50 scale-110' : 'border-slate-200'
                }`}>
                {ic}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 cursor-pointer">Cancelar</button>
          <button onClick={() => { if (name.trim()) { onCreate(name.trim(), selectedIcon); setName(''); } }}
            disabled={!name.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer">
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}
