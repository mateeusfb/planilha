'use client';

import { useState } from 'react';
import { EXPENSE_CATS, BASE_PAYMENTS, BASE_BANKS } from '@/lib/constants';
import type { Member, Workspace, RecurringExpense } from '@/lib/types';
import { Tag, CreditCard, Landmark, Users, FolderOpen, ChevronDown, Target, Repeat } from 'lucide-react';
import ItemPill from './ItemPill';
import { fmt } from '@/lib/helpers';
import { CAT_COLORS } from '@/lib/constants';

type CatTabId = 'cats' | 'pays' | 'banks' | 'members' | 'workspaces' | 'budgets' | 'recurring';

interface Props {
  catTab: CatTabId;
  setCatTab: (t: CatTabId) => void;
  customCats: string[]; customPays: string[]; customBanks: string[];
  addCat: () => void; editCat: (i: number) => void; deleteCat: (i: number) => void;
  addPay: () => void; editPay: (i: number) => void; deletePay: (i: number) => void;
  addBank: () => void; editBank: (i: number) => void; deleteBank: (i: number) => void;
  members: Member[]; onAddMember: () => void; onEditMember: (id: string) => void; onDeleteMember: (id: string) => void;
  workspaces?: Workspace[]; activeWorkspace?: Workspace;
  onDeleteWorkspace?: (ws: Workspace) => void;
  categoryBudgets?: Record<string, number>;
  onBudgetChange?: (cat: string, value: number) => void;
  recurringExpenses?: RecurringExpense[];
  onToggleRecurring?: (id: string, active: boolean) => void;
  onDeleteRecurring?: (id: string) => void;
}

export default function CategoriesBlock({ catTab, setCatTab, customCats, customPays, customBanks,
  addCat, editCat, deleteCat, addPay, editPay, deletePay, addBank, editBank, deleteBank,
  members, onAddMember, onEditMember, onDeleteMember,
  workspaces = [], activeWorkspace, onDeleteWorkspace,
  categoryBudgets = {}, onBudgetChange,
  recurringExpenses = [], onToggleRecurring, onDeleteRecurring,
}: Props) {
  const [open, setOpen] = useState(false);

  const tabs: { id: CatTabId; label: string; icon: React.ReactNode }[] = [
    { id: 'cats', label: 'Despesas', icon: <Tag size={14} /> },
    { id: 'pays', label: 'Pagamento', icon: <CreditCard size={14} /> },
    { id: 'banks', label: 'Instituições', icon: <Landmark size={14} /> },
    { id: 'members', label: 'Membros', icon: <Users size={14} /> },
    { id: 'budgets', label: 'Orçamento', icon: <Target size={14} /> },
    { id: 'recurring', label: 'Recorrentes', icon: <Repeat size={14} /> },
    ...(workspaces.filter(w => w.isOwn && w.id !== 'personal').length > 0
      ? [{ id: 'workspaces' as CatTabId, label: 'Espaços', icon: <FolderOpen size={14} /> }]
      : []),
  ];

  const defaults: Record<string, string[]> = {
    cats: EXPENSE_CATS,
    pays: BASE_PAYMENTS,
    banks: BASE_BANKS,
  };

  const customs: Record<string, string[]> = { cats: customCats, pays: customPays, banks: customBanks };
  const addFn: Record<string, () => void> = { cats: addCat, pays: addPay, banks: addBank };
  const editFn: Record<string, (i: number) => void> = { cats: editCat, pays: editPay, banks: editBank };
  const deleteFn: Record<string, (i: number) => void> = { cats: deleteCat, pays: deletePay, banks: deleteBank };
  const addLabels: Record<string, string> = { cats: '+ Nova categoria', pays: '+ Nova forma', banks: '+ Nova instituição' };

  const isPillTab = catTab === 'cats' || catTab === 'pays' || catTab === 'banks';

  return (
    <div className="t-card rounded-xl border mb-6 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer hover:opacity-80 transition-colors">
        <h3 className="text-sm font-bold t-text">Categorias</h3>
        <ChevronDown size={14} className="t-text-dim transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {open && (
        <div className="px-5 pb-5">
          {/* Tabs */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setCatTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  catTab === t.id ? 't-accent-bg text-white shadow-sm' : 'bg-slate-100 t-text-muted hover:bg-slate-200'
                }`}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Pills content (cats, pays, banks) */}
          {isPillTab && (
            <>
              <div className="mb-3">
                <div className="text-[0.7rem] t-text-dim font-semibold mb-1.5">PADRÃO</div>
                <div className="flex flex-wrap gap-1.5">
                  {defaults[catTab].map(item => (
                    <span key={item} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs">{item}</span>
                  ))}
                </div>
              </div>

              {customs[catTab].length > 0 && (
                <div className="mb-3">
                  <div className="text-[0.7rem] t-text-dim font-semibold mb-1.5">PERSONALIZADAS</div>
                  <div className="flex flex-wrap gap-1.5">
                    {customs[catTab].map((item, i) => (
                      <ItemPill key={i} label={item} onEdit={() => editFn[catTab](i)} onDelete={() => deleteFn[catTab](i)} />
                    ))}
                  </div>
                </div>
              )}

              <button onClick={addFn[catTab]}
                className="px-2.5 py-1 border border-dashed border-slate-300 rounded-full text-xs font-semibold t-text-dim hover:border-slate-400 hover:t-text cursor-pointer transition-colors">
                {addLabels[catTab]}
              </button>
            </>
          )}

          {/* Members */}
          {catTab === 'members' && (
            <>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {members.map(m => (
                  <ItemPill key={m.id} label={m.name} onEdit={() => onEditMember(m.id)} onDelete={() => onDeleteMember(m.id)} />
                ))}
              </div>
              <button onClick={onAddMember}
                className="px-2.5 py-1 border border-dashed border-slate-300 rounded-full text-xs font-semibold t-text-dim hover:border-slate-400 hover:t-text cursor-pointer transition-colors">
                + Adicionar membro
              </button>
            </>
          )}

          {/* Budgets */}
          {catTab === 'budgets' && (
            <>
              <p className="text-xs t-text-dim mb-3">Defina um limite mensal para cada categoria. Você verá o progresso no Dashboard.</p>
              <div className="space-y-2">
                {[...EXPENSE_CATS, ...customCats].filter(c => c !== 'Investimento').map(cat => {
                  const current = categoryBudgets[cat] || 0;
                  const catColor = CAT_COLORS[cat] || '#94a3b8';
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: catColor }} />
                      <span className="text-sm t-text min-w-[100px]">{cat}</span>
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs t-text-dim">R$</span>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={current || ''}
                          onChange={e => onBudgetChange?.(cat, Number(e.target.value) || 0)}
                          placeholder="Sem limite"
                          className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm t-input text-right"
                        />
                      </div>
                      {current > 0 && (
                        <span className="text-xs t-text-dim whitespace-nowrap">{fmt(current)}/mês</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Recurring */}
          {catTab === 'recurring' && (
            <>
              {recurringExpenses.length === 0 ? (
                <p className="text-sm t-text-dim">Nenhuma despesa recorrente cadastrada. Ao criar uma despesa, marque como "Recorrente" para que ela seja lançada automaticamente todo mês.</p>
              ) : (
                <div className="space-y-2">
                  {recurringExpenses.map(r => {
                    const catColor = CAT_COLORS[r.category] || '#94a3b8';
                    return (
                      <div key={r.id} className={`flex items-center gap-3 p-3 rounded-lg border t-border ${!r.active ? 'opacity-50' : ''}`}>
                        <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: catColor }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium t-text truncate">{r.description}</div>
                          <div className="text-xs t-text-dim">{r.category} &middot; {fmt(r.value)} &middot; dia {r.dayOfMonth}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <label className="toggle-switch">
                            <input type="checkbox" checked={r.active} onChange={e => onToggleRecurring?.(r.id, e.target.checked)} />
                            <span className="toggle-slider"></span>
                          </label>
                          <button onClick={() => onDeleteRecurring?.(r.id)}
                            className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[0.72rem] font-semibold hover:bg-red-100 cursor-pointer">
                            Excluir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Workspaces */}
          {catTab === 'workspaces' && (
            <>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {workspaces.filter(w => w.isOwn && w.id !== 'personal').map(ws => (
                  <ItemPill
                    key={ws.id}
                    label={`${ws.icon} ${ws.label}${activeWorkspace?.id === ws.id ? ' (ativo)' : ''}`}
                    onEdit={() => {}}
                    onDelete={() => onDeleteWorkspace?.(ws)}
                  />
                ))}
              </div>
              <p className="text-xs t-text-dim">O espaço "Pessoal" não pode ser excluído.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
