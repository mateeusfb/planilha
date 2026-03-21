'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { INCOME_CATS, EXPENSE_CATS, BASE_PAYMENTS, BASE_BANKS } from '@/lib/constants';
import { useToast } from './Toast';
import InputModal from './InputModal';
import { Plus, X } from 'lucide-react';
import { useExpenseForm } from '@/hooks/useExpenseForm';

export default function QuickExpense() {
  const { state, setState, getIndividualMembers } = useStore();
  const { members } = state;
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const form = useExpenseForm();
  const [inputModal, setInputModal] = useState<{ type: 'cat' | 'pay' | 'bank' } | null>(null);

  const allExpenseCats = [...EXPENSE_CATS, ...(state.customCats || [])];
  const allPayments = [...BASE_PAYMENTS, ...(state.customPayments || [])];
  const allBanks = [...BASE_BANKS, ...(state.customBanks || [])];
  const individuals = getIndividualMembers();
  const conjuntas = members.filter(m => m.id !== 'all' && m.isConjunta);
  const catOptions = form.formType === 'income' ? INCOME_CATS : allExpenseCats;

  function clearAndClose() {
    form.clearForm();
    setOpen(false);
  }

  function handleSave() {
    if (!form.desc.trim()) return toast('Digite a descrição.', 'warning');
    const val = parseFloat(form.value);
    if (!val || val <= 0) return toast('Digite um valor válido.', 'warning');

    form.handleSave({
      onSuccess: () => {
        toast(form.formType === 'income' ? 'Receita salva!' : 'Despesa salva!', 'success');
        clearAndClose();
      },
    });
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
            <div className="flex items-center justify-between px-5 py-3.5 border-b t-border flex-shrink-0">
              <h3 className="text-base font-bold t-text">Lançamento Rápido</h3>
              <button onClick={clearAndClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 t-text-dim cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div className="flex gap-2">
                <button onClick={() => form.switchType('expense')}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${form.formType === 'expense' ? 'bg-red-600 text-white' : 'border border-red-300 text-red-600'}`}>
                  Despesa
                </button>
                <button onClick={() => form.switchType('income')}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${form.formType === 'income' ? 'bg-green-600 text-white' : 'border border-green-300 text-green-600'}`}>
                  Receita
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <input type="text" value={form.desc} onChange={e => form.setDesc(e.target.value)} placeholder="Descrição" autoFocus className={inputClass} />
                </div>
                <div>
                  <input type="number" value={form.value} onChange={e => form.setValue(e.target.value)} placeholder="Valor (R$)" min="0" step="0.01" className={inputClass} />
                </div>
                <div>
                  <select value={form.cat} onChange={e => {
                    if (e.target.value === '__new__') setInputModal({ type: 'cat' });
                    else form.setCat(e.target.value);
                  }} className={inputClass}>
                    {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__new__">+ Nova...</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input type="date" value={form.purchaseDate} onChange={e => form.setPurchaseDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <select value={form.memberId} onChange={e => form.setMemberId(e.target.value)} className={inputClass}>
                    <option value="all" disabled={form.formType === 'income'}>Família</option>
                    {individuals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    {conjuntas.map(m => <option key={m.id} value={m.id}>{m.name} (conj.)</option>)}
                  </select>
                </div>
              </div>

              {form.formType === 'expense' && (
                <div className="grid grid-cols-2 gap-3">
                  <select value={form.payment} onChange={e => {
                    if (e.target.value === '__new_pay__') setInputModal({ type: 'pay' });
                    else form.setPayment(e.target.value);
                  }} className={inputClass}>
                    {allPayments.map(p => <option key={p} value={p}>{p}</option>)}
                    <option value="__new_pay__">+ Nova...</option>
                  </select>
                  <select value={form.bank} onChange={e => {
                    if (e.target.value === '__new_bank__') setInputModal({ type: 'bank' });
                    else form.setBank(e.target.value);
                  }} className={inputClass}>
                    <option value="">Instituição (opcional)</option>
                    {allBanks.map(b => <option key={b} value={b}>{b}</option>)}
                    <option value="__new_bank__">+ Nova...</option>
                  </select>
                </div>
              )}

              {form.formType === 'income' && (
                <select value={form.bank} onChange={e => {
                  if (e.target.value === '__new_bank__') setInputModal({ type: 'bank' });
                  else form.setBank(e.target.value);
                }} className={inputClass}>
                  <option value="">Instituição (opcional)</option>
                  {allBanks.map(b => <option key={b} value={b}>{b}</option>)}
                  <option value="__new_bank__">+ Nova...</option>
                </select>
              )}

              {form.formType === 'expense' && (
                <div className="flex items-center gap-3">
                  <label className="toggle-switch">
                    <input type="checkbox" checked={form.isInstallment} onChange={e => form.setIsInstallment(e.target.checked)} />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="text-sm t-text">Parcelado</span>
                  {form.isInstallment && (
                    <input type="number" value={form.installmentN} onChange={e => form.setInstallmentN(Number(e.target.value))} min={2} max={60}
                      className="w-16 px-2 py-1.5 border rounded-lg text-sm t-input" />
                  )}
                  {form.isInstallment && <span className="text-xs t-text-dim">parcelas</span>}
                </div>
              )}

              <input type="text" value={form.note} onChange={e => form.setNote(e.target.value)} placeholder="Observação (opcional)" className={inputClass} />
            </div>

            <div className="px-5 py-3.5 border-t t-border flex-shrink-0">
              <button onClick={handleSave} disabled={form.saving}
                className="w-full py-2.5 t-accent-bg text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
                {form.saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {form.saving ? 'Salvando...' : 'Salvar'}
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
            form.setCat(name);
          } else if (inputModal?.type === 'pay') {
            setState(prev => ({ ...prev, customPayments: [...(prev.customPayments || []), name] }));
            form.setPayment(name);
          } else if (inputModal?.type === 'bank') {
            setState(prev => ({ ...prev, customBanks: [...(prev.customBanks || []), name] }));
            form.setBank(name);
          }
          toast(`"${name}" adicionado!`, 'success');
        }}
        title={inputModal?.type === 'cat' ? 'Nova Categoria' : inputModal?.type === 'pay' ? 'Nova Forma de Pagamento' : 'Nova Instituição'}
        placeholder={inputModal?.type === 'cat' ? 'Nome da categoria...' : inputModal?.type === 'pay' ? 'Nome da forma...' : 'Nome da instituição...'}
      />
    </>
  );
}
