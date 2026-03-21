'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { fmt } from '@/lib/helpers';
import { INCOME_CATS, EXPENSE_CATS, BASE_PAYMENTS, BASE_BANKS, CAT_COLORS } from '@/lib/constants';
import { Avatar } from './Sidebar';
import { useToast } from './Toast';
import InputModal from './InputModal';
import { useExpenseForm } from '@/hooks/useExpenseForm';
import { Search, BarChart3, X, SlidersHorizontal, Download } from 'lucide-react';
import { exportToCSV } from '@/lib/export';

interface Props {
  onDeleteRequest: (id: string) => void;
}

export default function ExpensesPage({ onDeleteRequest }: Props) {
  const { state, setState, getExpensesForMonth, getIndividualMembers } = useStore();
  const { activeMonth, activeMember, members, expenses } = state;

  const form = useExpenseForm();
  const [panelOpen, setPanelOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterPay, setFilterPay] = useState('');
  const [filterMember, setFilterMember] = useState('');
  const [inputModal, setInputModal] = useState<{ type: 'cat' | 'pay' | 'bank'; defaultValue?: string } | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'value' | 'desc' | 'cat' | 'member'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchAll, setSearchAll] = useState(false);
  const [colsMenuOpen, setColsMenuOpen] = useState(false);

  const DEFAULT_COLUMNS = ['desc', 'cat', 'value', 'date', 'payment', 'bank', 'member', 'actions'];
  const visibleCols = state.tableColumns || DEFAULT_COLUMNS;

  const allColumns: { id: string; label: string; sortable?: 'desc' | 'value' | 'cat' | 'date' | 'member' }[] = [
    { id: 'desc', label: 'Descrição', sortable: 'desc' },
    { id: 'cat', label: 'Categoria', sortable: 'cat' },
    { id: 'value', label: 'Valor', sortable: 'value' },
    { id: 'date', label: 'Data', sortable: 'date' },
    { id: 'payment', label: 'Pagamento' },
    { id: 'bank', label: 'Instituição' },
    { id: 'member', label: 'Membro', sortable: 'member' },
    { id: 'actions', label: 'Ações' },
  ];

  function toggleColumn(colId: string) {
    const current = [...visibleCols];
    if (current.includes(colId)) {
      if (colId === 'desc' || colId === 'value' || colId === 'actions') return;
      setState(prev => ({ ...prev, tableColumns: current.filter(c => c !== colId) }));
    } else {
      const originalIdx = DEFAULT_COLUMNS.indexOf(colId);
      const newCols = [...current];
      let insertAt = newCols.length;
      for (let i = 0; i < newCols.length; i++) {
        if (DEFAULT_COLUMNS.indexOf(newCols[i]) > originalIdx) { insertAt = i; break; }
      }
      newCols.splice(insertAt, 0, colId);
      setState(prev => ({ ...prev, tableColumns: newCols }));
    }
  }

  function moveColumn(colId: string, direction: 'up' | 'down') {
    const current = [...visibleCols];
    const idx = current.indexOf(colId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= current.length) return;
    current.splice(idx, 1);
    current.splice(newIdx, 0, colId);
    setState(prev => ({ ...prev, tableColumns: current }));
  }

  const { toast } = useToast();

  const allExpenseCats = [...EXPENSE_CATS, ...(state.customCats || [])];
  const allPayments = [...BASE_PAYMENTS, ...(state.customPayments || [])];
  const allBanks = [...BASE_BANKS, ...(state.customBanks || [])];
  const individuals = getIndividualMembers();
  const conjuntas = members.filter(m => m.id !== 'all' && m.isConjunta);

  function openPanel(type?: 'expense' | 'income') {
    form.clearForm();
    if (type) form.switchType(type);
    setPanelOpen(true);
  }

  function closePanel() {
    form.clearForm();
    setPanelOpen(false);
  }

  function handleSave() {
    if (!form.desc.trim()) return toast('Digite a descrição.', 'warning');
    const val = parseFloat(form.value);
    if (!val || val <= 0) return toast('Digite um valor válido.', 'warning');
    if (!form.month) return toast('Selecione o mês.', 'warning');

    const selectedMember = members.find(m => m.id === form.memberId);
    const isConjunta = selectedMember?.isConjunta && form.formType === 'expense';

    if (isConjunta && individuals.length === 0) {
      return toast('Nenhum membro individual cadastrado.', 'warning');
    }

    form.handleSave({
      onSuccess: () => {
        const msg = form.editingId ? 'Lançamento atualizado!' :
          isConjunta ? 'Despesa conjunta salva com sucesso!' :
          'Lançamento salvo com sucesso!';
        toast(msg, 'success');
        closePanel();
      },
    });
  }

  function handleStartEdit(e: Parameters<typeof form.startEdit>[0]) {
    form.startEdit(e);
    setPanelOpen(true);
  }

  const filteredExpenses = useMemo(() => {
    let list = searchAll && search
      ? expenses.filter(e => activeMember === 'all' || e.memberId === activeMember || (!e.memberId || e.memberId === 'all'))
      : getExpensesForMonth(activeMonth, activeMember);
    if (search) list = list.filter(e => e.desc.toLowerCase().includes(search.toLowerCase()) || e.cat.toLowerCase().includes(search.toLowerCase()));
    if (filterCat) list = list.filter(e => e.cat === filterCat);
    if (filterPay) list = list.filter(e => e.payment === filterPay);
    if (filterMember) list = list.filter(e => e.memberId === filterMember);

    return list.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'value': cmp = a.value - b.value; break;
        case 'desc': cmp = a.desc.localeCompare(b.desc); break;
        case 'cat': cmp = a.cat.localeCompare(b.cat); break;
        case 'member': cmp = (a.memberId || '').localeCompare(b.memberId || ''); break;
        default: cmp = (a.createdAt || 0) - (b.createdAt || 0);
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [activeMonth, activeMember, expenses, search, searchAll, filterCat, filterPay, filterMember, sortBy, sortDir, getExpensesForMonth]);

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  function sortIcon(col: typeof sortBy) {
    if (sortBy !== col) return ' ↕';
    return sortDir === 'desc' ? ' ↓' : ' ↑';
  }

  const catOptions = form.formType === 'income' ? INCOME_CATS : allExpenseCats;

  const inputClass = "w-full px-3 py-2.5 border rounded-lg text-sm t-input focus:outline-none focus:ring-2 focus:ring-blue-100";

  return (
    <>
      {/* Table */}
      <div className="t-card rounded-xl border overflow-hidden">
        <div className="p-4 border-b t-border flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">
            {searchAll && search ? 'Busca em Todos os Meses' : 'Lançamentos do Mês'}
            {filteredExpenses.length > 0 && <span className="font-normal t-text-dim ml-1.5">({filteredExpenses.length})</span>}
          </h3>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
                className="w-40 px-3 py-1.5 border rounded-lg text-[0.82rem] t-input pr-8" />
              <button
                onClick={() => setSearchAll(!searchAll)}
                title={searchAll ? 'Buscar apenas no mês' : 'Buscar em todos os meses'}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 text-[0.7rem] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${searchAll ? 't-accent-bg text-white' : 'bg-slate-100 t-text-dim hover:bg-slate-200'}`}
              >
                <Search size={12} />
              </button>
            </div>
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
            {filteredExpenses.length > 0 && (
              <button onClick={() => {
                const headers = ['Descrição', 'Tipo', 'Categoria', 'Valor', 'Data', 'Pagamento', 'Instituição', 'Membro', 'Observação'];
                const rows = filteredExpenses.map(e => {
                  const member = members.find(m => m.id === e.memberId);
                  return [
                    e.desc,
                    e.type === 'income' ? 'Receita' : 'Despesa',
                    e.cat,
                    e.value.toFixed(2).replace('.', ','),
                    e.purchaseDate ? e.purchaseDate.split('-').reverse().join('/') : '',
                    e.payment,
                    e.bank || '',
                    member?.name || 'Família',
                    e.note || '',
                  ];
                });
                exportToCSV(headers, rows, `lancamentos-${activeMonth}`);
                toast('CSV exportado!', 'success');
              }}
                className="px-4 py-2.5 md:py-1.5 border t-border rounded-lg text-sm font-semibold t-text hover:opacity-80 transition-colors cursor-pointer min-h-[44px] md:min-h-0 flex items-center gap-1.5">
                <Download size={14} /> CSV
              </button>
            )}
          </div>
        </div>
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-16 t-text-dim">
            <div className="mb-3 flex justify-center"><BarChart3 size={40} className="t-text-dim" /></div>
            <p className="text-sm mb-4">Nenhum lancamento encontrado neste mes.</p>
            <button onClick={() => openPanel()} className="px-5 py-2 t-accent-bg text-white rounded-lg text-sm font-semibold cursor-pointer">
              + Novo Lançamento
            </button>
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="md:hidden divide-y t-border">
              {filteredExpenses.map(e => {
                const member = members.find(m => m.id === e.memberId) || { id: 'all', name: 'Família', color: '#2563eb' };
                const isIncome = e.type === 'income';
                return (
                  <div key={e.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm t-text truncate">{e.desc}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[0.7rem] font-semibold ${isIncome ? 'bg-green-100 text-green-700' : e.conjuntaGroupId ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                            {isIncome ? 'Receita' : e.conjuntaGroupId ? 'Conjunta' : 'Despesa'}
                          </span>
                          <span className="text-xs t-text-dim flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-full" style={{ background: CAT_COLORS[e.cat] || '#94a3b8' }} />
                            {e.cat}
                          </span>
                        </div>
                      </div>
                      <span className={`font-bold text-sm flex-shrink-0 ml-3 ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                        {isIncome ? '+' : '-'} {fmt(e.value)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs t-text-dim">
                        <span className="inline-flex items-center gap-1">
                          <Avatar member={member} size={16} />
                          {member.name}
                        </span>
                        {e.purchaseDate && <span>{e.purchaseDate.split('-').reverse().join('/')}</span>}
                        {!isIncome && e.payment !== '-' && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[0.7rem]">{e.payment}</span>}
                        {e.installment > 0 && <span>{e.installmentCurrent || 1}/{e.installment}x</span>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleStartEdit(e)} className="px-2.5 py-1.5 border t-border rounded-lg text-[0.75rem] font-semibold t-card-hover cursor-pointer">Editar</button>
                        <button onClick={() => onDeleteRequest(e.id)} className="px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-[0.75rem] font-semibold hover:bg-red-100 cursor-pointer">Excluir</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: tabela com colunas configuráveis */}
            <div className="hidden md:block overflow-x-auto">
              <div className="flex justify-end px-4 py-2 border-b t-border">
                <div className="relative">
                  <button onClick={() => setColsMenuOpen(!colsMenuOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.72rem] font-semibold t-text-dim hover:t-text cursor-pointer transition-colors border t-border">
                    <SlidersHorizontal size={12} /> Colunas
                  </button>
                  {colsMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-[998]" onClick={() => setColsMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 t-card border rounded-lg shadow-lg z-[999] p-2 min-w-[220px]">
                        <div className="text-[0.68rem] t-text-dim font-semibold uppercase mb-1.5 px-2">Colunas visíveis</div>
                        {visibleCols.map((colId, idx) => {
                          const col = allColumns.find(c => c.id === colId);
                          if (!col) return null;
                          const required = colId === 'desc' || colId === 'value' || colId === 'actions';
                          return (
                            <div key={colId} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-50">
                              <input type="checkbox" checked disabled={required}
                                onChange={() => toggleColumn(colId)}
                                className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer flex-shrink-0" />
                              <span className="text-[0.8rem] t-text flex-1">{col.label}</span>
                              <div className="flex gap-0.5 flex-shrink-0">
                                <button onClick={() => moveColumn(colId, 'up')} disabled={idx === 0}
                                  className="w-5 h-5 rounded flex items-center justify-center text-[0.7rem] t-text-dim hover:t-text cursor-pointer disabled:opacity-20 disabled:cursor-default">▲</button>
                                <button onClick={() => moveColumn(colId, 'down')} disabled={idx === visibleCols.length - 1}
                                  className="w-5 h-5 rounded flex items-center justify-center text-[0.7rem] t-text-dim hover:t-text cursor-pointer disabled:opacity-20 disabled:cursor-default">▼</button>
                                {!required && (
                                  <button onClick={() => toggleColumn(colId)}
                                    className="w-5 h-5 rounded flex items-center justify-center text-[0.7rem] text-red-400 hover:text-red-600 cursor-pointer">✕</button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {allColumns.filter(c => !visibleCols.includes(c.id)).length > 0 && (
                          <>
                            <div className="text-[0.68rem] t-text-dim font-semibold uppercase mt-2 mb-1 px-2">Ocultas</div>
                            {allColumns.filter(c => !visibleCols.includes(c.id)).map(col => (
                              <div key={col.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 opacity-50">
                                <input type="checkbox" checked={false}
                                  onChange={() => toggleColumn(col.id)}
                                  className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer flex-shrink-0" />
                                <span className="text-[0.8rem] t-text flex-1">{col.label}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <table className="w-full">
                <thead>
                  <tr>
                    {visibleCols.map(colId => {
                      const col = allColumns.find(c => c.id === colId);
                      if (!col) return null;
                      const thClass = "px-4 py-2.5 text-left text-[0.75rem] font-semibold uppercase tracking-wide t-text-muted border-b t-border";
                      if (col.sortable) {
                        return <th key={col.id} onClick={() => toggleSort(col.sortable!)} className={`${thClass} cursor-pointer hover:t-text select-none`}>{col.label}{sortIcon(col.sortable!)}</th>;
                      }
                      return <th key={col.id} className={thClass}>{col.label}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map(e => {
                    const member = members.find(m => m.id === e.memberId) || { id: 'all', name: 'Família', color: '#2563eb' };
                    const isIncome = e.type === 'income';

                    const cellRenderers: Record<string, React.ReactNode> = {
                      desc: (
                        <td key="desc" className="px-4 py-2.5 border-b t-border-light">
                          <div className="font-semibold text-[0.83rem]">{e.desc}
                            {e.conjuntaName && <span className="text-[0.72rem] t-text-dim font-normal ml-1">via {e.conjuntaName}</span>}
                          </div>
                          {e.note && <div className="text-[0.74rem] t-text-dim">{e.note}</div>}
                        </td>
                      ),
                      cat: (
                        <td key="cat" className="px-4 py-2.5 border-b t-border-light text-[0.83rem]">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[0.72rem] font-semibold mr-1 ${isIncome ? 'bg-green-100 text-green-700' : e.conjuntaGroupId ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                            {isIncome ? 'Receita' : e.conjuntaGroupId ? 'Conjunta' : 'Despesa'}
                          </span>
                          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: CAT_COLORS[e.cat] || '#94a3b8' }}></span>
                          {e.cat}
                        </td>
                      ),
                      value: (
                        <td key="value" className={`px-4 py-2.5 border-b t-border-light ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                          <div className="font-bold text-[0.83rem]">{isIncome ? '+' : '-'} {fmt(e.value)}</div>
                          {e.installment > 0 && <div className="text-[0.7rem] t-text-dim font-normal">Parcela {e.installmentCurrent || 1}/{e.installment}</div>}
                        </td>
                      ),
                      date: (
                        <td key="date" className="px-4 py-2.5 border-b t-border-light text-[0.83rem] t-text-muted">
                          {e.purchaseDate ? e.purchaseDate.split('-').reverse().join('/') : '-'}
                        </td>
                      ),
                      payment: (
                        <td key="payment" className="px-4 py-2.5 border-b t-border-light text-[0.83rem]">
                          {isIncome ? '-' : <span className="px-2 py-0.5 rounded-full text-[0.72rem] font-semibold bg-slate-100">{e.payment}</span>}
                        </td>
                      ),
                      bank: (
                        <td key="bank" className="px-4 py-2.5 border-b t-border-light text-[0.83rem]">
                          {e.bank || <span className="t-text-dim">-</span>}
                        </td>
                      ),
                      member: (
                        <td key="member" className="px-4 py-2.5 border-b t-border-light text-[0.83rem]">
                          <span className="inline-flex items-center gap-1.5">
                            <Avatar member={member} size={20} />
                            {member.name}
                          </span>
                        </td>
                      ),
                      actions: (
                        <td key="actions" className="px-4 py-2.5 border-b t-border-light">
                          <button onClick={() => handleStartEdit(e)} className="px-2.5 py-1 border t-border rounded-lg text-[0.78rem] font-semibold t-card-hover mr-1 cursor-pointer">Editar</button>
                          <button onClick={() => onDeleteRequest(e.id)} className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-[0.78rem] font-semibold hover:bg-red-100 cursor-pointer">Excluir</button>
                        </td>
                      ),
                    };

                    return (
                      <tr key={e.id} className="t-row">
                        {visibleCols.map(colId => cellRenderers[colId] || null)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal compacto */}
      {panelOpen && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center" onClick={e => { if (e.target === e.currentTarget) closePanel(); }}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-md t-card rounded-t-2xl md:rounded-2xl shadow-2xl border overflow-hidden max-h-[85vh] flex flex-col animate-modal-in">
            <div className="flex items-center justify-between px-5 py-3.5 border-b t-border flex-shrink-0">
              <h3 className="text-base font-bold t-text">{form.editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
              <button onClick={closePanel} className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 t-text-dim cursor-pointer">
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
                <input type="date" value={form.purchaseDate} onChange={e => form.setPurchaseDate(e.target.value)} className={inputClass} />
                <select value={form.memberId} onChange={e => form.setMemberId(e.target.value)} className={inputClass}>
                  <option value="all" disabled={form.formType === 'income'}>Família</option>
                  {individuals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  {conjuntas.map(m => <option key={m.id} value={m.id}>{m.name} (conj.)</option>)}
                </select>
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
                    <>
                      <input type="number" value={form.installmentCurrent} onChange={e => form.setInstallmentCurrent(Number(e.target.value))} min={1} max={60}
                        className="w-14 px-2 py-1.5 border rounded-lg text-sm t-input" />
                      <span className="text-xs t-text-dim">de</span>
                      <input type="number" value={form.installmentN} onChange={e => form.setInstallmentN(Number(e.target.value))} min={2} max={60}
                        className="w-14 px-2 py-1.5 border rounded-lg text-sm t-input" />
                    </>
                  )}
                </div>
              )}

              {form.formType === 'expense' && !form.editingId && !form.isInstallment && (
                <div className="flex items-center gap-3">
                  <label className="toggle-switch">
                    <input type="checkbox" checked={form.isRecurring} onChange={e => form.setIsRecurring(e.target.checked)} />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="text-sm t-text">Recorrente (mensal)</span>
                  {form.isRecurring && (
                    <>
                      <span className="text-xs t-text-dim">dia</span>
                      <input type="number" value={form.recurringDay} onChange={e => form.setRecurringDay(Number(e.target.value))} min={1} max={28}
                        className="w-14 px-2 py-1.5 border rounded-lg text-sm t-input" />
                    </>
                  )}
                </div>
              )}

              <input type="text" value={form.note} onChange={e => form.setNote(e.target.value)} placeholder="Observação (opcional)" className={inputClass} />
            </div>

            <div className="px-5 py-3.5 border-t t-border flex-shrink-0">
              <button onClick={handleSave} disabled={form.saving}
                className="w-full py-2.5 t-accent-bg text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
                {form.saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {form.saving ? 'Salvando...' : form.editingId ? 'Atualizar' : 'Salvar'}
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
            toast(`Categoria "${name}" criada!`, 'success');
          } else if (inputModal?.type === 'pay') {
            setState(prev => ({ ...prev, customPayments: [...(prev.customPayments || []), name] }));
            form.setPayment(name);
            toast(`Forma de pagamento "${name}" criada!`, 'success');
          } else if (inputModal?.type === 'bank') {
            setState(prev => ({ ...prev, customBanks: [...(prev.customBanks || []), name] }));
            form.setBank(name);
            toast(`Instituição "${name}" adicionada!`, 'success');
          }
        }}
        title={inputModal?.type === 'cat' ? 'Nova Categoria' : inputModal?.type === 'pay' ? 'Nova Forma de Pagamento' : 'Nova Instituição Financeira'}
        placeholder={inputModal?.type === 'cat' ? 'Nome da categoria...' : inputModal?.type === 'pay' ? 'Nome da forma de pagamento...' : 'Nome da instituição...'}
      />
    </>
  );
}
