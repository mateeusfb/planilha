'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { fmt, genId, getTotal } from '@/lib/helpers';
import { INCOME_CATS, EXPENSE_CATS, BASE_PAYMENTS, CAT_COLORS } from '@/lib/constants';
import type { Expense } from '@/lib/types';
import { Avatar } from './Sidebar';

interface Props {
  onDeleteRequest: (id: string) => void;
}

export default function ExpensesPage({ onDeleteRequest }: Props) {
  const { state, setState, getExpensesForMonth, getIndividualMembers, addExpense, updateExpense } = useStore();
  const { activeMonth, activeMember, members, expenses } = state;

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

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterPay, setFilterPay] = useState('');
  const [filterMember, setFilterMember] = useState('');

  const allExpenseCats = [...EXPENSE_CATS, ...(state.customCats || [])];
  const allPayments = [...BASE_PAYMENTS, ...(state.customPayments || [])];
  const individuals = getIndividualMembers();
  const conjuntas = members.filter(m => m.id !== 'all' && m.isConjunta);

  function clearForm() {
    setDesc(''); setValue(''); setNote('');
    setPayment('Credito'); setIsInstallment(false);
    setInstallmentN(2); setInstallmentCurrent(1);
    setMonth(activeMonth); setMemberId('all');
    setFormType('expense'); setCat(EXPENSE_CATS[0]);
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
    if (!desc.trim()) return alert('Digite a descricao.');
    const val = parseFloat(value);
    if (!val || val <= 0) return alert('Digite um valor valido.');
    if (!month) return alert('Selecione o mes.');

    const selectedMember = members.find(m => m.id === memberId);
    const isConjunta = selectedMember?.isConjunta && formType === 'expense';

    if (isConjunta) {
      if (individuals.length === 0) return alert('Nenhum membro individual cadastrado.');
      const splitValue = val / individuals.length;
      const groupId = editingId || genId();
      if (editingId) {
        setState(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.conjuntaGroupId !== groupId) }));
      }
      individuals.forEach(m => {
        addExpense({
          id: genId(), type: 'expense', desc: desc.trim(), cat, value: Math.round(splitValue * 100) / 100,
          month, payment, installment: 0, memberId: m.id,
          note: `Conjunta${note ? ': ' + note : ''}`,
          conjuntaGroupId: groupId, conjuntaName: selectedMember?.name,
          createdAt: Date.now(),
        });
      });
      clearForm();
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
          installmentGroupId: groupId, memberId, note, createdAt: Date.now(),
        });
      }
      clearForm();
      return;
    }

    const expense: Expense = {
      id: editingId || genId(), type: formType, desc: desc.trim(), cat, value: val,
      month, payment: formType === 'income' ? '-' : payment,
      installment: isInstallment ? installmentN : 0,
      installmentCurrent: isInstallment ? installmentCurrent : 0,
      memberId, note, createdAt: Date.now(),
    };

    if (editingId) {
      updateExpense(editingId, expense);
    } else {
      addExpense(expense);
    }
    clearForm();
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

  return (
    <>
      {/* Form */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 mb-6">
        <h3 className="text-base font-bold mb-4">{editingId ? (formType === 'income' ? 'Editar Receita' : 'Editar Lancamento') : 'Novo Lancamento'}</h3>
        <div className="flex gap-2 mb-4">
          <button onClick={() => switchType('expense')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${formType === 'expense' ? 'bg-red-600 text-white' : 'border border-red-300 text-red-600'}`}>
            Despesa
          </button>
          <button onClick={() => switchType('income')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${formType === 'income' ? 'bg-green-600 text-white' : 'border border-green-300 text-green-600'}`}>
            Receita
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Descricao</label>
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Mercado, Salario..."
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoria</label>
            <select value={cat} onChange={e => {
              if (e.target.value === '__new__') {
                const name = prompt('Nome da nova categoria:');
                if (name?.trim()) {
                  setState(prev => ({ ...prev, customCats: [...(prev.customCats || []), name.trim()] }));
                  setCat(name.trim());
                }
              } else setCat(e.target.value);
            }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__new__" className="text-blue-600 font-semibold">+ Nova categoria...</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor (R$)</label>
            <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="0,00" min="0" step="0.01"
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mes / Ano</label>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          {formType === 'expense' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Forma de Pagamento</label>
              <select value={payment} onChange={e => {
                if (e.target.value === '__new_pay__') {
                  const name = prompt('Nome da nova forma:');
                  if (name?.trim()) {
                    setState(prev => ({ ...prev, customPayments: [...(prev.customPayments || []), name.trim()] }));
                    setPayment(name.trim());
                  }
                } else setPayment(e.target.value);
              }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                {allPayments.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="__new_pay__" className="text-blue-600 font-semibold">+ Nova forma...</option>
              </select>
            </div>
          )}
          {formType === 'expense' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Parcelado?</label>
              <div className="flex items-center gap-2 h-[38px]">
                <label className="toggle-switch">
                  <input type="checkbox" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
                <span className="text-sm">{isInstallment ? 'Sim' : 'Nao'}</span>
                {isInstallment && (
                  <>
                    <input type="number" value={installmentCurrent} onChange={e => setInstallmentCurrent(Number(e.target.value))} min={1} max={60}
                      className="w-14 px-2 py-1 border border-slate-200 rounded-lg text-sm" />
                    <span className="text-xs text-slate-400">de</span>
                    <input type="number" value={installmentN} onChange={e => setInstallmentN(Number(e.target.value))} min={2} max={60}
                      className="w-14 px-2 py-1 border border-slate-200 rounded-lg text-sm" />
                  </>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Membro</label>
            <select value={memberId} onChange={e => setMemberId(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="all" disabled={formType === 'income'}>Familia (gasto geral)</option>
              {individuals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              {conjuntas.length > 0 && (
                <optgroup label="Contas Conjuntas">
                  {conjuntas.map(m => <option key={m.id} value={m.id}>{m.name} (conjunta)</option>)}
                </optgroup>
              )}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Observacao</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Opcional..."
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>
        <div className="mt-4 flex gap-2.5">
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer">
            {editingId ? 'Atualizar' : 'Salvar'}
          </button>
          {editingId && (
            <button onClick={clearForm} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer">
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Lancamentos do Mes</h3>
          <div className="flex flex-wrap gap-2">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
              className="w-40 px-3 py-1.5 border border-slate-200 rounded-lg text-[0.82rem] bg-slate-50" />
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-[0.82rem] bg-slate-50">
              <option value="">Todas categorias</option>
              {allExpenseCats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterPay} onChange={e => setFilterPay(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-[0.82rem] bg-slate-50">
              <option value="">Todas formas</option>
              {allPayments.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filterMember} onChange={e => setFilterMember(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-[0.82rem] bg-slate-50">
              <option value="">Todos membros</option>
              {[...individuals, ...conjuntas].map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-sm">Nenhum lancamento encontrado.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                {['Descricao','Categoria','Valor','Pagamento','Parcelas','Membro','Acoes'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(e => {
                const member = members.find(m => m.id === e.memberId) || { id: 'all', name: 'Familia', color: '#2563eb' };
                const isIncome = e.type === 'income';
                return (
                  <tr key={e.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 border-b border-slate-100">
                      <div className="font-semibold text-[0.83rem]">{e.desc}
                        {e.conjuntaName && <span className="text-[0.72rem] text-slate-400 font-normal ml-1">via {e.conjuntaName}</span>}
                      </div>
                      {e.note && <div className="text-[0.74rem] text-slate-400">{e.note}</div>}
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-[0.83rem]">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[0.72rem] font-semibold mr-1 ${isIncome ? 'bg-green-100 text-green-700' : e.conjuntaGroupId ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                        {isIncome ? 'Receita' : e.conjuntaGroupId ? 'Conjunta' : 'Despesa'}
                      </span>
                      <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: CAT_COLORS[e.cat] || '#94a3b8' }}></span>
                      {e.cat}
                    </td>
                    <td className={`px-4 py-2.5 border-b border-slate-100 font-bold text-[0.83rem] ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                      {isIncome ? '+' : '-'} {fmt(e.value)}
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-[0.83rem]">
                      {isIncome ? '-' : <span className="px-2 py-0.5 rounded-full text-[0.72rem] font-semibold bg-slate-100">{e.payment}</span>}
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-[0.83rem]">
                      {e.installment > 0 ? `${e.installmentCurrent || 1}/${e.installment}` : '-'}
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-[0.83rem]">
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar member={member} size={20} />
                        {member.name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100">
                      <button onClick={() => startEdit(e)} className="px-2.5 py-1 border border-slate-200 rounded-lg text-[0.78rem] font-semibold hover:bg-slate-50 mr-1 cursor-pointer">Editar</button>
                      <button onClick={() => onDeleteRequest(e.id)} className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-[0.78rem] font-semibold hover:bg-red-100 cursor-pointer">Excluir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
