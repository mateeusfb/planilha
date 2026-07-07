'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { fmt, fmtMonth } from '@/lib/helpers';
import { CAT_COLORS } from '@/lib/constants';
import { CheckCircle2, Clock, ArrowRightCircle, Trash2, Search, Sparkles, ChevronDown, X } from 'lucide-react';
import { useToast } from './Toast';
import { Avatar } from './Sidebar';
import type { Expense, PaidStatus } from '@/lib/types';

type FilterTab = 'pending' | 'paid' | 'postponed' | 'all';

export default function ClosingPage({ onDeleteRequest }: { onDeleteRequest: (id: string) => void }) {
  const { state, getOutflows, markExpenseStatus, postponeExpense } = useStore();
  const { activeMonth, activeMember, members } = state;
  const { toast } = useToast();

  const [tab, setTab] = useState<FilterTab>('pending');
  const [search, setSearch] = useState('');
  const [postponeModal, setPostponeModal] = useState<{ expense: Expense } | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const outflows = useMemo(
    () => getOutflows(activeMonth, activeMember),
    [getOutflows, activeMonth, activeMember]
  );

  const totals = useMemo(() => {
    const t = { pending: 0, paid: 0, postponed: 0, pendingCount: 0, paidCount: 0, postponedCount: 0, total: outflows.length };
    for (const e of outflows) {
      const s = e.paidStatus || 'paid';
      if (s === 'pending') { t.pending += e.value; t.pendingCount++; }
      else if (s === 'paid') { t.paid += e.value; t.paidCount++; }
      else if (s === 'postponed') { t.postponed += e.value; t.postponedCount++; }
    }
    return t;
  }, [outflows]);

  const reviewed = totals.paidCount + totals.postponedCount;
  const progressPct = totals.total > 0 ? Math.round((reviewed / totals.total) * 100) : 0;

  const filtered = useMemo(() => {
    return outflows.filter(e => {
      const s = e.paidStatus || 'paid';
      if (tab !== 'all' && s !== tab) return false;
      if (search && !e.desc.toLowerCase().includes(search.toLowerCase()) && !e.cat.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [outflows, tab, search]);

  // Agrupar por categoria
  const grouped = useMemo(() => {
    const map: Record<string, Expense[]> = {};
    for (const e of filtered) {
      const k = e.cat || 'Outros';
      (map[k] = map[k] || []).push(e);
    }
    return Object.entries(map).sort(([, a], [, b]) => {
      const sa = a.reduce((s, x) => s + x.value, 0);
      const sb = b.reduce((s, x) => s + x.value, 0);
      return sb - sa;
    });
  }, [filtered]);

  async function handleMarkPaid(e: Expense) {
    await markExpenseStatus(e.id, 'paid');
    toast(`"${e.desc}" marcado como pago`, 'success');
  }

  async function handleMarkPending(e: Expense) {
    await markExpenseStatus(e.id, 'pending');
    toast(`"${e.desc}" voltou para pendente`, 'info');
  }

  function openPostpone(e: Expense) {
    if (e.installmentGroupId && (e.installment || 0) > 0) {
      setPostponeModal({ expense: e });
    } else {
      doPostpone(e, 'one');
    }
  }

  async function doPostpone(e: Expense, scope: 'one' | 'rest') {
    await postponeExpense(e.id, scope);
    setPostponeModal(null);
    const [y, m] = e.month.split('-').map(Number);
    const next = new Date(y, m - 1 + 1, 1);
    const nextLabel = fmtMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
    toast(scope === 'rest' ? `Parcelas restantes adiadas para ${nextLabel}` : `"${e.desc}" adiado para ${nextLabel}`, 'success');
  }

  async function bulkMarkRecurringPaid() {
    const recurringPending = outflows.filter(e =>
      (e.paidStatus || 'paid') === 'pending' && (e.note || '').includes('Recorrente')
    );
    if (recurringPending.length === 0) {
      toast('Não há recorrentes pendentes', 'info');
      return;
    }
    for (const e of recurringPending) {
      await markExpenseStatus(e.id, 'paid');
    }
    toast(`${recurringPending.length} recorrente(s) marcado(s) como pago`, 'success');
  }

  function finishClosing() {
    if (totals.pendingCount > 0) {
      toast(`Ainda há ${totals.pendingCount} item(s) pendente(s) — marque como pago ou adie`, 'warning');
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(`last_closing_${activeMonth}`, new Date().toISOString());
    }
    toast(`Fechamento de ${fmtMonth(activeMonth)} concluído!`, 'success', 4000);
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-base md:text-lg font-bold t-text">Fechamento de {fmtMonth(activeMonth)}</h1>
          <p className="text-xs t-text-muted">Revise tudo que foi gasto e marque o status</p>
        </div>
        <button
          onClick={finishClosing}
          className="px-4 py-2 rounded-lg text-sm font-semibold t-accent-bg hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-2"
          title="Concluir fechamento do mês"
        >
          <Sparkles size={14} /> Concluir fechamento
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatusCard
          icon={<Clock size={18} />}
          label="Pendente"
          count={totals.pendingCount}
          value={totals.pending}
          color="#f59e0b"
          active={tab === 'pending'}
          onClick={() => setTab('pending')}
        />
        <StatusCard
          icon={<CheckCircle2 size={18} />}
          label="Pago"
          count={totals.paidCount}
          value={totals.paid}
          color="#10b981"
          active={tab === 'paid'}
          onClick={() => setTab('paid')}
        />
        <StatusCard
          icon={<ArrowRightCircle size={18} />}
          label="Adiado"
          count={totals.postponedCount}
          value={totals.postponed}
          color="#6366f1"
          active={tab === 'postponed'}
          onClick={() => setTab('postponed')}
        />
      </div>

      {/* Barra de progresso */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold t-text">Progresso da revisão</span>
          <span className="text-xs t-text-muted">{reviewed} de {totals.total} revisados ({progressPct}%)</span>
        </div>
        <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#10b981' : '#6366f1' }}
          />
        </div>
      </div>

      {/* Filtros e bulk action */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 t-text-dim" />
          <input
            type="text"
            placeholder="Buscar por descrição ou categoria..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg t-card border t-border text-sm"
          />
        </div>
        <button
          onClick={() => setTab('all')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            tab === 'all' ? 't-accent-bg' : 't-card border t-border hover:opacity-80'
          }`}
        >
          Ver tudo
        </button>
        <button
          onClick={bulkMarkRecurringPaid}
          className="px-3 py-2 rounded-lg text-xs font-semibold t-card border t-border hover:opacity-80 transition-opacity cursor-pointer"
          title="Marca todas as despesas com 'Recorrente' como pagas"
        >
          ✓ Recorrentes pagas
        </button>
      </div>

      {/* Lista agrupada */}
      {grouped.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-sm t-text-muted">
            {tab === 'pending' && '🎉 Tudo revisado! Nenhuma despesa pendente.'}
            {tab === 'paid' && 'Nenhuma despesa marcada como paga ainda.'}
            {tab === 'postponed' && 'Nenhuma despesa adiada.'}
            {tab === 'all' && 'Nenhuma despesa neste mês.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(([cat, items]) => {
            const sum = items.reduce((s, e) => s + e.value, 0);
            const isCollapsed = collapsed[cat];
            const color = CAT_COLORS[cat as keyof typeof CAT_COLORS] || '#6b7280';
            return (
              <div key={cat} className="glass-card rounded-xl overflow-hidden">
                <button
                  onClick={() => setCollapsed(c => ({ ...c, [cat]: !c[cat] }))}
                  className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-sm font-semibold">{cat}</span>
                    <span className="text-xs t-text-dim">({items.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{fmt(sum)}</span>
                    <ChevronDown size={14} className="t-text-dim transition-transform" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)' }} />
                  </div>
                </button>
                {!isCollapsed && (
                  <div className="border-t t-border divide-y t-divide">
                    {items.map(exp => {
                      const member = members.find(m => m.id === exp.memberId);
                      const status: PaidStatus = exp.paidStatus || 'paid';
                      return (
                        <div key={exp.id} className="px-4 py-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium truncate">{exp.desc}</span>
                              {exp.installment > 0 && (
                                <span className="text-[0.65rem] px-1.5 py-0.5 rounded t-text-dim border t-border">
                                  {exp.installmentCurrent}/{exp.installment}
                                </span>
                              )}
                              {(exp.note || '').includes('Recorrente') && (
                                <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                  Recorrente
                                </span>
                              )}
                              <StatusPill status={status} />
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[0.7rem] t-text-dim">
                              {member && member.id !== 'all' && (
                                <span className="flex items-center gap-1">
                                  <Avatar member={member} size={14} /> {member.name}
                                </span>
                              )}
                              {exp.payment && <span>• {exp.payment}</span>}
                              {exp.bank && <span>• {exp.bank}</span>}
                              {exp.purchaseDate && <span>• {exp.purchaseDate.split('-').reverse().join('/')}</span>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold">{fmt(exp.value)}</div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {status !== 'paid' && (
                              <button
                                onClick={() => handleMarkPaid(exp)}
                                title="Marcar como pago"
                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-green-500/10 text-green-600 dark:text-green-400 transition-colors cursor-pointer"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            )}
                            {status === 'paid' && (
                              <button
                                onClick={() => handleMarkPending(exp)}
                                title="Voltar para pendente"
                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
                              >
                                <Clock size={16} />
                              </button>
                            )}
                            {status !== 'postponed' && (
                              <button
                                onClick={() => openPostpone(exp)}
                                title="Adiar para o próximo mês"
                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                              >
                                <ArrowRightCircle size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => onDeleteRequest(exp.id)}
                              title="Excluir"
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: adiar parcela */}
      {postponeModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4" onClick={() => setPostponeModal(null)}>
          <div className="glass-card rounded-xl p-5 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">Adiar parcela</h3>
              <button onClick={() => setPostponeModal(null)} className="t-text-dim hover:opacity-80 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs t-text-muted mb-4">
              Esta despesa é uma parcela ({postponeModal.expense.installmentCurrent}/{postponeModal.expense.installment}). O que deseja adiar?
            </p>
            <div className="space-y-2">
              <button
                onClick={() => doPostpone(postponeModal.expense, 'one')}
                className="w-full px-4 py-3 rounded-lg t-card border t-border text-left hover:opacity-80 transition-opacity cursor-pointer"
              >
                <div className="text-sm font-semibold">Apenas esta parcela</div>
                <div className="text-xs t-text-dim">As próximas continuam no cronograma original</div>
              </button>
              <button
                onClick={() => doPostpone(postponeModal.expense, 'rest')}
                className="w-full px-4 py-3 rounded-lg t-accent-bg text-left hover:opacity-90 transition-opacity cursor-pointer"
              >
                <div className="text-sm font-semibold">Esta e todas as próximas</div>
                <div className="text-xs opacity-80">Empurra o cronograma inteiro um mês para frente</div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusCard({
  icon, label, count, value, color, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  value: number;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`glass-card rounded-xl p-4 text-left transition-all cursor-pointer hover:scale-[1.02] ${
        active ? 'ring-2' : ''
      }`}
      style={active ? { boxShadow: `0 0 0 2px ${color}` } : undefined}
    >
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-bold">{fmt(value)}</div>
      <div className="text-[0.7rem] t-text-dim mt-0.5">{count} item{count !== 1 ? 's' : ''}</div>
    </button>
  );
}

function StatusPill({ status }: { status: PaidStatus }) {
  if (status === 'pending') {
    return <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">Pendente</span>;
  }
  if (status === 'paid') {
    return <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">Pago</span>;
  }
  return <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">Adiado</span>;
}
