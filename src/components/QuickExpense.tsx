'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { genId } from '@/lib/helpers';
import { INCOME_CATS, EXPENSE_CATS, DEFAULT_ACCOUNTS, accountLabel } from '@/lib/constants';
import { useToast } from './Toast';
import InputModal from './InputModal';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { Expense, Account } from '@/lib/types';

export default function QuickExpense() {
  const { state, setState, addExpense, getIndividualMembers } = useStore();
  const { activeMonth, members } = state;
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState(EXPENSE_CATS[0]);
  const [value, setValue] = useState('');
  const [month, setMonth] = useState(activeMonth);
  const [memberId, setMemberId] = useState('all');
  const [note, setNote] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentN, setInstallmentN] = useState(2);
  const [saving, setSaving] = useState(false);
  const [inputModal, setInputModal] = useState<{ type: 'cat' } | null>(null);
  const [showMore, setShowMore] = useState(false);

  // Accounts
  const accounts: Account[] = state.accounts.length > 0 ? state.accounts : DEFAULT_ACCOUNTS;
  const defaultAccount = accounts.find(a => a.isDefault) || accounts[0];
  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccount?.id || '');

  const allExpenseCats = [...EXPENSE_CATS, ...(state.customCats || [])];
  const individuals = getIndividualMembers();
  const conjuntas = members.filter(m => m.id !== 'all' && m.isConjunta);
  const catOptions = formType === 'income' ? INCOME_CATS : allExpenseCats;

  function clearAndClose() {
    setDesc(''); setValue(''); setNote('');
    setIsInstallment(false); setInstallmentN(2);
    setMonth(activeMonth); setMemberId('all');
    setFormType('expense'); setCat(EXPENSE_CATS[0]);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setSelectedAccountId(defaultAccount?.id || '');
    setShowMore(false);
    setOpen(false);
  }

  function switchType(type: 'expense' | 'income') {
    setFormType(type);
    setCat(type === 'income' ? INCOME_CATS[0] : EXPENSE_CATS[0]);
    if (type === 'income' && memberId === 'all' && individuals.length > 0) {
      setMemberId(individuals[0].id);
    }
  }

  function handleSave() {
    if (!desc.trim()) return toast('Digite a descrição.', 'warning');
    const val = parseFloat(value);
    if (!val || val <= 0) return toast('Digite um valor válido.', 'warning');

    const account = accounts.find(a => a.id === selectedAccountId) || defaultAccount;
    const payment = account?.type || 'Debito';
    const bank = (account?.name === account?.type || account?.name === 'PIX' || account?.name === 'Carteira') ? '' : (account?.name || '');

    setSaving(true);

    if (isInstallment && formType === 'expense') {
      const groupId = genId();
      const [baseY, baseM] = month.split('-').map(Number);
      for (let i = 1; i <= installmentN; i++) {
        const d = new Date(baseY, baseM - 1 + (i - 1), 1);
        const entryMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        addExpense({
          id: genId(), type: 'expense', desc: desc.trim(), cat, value: val,
          month: entryMonth, payment, installment: installmentN, installmentCurrent: i,
          installmentGroupId: groupId, memberId, note, purchaseDate, bank: bank || undefined, createdAt: Date.now(),
        });
      }
    } else {
      const expense: Expense = {
        id: genId(), type: formType, desc: desc.trim(), cat, value: val,
        month, payment: formType === 'income' ? '-' : payment,
        installment: 0, memberId, note, purchaseDate, bank: bank || undefined, createdAt: Date.now(),
      };
      addExpense(expense);
    }

    setSaving(false);
    toast(formType === 'income' ? 'Receita salva!' : 'Despesa salva!', 'success');
    clearAndClose();
  }

  const inputClass = "w-full px-3 py-2.5 border rounded-lg text-sm t-input focus:outline-none focus:ring-2 focus:ring-blue-100";

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full t-accent-bg text-white shadow-lg hover:opacity-90 cursor-pointer flex items-center justify-center z-[100] transition-transform active:scale-95"
        title="Novo lançamento"
      >
        <Plus size={24} />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center" onClick={e => { if (e.target === e.currentTarget) clearAndClose(); }}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-md t-card rounded-t-2xl md:rounded-2xl shadow-2xl border overflow-hidden max-h-[85vh] flex flex-col animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b t-border flex-shrink-0">
              <h3 className="text-base font-bold t-text">Lançamento Rápido</h3>
              <button onClick={clearAndClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 t-text-dim cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              {/* Type toggle */}
              <div className="flex gap-2">
                <button onClick={() => switchType('expense')}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${formType === 'expense' ? 'bg-red-600 text-white' : 'border border-red-300 text-red-600'}`}>
                  Despesa
                </button>
                <button onClick={() => switchType('income')}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${formType === 'income' ? 'bg-green-600 text-white' : 'border border-green-300 text-green-600'}`}>
                  Receita
                </button>
              </div>

              {/* Campos essenciais: Descrição, Valor, Categoria, Conta */}
              <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição" autoFocus className={inputClass} />

              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="Valor (R$)" min="0" step="0.01" className={inputClass} />
                <select value={cat} onChange={e => {
                  if (e.target.value === '__new__') setInputModal({ type: 'cat' });
                  else setCat(e.target.value);
                }} className={inputClass}>
                  {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__new__">+ Nova...</option>
                </select>
              </div>

              {/* Conta unificada */}
              <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className={inputClass}>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{accountLabel(a)}</option>
                ))}
              </select>

              {/* Botão "Mais opções" */}
              <button
                type="button"
                onClick={() => setShowMore(!showMore)}
                className="flex items-center gap-1 text-xs font-semibold t-text-dim hover:t-text cursor-pointer transition-colors"
              >
                {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showMore ? 'Menos opções' : 'Mais opções'}
              </button>

              {/* Campos opcionais colapsados */}
              {showMore && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className={inputClass} />
                    <select value={memberId} onChange={e => setMemberId(e.target.value)} className={inputClass}>
                      <option value="all" disabled={formType === 'income'}>Família</option>
                      {individuals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      {conjuntas.map(m => <option key={m.id} value={m.id}>{m.name} (conj.)</option>)}
                    </select>
                  </div>

                  {formType === 'expense' && (
                    <div className="flex items-center gap-3">
                      <label className="toggle-switch">
                        <input type="checkbox" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} />
                        <span className="toggle-slider"></span>
                      </label>
                      <span className="text-sm t-text">Parcelado</span>
                      {isInstallment && (
                        <input type="number" value={installmentN} onChange={e => setInstallmentN(Number(e.target.value))} min={2} max={60}
                          className="w-16 px-2 py-1.5 border rounded-lg text-sm t-input" />
                      )}
                      {isInstallment && <span className="text-xs t-text-dim">parcelas</span>}
                    </div>
                  )}

                  <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Observação (opcional)" className={inputClass} />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t t-border flex-shrink-0">
              <button onClick={handleSave} disabled={saving}
                className="w-full py-2.5 t-accent-bg text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <InputModal
        isOpen={!!inputModal}
        onClose={() => setInputModal(null)}
        onConfirm={(name) => {
          if (inputModal?.type === 'cat') {
            setState(prev => ({ ...prev, customCats: [...(prev.customCats || []), name] }));
            setCat(name);
          }
          toast(`"${name}" adicionado!`, 'success');
        }}
        title="Nova Categoria"
        placeholder="Nome da categoria..."
      />

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUp 0.3s ease-out; }
      `}</style>
    </>
  );
}
