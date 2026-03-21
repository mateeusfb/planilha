'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { InvestmentGoal } from '@/lib/types';

const ICONS = ['🎯', '🏠', '🚗', '✈️', '🎓', '💰', '🏖️', '👶', '💍', '📱', '🏥', '🔒'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<InvestmentGoal, 'id' | 'active'>) => void;
  editing?: InvestmentGoal | null;
}

export default function InvestmentGoalModal({ isOpen, onClose, onSave, editing }: Props) {
  const [name, setName] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [deadline, setDeadline] = useState('');
  const [icon, setIcon] = useState('🎯');

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setTargetValue(String(editing.targetValue));
      setCurrentValue(String(editing.currentValue));
      setDeadline(editing.deadline || '');
      setIcon(editing.icon);
    } else {
      setName(''); setTargetValue(''); setCurrentValue('0'); setDeadline(''); setIcon('🎯');
    }
  }, [editing, isOpen]);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !targetValue) return;
    onSave({
      name: name.trim(),
      targetValue: parseFloat(targetValue.replace(',', '.')),
      currentValue: currentValue ? parseFloat(currentValue.replace(',', '.')) : 0,
      deadline: deadline || undefined,
      icon,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md border t-border rounded-2xl shadow-2xl animate-modal-in overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b t-border">
          <h3 className="text-sm font-bold t-text">{editing ? 'Editar Meta' : 'Nova Meta de Investimento'}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-60 cursor-pointer t-text-muted"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold t-text-muted mb-1">Nome da meta</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Reserva de emergência" required
              className="w-full px-3 py-2.5 rounded-lg t-input border text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold t-text-muted mb-2">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setIcon(ic)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg cursor-pointer transition-all ${
                    icon === ic ? 't-accent-bg shadow-md scale-110' : 'bg-slate-100 hover:bg-slate-200'
                  }`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold t-text-muted mb-1">Valor da meta</label>
              <input value={targetValue} onChange={e => setTargetValue(e.target.value)} placeholder="100000" required type="number" step="0.01" min="0"
                className="w-full px-3 py-2.5 rounded-lg t-input border text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold t-text-muted mb-1">Valor atual</label>
              <input value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="0" type="number" step="0.01" min="0"
                className="w-full px-3 py-2.5 rounded-lg t-input border text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold t-text-muted mb-1">Prazo (opcional)</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg t-input border text-sm" />
          </div>
          <button type="submit" className="w-full py-2.5 t-accent-bg text-white font-semibold rounded-lg cursor-pointer hover:opacity-90 transition-opacity text-sm">
            {editing ? 'Salvar alterações' : 'Criar meta'}
          </button>
        </form>
      </div>
    </div>
  );
}
