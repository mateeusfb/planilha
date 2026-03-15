'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { fmt, genId } from '@/lib/helpers';
import { INCOME_CATS, EXPENSE_CATS, BASE_PAYMENTS, CAT_COLORS } from '@/lib/constants';
import type { Expense } from '@/lib/types';
import { Avatar } from './Sidebar';
import { useToast } from './Toast';
import InputModal from './InputModal';

interface Props {
  onDeleteRequest: (id: string) => void;
}

export default function ExpensesPage({ onDeleteRequest }: Props) {
  const { state, setState, getExpensesForMonth, getIndividualMembers, addExpense, updateExpense } = useStore();
  const { activeMonth, activeMember, members, expenses } = state;

  const [panelOpen, setPanelOpen] = useState(false);
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState(EXPENSE_CATS[0]);
  const [value, setValue] = useState('');
  const [month, setMonth] = useState(activeMonth);
  const [payment, setPayment] = useState('Credito');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentN, setInstallmentN] = useState(2);
  const [installmentCurrent, setInstallmentCurrent] = useState(1);
  const [memberId, setMemberId] = useState('all');
  const [note, setNote] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterPay, setFilterPay] = useState('');
  const [filterMember, setFilterMember] = useState('');
  const [saving, setSaving] = useState(false);
  const [inputModal, setInputModal] = useState<{ type: 'cat' | 'pay'; defaultValue?: string } | null>(null);

  const { toast } = useToast();

  const allExpenseCats = [...EXPENSE_CATS, ...(state.customCats || [])];
  const allPayments = [...BASE_PAYMENTS, ...(state.customPayments || [])];
  const individuals = getIndividualMembers();
  const conjuntas = members.filter(m => m.id !== 'all' && m.isConjunta);

  function openPanel(type?: 'expense' | 'income') {
    clearForm();
    if (type) switchType(type);
    setPanelOpen(true);
  }

  function closePanel() {
    clearForm();
    setPanelOpen(false);
  }

  function clearForm() {
    setDesc(''); setValue(''); setNote('');
    setPayment('Credito'); setIsInstallment(false);
    setInstallmentN(2); setInstallmentCurrent(1);
    setMonth(activeMonth); setMemberId('all');
    setFormType('expense'); setCat(EXPENSE_CATS[0]);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setEditingId(null);
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
    if (!month) return toast('Selecione o mês.', 'warning');

    const selectedMember = members.find(m => m.id === memberId);
    const isConjunta = selectedMember?.isConjunta && formType === 'expense';

    if (isConjunta) {
      if (individuals.length === 0) return toast('Nenhum membro individual cadastrado.', 'warning');
      const splitValue = val / individuals.length;
      const groupId = editingId || genId();
      if (editingId) {
        setState(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.conjuntaGroupId !== groupId) }));
      }
      setSaving(true);
      individuals.forEach(m => {
        addExpense({
          id: genId(), type: 'expense', desc: desc.trim(), cat, value: Math.round(splitValue * 100) / 100,
          month, payment, installment: 0, memberId: m.id,
          note: `Conjunta${note ? ': ' + note : ''}`, purchaseDate,
          conjuntaGroupId: groupId, conjuntaName: selectedMember?.name,
          createdAt: Date.now(),
        });
      });
      setSaving(false);
      toast('Despesa conjunta salva com sucesso!', 'success');
      closePanel();
      return;
    }

    if (isInstallment && !editingId && formType === 'expense') {
      const groupId = genId();
      const [baseY, baseM] = month.split('-').map(Number);
      for (let i = installmentCurrent; i <= installmentN; i++) {
        const d = new Date(baseY, baseM - 1 + (i - installmentCurrent), 1);
        const entryMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        addExpense({
          id: genId(), type: 'expense', desc: desc.trim(), cat, value: val,
          month: entryMonth, payment, installment: installmentN, installmentCurrent: i,
          installmentGroupId: groupId, memberId, note, purchaseDate, createdAt: Date.now(),
        });
      }
      closePanel();
      return;
    }

    const expense: Expense = {
      id: editingId || genId(), type: formType, desc: desc.trim(), cat, value: val,
      month, payment: formType === 'income' ? '-' : payment,
      installment: isInstallment ? installmentN : 0,
      installmentCurrent: isInstallment ? installmentCurrent : 0,
      memberId, note, purchaseDate, createdAt: Date.now(),
    };

    setSaving(true);
    if (editingId) {
      updateExpense(editingId, expense);
      toast('Lançamento atualizado!', 'success');
    } else {
      addExpense(expense);
      toast('Lançamento salvo com sucesso!', 'success');
    }
    setSaving(false);
    closePanel();
  }

  function startEdit(e: Expense) {
    setEditingId(e.id);
    switchType(e.type);
    setDesc(e.desc); setCat(e.cat); setValue(String(e.value));
    setMonth(e.month); setPayment(e.payment);
    setIsInstallment(e.installment > 0);
    setInstallmentN(e.installment || 2);
    setInstallmentCurrent(e.installmentCurrent || 1);
    setMemberId(e.memberId || 'all');
    setNote(e.note || '');
    setPurchaseDate(e.purchaseDate || new Date().toISOString().split('T')[0]);
    setPanelOpen(true);
  }

  const filteredExpenses = useMemo(() => {
    let list = getExpensesForMonth(activeMonth, activeMember);
    if (search) list = list.filter(e => e.desc.toLowerCase().includes(search.toLowerCase()) || e.cat.toLowerCase().includes(search.toLowerCase()));
    if (filterCat) list = list.filter(e => e.cat === filterCat);
    if (filterPay) list = list.filter(e => e.payment === filterPay);
    if (filterMember) list = list.filter(e => e.memberId === filterMember);
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [activeMonth, activeMember, expenses, search, filterCat, filterPay, filterMember, getExpensesForMonth]);

  const catOptions = formType === 'income' ? INCOME_CATS : allExpenseCats;

  const inputClass = "w-full px-3 py-2.5 border rounded-lg text-sm t-input focus:outline-none focus:ring-2 focus:ring-blue-100";

  return (
    <>
      {/* Table */}
      <div className="t-card rounded-xl border overflow-hidden">
        <div className="p-4 border-b t-border flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Lançamentos do Mês</h3>
          <div className="flex flex-wrap gap-2">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
              className="w-40 px-3 py-1.5 border rounded-lg text-[0.82rem] t-input" />
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-[0.82rem] t-input">
              <option value="">Todas categorias</option>
              {allExpenseCats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterPay} onChange={e => setFilterPay(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-[0.82rem] t-input">
              <option value="">Todas formas</option>
              {allPayments.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filterMember} onChange={e => setFilterMember(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-[0.82rem] t-input">
              <option value="">Todos membros</option>
              {[...individuals, ...conjuntas].map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button onClick={() => openPanel('expense')}
              className="px-4 py-2.5 md:py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer min-h-[44px] md:min-h-0">
              + Despesa
            </button>
            <button onClick={() => openPanel('income')}
              className="px-4 py-2.5 md:py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors cursor-pointer min-h-[44px] md:min-h-0">
              + Receita
            </button>
          </div>
        </div>
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-16 t-text-dim">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-sm mb-4">Nenhum lancamento encontrado neste mes.</p>
            <button onClick={() => openPanel()} className="px-5 py-2 t-accent-bg text-white rounded-lg text-sm font-semibold cursor-pointer">
              + Novo Lançamento
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr>
                {['Descrição','Categoria','Valor','Data','Pagamento','Parcelas','Membro','Ações'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[0.75rem] font-semibold uppercase tracking-wide t-text-muted border-b t-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(e => {
                const member = members.find(m => m.id === e.memberId) || { id: 'all', name: 'Família', color: '#2563eb' };
                const isIncome = e.type === 'income';
                return (
                  <tr key={e.id} className="t-row">
                    <td className="px-4 py-2.5 border-b t-border-light">
                      <div className="font-semibold text-[0.83rem]">{e.desc}
                        {e.conjuntaName && <span className="text-[0.72rem] t-text-dim font-normal ml-1">via {e.conjuntaName}</span>}
                      </div>
                      {e.note && <div className="text-[0.74rem] t-text-dim">{e.note}</div>}
                    </td>
                    <td className="px-4 py-2.5 border-b t-border-light text-[0.83rem]">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[0.72rem] font-semibold mr-1 ${isIncome ? 'bg-green-100 text-green-700' : e.conjuntaGroupId ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                        {isIncome ? 'Receita' : e.conjuntaGroupId ? 'Conjunta' : 'Despesa'}
                      </span>
                      <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: CAT_COLORS[e.cat] || '#94a3b8' }}></span>
                      {e.cat}
                    </td>
                    <td className={`px-4 py-2.5 border-b t-border-light font-bold text-[0.83rem] ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                      {isIncome ? '+' : '-'} {fmt(e.value)}
                    </td>
                    <td className="px-4 py-2.5 border-b t-border-light text-[0.83rem] t-text-muted">
                      {e.purchaseDate ? e.purchaseDate.split('-').reverse().join('/') : '-'}
                    </td>
                    <td className="px-4 py-2.5 border-b t-border-light text-[0.83rem]">
                      {isIncome ? '-' : <span className="px-2 py-0.5 rounded-full text-[0.72rem] font-semibold bg-slate-100">{e.payment}</span>}
                    </td>
                    <td className="px-4 py-2.5 border-b t-border-light text-[0.83rem]">
                      {e.installment > 0 ? `${e.installmentCurrent || 1}/${e.installment}` : '-'}
                    </td>
                    <td className="px-4 py-2.5 border-b t-border-light text-[0.83rem]">
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar member={member} size={20} />
                        {member.name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 border-b t-border-light">
                      <button onClick={() => startEdit(e)} className="px-2.5 py-1.5 md:py-1 border t-border rounded-lg text-[0.78rem] font-semibold t-card-hover mr-1 cursor-pointer min-h-[36px] md:min-h-0">Editar</button>
                      <button onClick={() => onDeleteRequest(e.id)} className="px-2.5 py-1.5 md:py-1 bg-red-50 text-red-600 rounded-lg text-[0.78rem] font-semibold hover:bg-red-100 cursor-pointer min-h-[36px] md:min-h-0">Excluir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) closePanel(); }}>
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative w-full max-w-xl t-card rounded-none md:rounded-2xl shadow-2xl border overflow-hidden h-full md:h-auto md:max-h-[90vh] flex flex-col animate-modal-in">
            {/* Header */}
            <div className="t-card border-b t-border px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold t-text">
                {editingId ? (formType === 'income' ? 'Editar Receita' : 'Editar Lançamento') : 'Novo Lançamento'}
              </h3>
              <button onClick={closePanel} className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 t-text-dim text-xl cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Type toggle */}
              <div className="flex gap-2">
                <button onClick={() => switchType('expense')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${formType === 'expense' ? 'bg-red-600 text-white shadow-md' : 'border border-red-300 text-red-600'}`}>
                  Despesa
                </button>
                <button onClick={() => switchType('income')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${formType === 'income' ? 'bg-green-600 text-white shadow-md' : 'border border-green-300 text-green-600'}`}>
                  Receita
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold t-text-muted uppercase tracking-wide mb-1.5">Descricao</label>
                <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Mercado, Salario..." autoFocus
                  className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold t-text-muted uppercase tracking-wide mb-1.5">Valor (R$)</label>
                  <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="0,00" min="0" step="0.01"
                    className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold t-text-muted uppercase tracking-wide mb-1.5">Categoria</label>
                  <select value={cat} onChange={e => {
                    if (e.target.value === '__new__') {
                      setInputModal({ type: 'cat' });
                    } else setCat(e.target.value);
                  }} className={inputClass}>
                    {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__new__">+ Nova categoria...</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold t-text-muted uppercase tracking-wide mb-1.5">Data da Compra</label>
                <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)}
                  className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold t-text-muted uppercase tracking-wide mb-1.5">Mes de Referencia</label>
                  <input type="month" value={month} onChange={e => setMonth(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold t-text-muted uppercase tracking-wide mb-1.5">Membro</label>
                  <select value={memberId} onChange={e => setMemberId(e.target.value)} className={inputClass}>
                    <option value="all" disabled={formType === 'income'}>Família (geral)</option>
                    {individuals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    {conjuntas.length > 0 && (
                      <optgroup label="Contas Conjuntas">
                        {conjuntas.map(m => <option key={m.id} value={m.id}>{m.name} (conjunta)</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>

              {formType === 'expense' && (
                <div>
                  <label className="block text-xs font-semibold t-text-muted uppercase tracking-wide mb-1.5">Forma de Pagamento</label>
                  <select value={payment} onChange={e => {
                    if (e.target.value === '__new_pay__') {
                      setInputModal({ type: 'pay' });
                    } else setPayment(e.target.value);
                  }} className={inputClass}>
                    {allPayments.map(p => <option key={p} value={p}>{p}</option>)}
                    <option value="__new_pay__">+ Nova forma...</option>
                  </select>
                </div>
              )}

              {formType === 'expense' && (
                <div>
                  <label className="block text-xs font-semibold t-text-muted uppercase tracking-wide mb-1.5">Parcelado?</label>
                  <div className="flex items-center gap-3">
                    <label className="toggle-switch">
                      <input type="checkbox" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="text-sm t-text">{isInstallment ? 'Sim' : 'Nao'}</span>
                    {isInstallment && (
                      <div className="flex items-center gap-2">
                        <input type="number" value={installmentCurrent} onChange={e => setInstallmentCurrent(Number(e.target.value))} min={1} max={60}
                          className="w-16 px-2 py-1.5 border rounded-lg text-sm t-input" />
                        <span className="text-xs t-text-dim">de</span>
                        <input type="number" value={installmentN} onChange={e => setInstallmentN(Number(e.target.value))} min={2} max={60}
                          className="w-16 px-2 py-1.5 border rounded-lg text-sm t-input" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold t-text-muted uppercase tracking-wide mb-1.5">Observação</label>
                <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Opcional..."
                  className={inputClass} />
              </div>
            </div>

            {/* Footer */}
            <div className="t-card border-t t-border px-6 py-4 flex gap-3 flex-shrink-0">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 t-accent-bg text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}
              </button>
              <button onClick={closePanel}
                className="px-5 py-2.5 border t-border rounded-xl text-sm font-semibold t-text hover:opacity-80 transition-colors cursor-pointer">
                Cancelar
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
            toast(`Categoria "${name}" criada!`, 'success');
          } else if (inputModal?.type === 'pay') {
            setState(prev => ({ ...prev, customPayments: [...(prev.customPayments || []), name] }));
            setPayment(name);
            toast(`Forma de pagamento "${name}" criada!`, 'success');
          }
        }}
        title={inputModal?.type === 'cat' ? 'Nova Categoria' : 'Nova Forma de Pagamento'}
        placeholder={inputModal?.type === 'cat' ? 'Nome da categoria...' : 'Nome da forma de pagamento...'}
      />

      <style jsx>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-in {
          animation: modalIn 0.25s ease-out;
        }
      `}</style>
    </>
  );
}
