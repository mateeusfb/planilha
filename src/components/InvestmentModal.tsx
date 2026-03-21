'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Investment, InvestmentType } from '@/lib/types';

const TYPES: { value: InvestmentType; label: string }[] = [
  { value: 'renda_fixa', label: 'Renda Fixa' },
  { value: 'renda_variavel', label: 'Renda Variável' },
  { value: 'crypto', label: 'Criptomoedas' },
  { value: 'previdencia', label: 'Previdência' },
  { value: 'poupanca', label: 'Poupança' },
  { value: 'outros', label: 'Outros' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Investment, 'id' | 'active'>) => void;
  editing?: Investment | null;
}

export default function InvestmentModal({ isOpen, onClose, onSave, editing }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<InvestmentType>('renda_fixa');
  const [amountInvested, setAmountInvested] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setType(editing.type);
      setAmountInvested(String(editing.amountInvested));
      setCurrentValue(String(editing.currentValue));
      setPurchaseDate(editing.purchaseDate || '');
      setMaturityDate(editing.maturityDate || '');
      setNotes(editing.notes || '');
    } else {
      setName(''); setType('renda_fixa'); setAmountInvested(''); setCurrentValue('');
      setPurchaseDate(''); setMaturityDate(''); setNotes('');
    }
  }, [editing, isOpen]);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !amountInvested) return;
    const invested = parseFloat(amountInvested.replace(',', '.'));
    const current = currentValue ? parseFloat(currentValue.replace(',', '.')) : invested;
    onSave({ name: name.trim(), type, amountInvested: invested, currentValue: current, purchaseDate: purchaseDate || undefined, maturityDate: maturityDate || undefined, notes: notes.trim() || undefined });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md border t-border rounded-2xl shadow-2xl animate-modal-in overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b t-border">
          <h3 className="text-sm font-bold t-text">{editing ? 'Editar Investimento' : 'Novo Investimento'}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-60 cursor-pointer t-text-muted"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold t-text-muted mb-1">Nome do ativo</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: CDB Banco Inter 120%" required
              className="w-full px-3 py-2.5 rounded-lg t-input border text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold t-text-muted mb-1">Tipo</label>
            <select value={type} onChange={e => setType(e.target.value as InvestmentType)}
              className="w-full px-3 py-2.5 rounded-lg t-input border text-sm cursor-pointer">
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold t-text-muted mb-1">Valor investido</label>
              <input value={amountInvested} onChange={e => setAmountInvested(e.target.value)} placeholder="0,00" required type="number" step="0.01" min="0"
                className="w-full px-3 py-2.5 rounded-lg t-input border text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold t-text-muted mb-1">Valor atual</label>
              <input value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="0,00" type="number" step="0.01" min="0"
                className="w-full px-3 py-2.5 rounded-lg t-input border text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold t-text-muted mb-1">Data da compra</label>
              <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg t-input border text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold t-text-muted mb-1">Vencimento</label>
              <input type="date" value={maturityDate} onChange={e => setMaturityDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg t-input border text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold t-text-muted mb-1">Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Anotações sobre o investimento..."
              className="w-full px-3 py-2.5 rounded-lg t-input border text-sm resize-none" />
          </div>
          <button type="submit" className="w-full py-2.5 t-accent-bg text-white font-semibold rounded-lg cursor-pointer hover:opacity-90 transition-opacity text-sm">
            {editing ? 'Salvar alterações' : 'Adicionar investimento'}
          </button>
        </form>
      </div>
    </div>
  );
}
