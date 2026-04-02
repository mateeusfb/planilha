'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Investment } from '@/lib/types';
import { fmt } from '@/lib/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { investmentId: string; amount: number; date: string; reason?: string }) => void;
  investment: Investment | null;
}

export default function WithdrawalModal({ isOpen, onClose, onSave, investment }: Props) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setReason('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  if (!isOpen || !investment) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !date || !investment) return;
    const val = parseFloat(amount.replace(',', '.'));
    if (val <= 0 || val > investment.currentValue) return;
    onSave({
      investmentId: investment.id,
      amount: val,
      date,
      reason: reason.trim() || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm border t-border rounded-2xl shadow-2xl animate-modal-in overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b t-border">
          <h3 className="text-sm font-bold t-text">Resgatar Investimento</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-60 cursor-pointer t-text-muted"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5">
            <p className="text-xs t-text-dim">Resgatando de</p>
            <p className="text-sm font-bold t-text">{investment.name}</p>
            <p className="text-xs t-text-dim mt-1">Valor atual disponível: <strong className="t-text">{fmt(investment.currentValue)}</strong></p>
          </div>
          <div>
            <label className="block text-xs font-semibold t-text-muted mb-1">Valor do resgate (R$)</label>
            <input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0,00"
              required
              type="number"
              step="0.01"
              min="0.01"
              max={investment.currentValue}
              className="w-full px-3 py-2.5 rounded-lg t-input border text-sm"
            />
            <div className="flex gap-2 mt-1.5">
              {[25, 50, 75, 100].map(pct => (
                <button key={pct} type="button"
                  onClick={() => setAmount(String(Math.round(investment.currentValue * pct / 100 * 100) / 100))}
                  className="flex-1 py-1 text-[0.6rem] font-semibold rounded border t-border t-text-dim hover:opacity-80 cursor-pointer transition-colors">
                  {pct}%
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold t-text-muted mb-1">Data da retirada</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required
              className="w-full px-3 py-2.5 rounded-lg t-input border text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold t-text-muted mb-1">Motivo (opcional)</label>
            <input value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Ex: Emergência, Compra planejada..."
              className="w-full px-3 py-2.5 rounded-lg t-input border text-sm" />
          </div>
          <button type="submit"
            className="w-full py-2.5 bg-red-600 text-white font-semibold rounded-lg cursor-pointer hover:bg-red-700 transition-colors text-sm">
            Confirmar Resgate
          </button>
        </form>
      </div>
    </div>
  );
}
