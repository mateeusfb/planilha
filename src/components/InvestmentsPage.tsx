'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { fmt } from '@/lib/helpers';
import type { Investment, InvestmentGoal, InvestmentType } from '@/lib/types';
import { Plus, TrendingUp, TrendingDown, Wallet, Target, PiggyBank, Pencil, Trash2 } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import InvestmentModal from './InvestmentModal';
import InvestmentGoalModal from './InvestmentGoalModal';
import { useToast } from './Toast';
import { usePlan } from '@/lib/plans';
import UpgradeModal from './UpgradeModal';

ChartJS.register(ArcElement, Tooltip, Legend);

const TYPE_CONFIG: Record<InvestmentType, { label: string; color: string }> = {
  renda_fixa: { label: 'Renda Fixa', color: '#2563eb' },
  renda_variavel: { label: 'Renda Variável', color: '#16a34a' },
  crypto: { label: 'Criptomoedas', color: '#f59e0b' },
  previdencia: { label: 'Previdência', color: '#7c3aed' },
  poupanca: { label: 'Poupança', color: '#0891b2' },
  outros: { label: 'Outros', color: '#64748b' },
};

export default function InvestmentsPage() {
  const {
    investments, investmentGoals, state,
    addInvestment, updateInvestment, removeInvestment,
    addGoal, updateGoal, removeGoal,
    getExpensesForMonth,
  } = useStore();

  const { toast } = useToast();
  const { checkGoalLimit, requiredPlanFor } = usePlan();
  const [invModalOpen, setInvModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<Investment | null>(null);
  const [editingGoal, setEditingGoal] = useState<InvestmentGoal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'inv' | 'goal'; id: string } | null>(null);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);

  const data = useMemo(() => {
    const totalInvested = investments.reduce((s, i) => s + i.amountInvested, 0);
    const totalCurrent = investments.reduce((s, i) => s + i.currentValue, 0);
    const totalReturn = totalCurrent - totalInvested;
    const returnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    // Alocação por tipo
    const byType: Record<string, number> = {};
    investments.forEach(inv => {
      byType[inv.type] = (byType[inv.type] || 0) + inv.currentValue;
    });
    const typeLabels = Object.keys(byType).map(t => TYPE_CONFIG[t as InvestmentType]?.label || t);
    const typeData = Object.values(byType);
    const typeColors = Object.keys(byType).map(t => TYPE_CONFIG[t as InvestmentType]?.color || '#94a3b8');

    // Patrimônio = saldo do mês + investimentos
    const { activeMonth } = state;
    const monthEntries = getExpensesForMonth(activeMonth, 'all');
    const incomes = monthEntries.filter(e => e.type === 'income' && e.cat !== 'Investimento');
    const expenses = monthEntries.filter(e => e.type !== 'income' && e.cat !== 'Investimento');
    const saldoMes = incomes.reduce((s, e) => s + e.value, 0) - expenses.reduce((s, e) => s + e.value, 0);
    const patrimonio = saldoMes + totalCurrent;

    return { totalInvested, totalCurrent, totalReturn, returnPct, byType, typeLabels, typeData, typeColors, saldoMes, patrimonio };
  }, [investments, state, getExpensesForMonth]);

  function handleDeleteConfirm() {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'inv') {
      removeInvestment(confirmDelete.id);
      toast('Investimento removido', 'success');
    } else {
      removeGoal(confirmDelete.id);
      toast('Meta removida', 'success');
    }
    setConfirmDelete(null);
  }

  return (
    <>
      {/* ── Resumo da Carteira ── */}
      <div className="mb-4 animate-fade-in-up">
        <h3 className="text-sm font-bold t-text mb-3">Carteira de Investimentos</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="glass-card rounded-xl p-4 md:p-5 animate-fade-in-up stagger-1">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs t-text-muted font-semibold uppercase tracking-wide">Investido</div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <PiggyBank size={16} className="text-blue-500" />
              </div>
            </div>
            <div className="text-lg md:text-2xl font-bold t-text">{fmt(data.totalInvested)}</div>
            <div className="text-xs t-text-dim mt-1">{investments.length} ativo{investments.length !== 1 ? 's' : ''}</div>
          </div>

          <div className="glass-card rounded-xl p-4 md:p-5 animate-fade-in-up stagger-2">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs t-text-muted font-semibold uppercase tracking-wide">Valor Atual</div>
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-green-500" />
              </div>
            </div>
            <div className="text-lg md:text-2xl font-bold text-green-500">{fmt(data.totalCurrent)}</div>
            <div className="text-xs t-text-dim mt-1">Valor de mercado</div>
          </div>

          <div className="glass-card rounded-xl p-4 md:p-5 animate-fade-in-up stagger-3">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs t-text-muted font-semibold uppercase tracking-wide">Retorno</div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${data.totalReturn >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {data.totalReturn >= 0 ? <TrendingUp size={16} className="text-green-500" /> : <TrendingDown size={16} className="text-red-500" />}
              </div>
            </div>
            <div className={`text-lg md:text-2xl font-bold ${data.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {data.totalReturn >= 0 ? '+' : ''}{fmt(data.totalReturn)}
            </div>
            <div className="text-xs mt-1">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[0.65rem] font-bold ${
                data.returnPct >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
              }`}>
                {data.returnPct >= 0 ? '+' : ''}{data.returnPct.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 md:p-5 animate-fade-in-up stagger-4 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs t-text-muted font-semibold uppercase tracking-wide">Patrimônio</div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                <Wallet size={16} style={{ color: 'var(--accent)' }} />
              </div>
            </div>
            <div className="text-lg md:text-2xl font-bold" style={{ color: 'var(--accent)' }}>{fmt(data.patrimonio)}</div>
            <div className="text-xs t-text-dim mt-1">Saldo {fmt(data.saldoMes)} + Investimentos</div>
          </div>
        </div>
      </div>

      {/* ── Alocação + Metas (grid 2 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Donut de alocação */}
        <div className="glass-card rounded-xl p-5 animate-fade-in-up stagger-5">
          <h3 className="text-sm font-bold t-text mb-4">Alocação por Tipo</h3>
          {data.typeLabels.length > 0 ? (
            <div className="h-52">
              <Doughnut
                data={{
                  labels: data.typeLabels,
                  datasets: [{ data: data.typeData, backgroundColor: data.typeColors, borderWidth: 0, borderRadius: 4 }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false, cutout: '70%',
                  animation: { duration: 1000, easing: 'easeOutQuart' },
                  plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12, usePointStyle: true, pointStyle: 'circle' } } },
                }}
              />
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center t-text-dim text-sm">
              Adicione investimentos para ver a alocação
            </div>
          )}
        </div>

        {/* Metas */}
        <div className="glass-card rounded-xl p-5 animate-fade-in-up stagger-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold t-text flex items-center gap-2"><Target size={16} /> Metas</h3>
            <button onClick={() => {
              const blocked = checkGoalLimit(investmentGoals.length);
              if (blocked) { setUpgradeMessage(blocked); return; }
              setEditingGoal(null); setGoalModalOpen(true);
            }}
              className="text-xs t-accent hover:opacity-70 cursor-pointer flex items-center gap-1 font-semibold">
              <Plus size={14} /> Nova Meta
            </button>
          </div>
          {investmentGoals.length > 0 ? (
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {investmentGoals.map(goal => {
                const pct = goal.targetValue > 0 ? Math.min((goal.currentValue / goal.targetValue) * 100, 100) : 0;
                const color = pct >= 100 ? '#10b981' : pct >= 60 ? '#f59e0b' : 'var(--accent)';
                return (
                  <div key={goal.id} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{goal.icon}</span>
                        <span className="text-sm font-medium t-text">{goal.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color }}>{Math.round(pct)}%</span>
                        <button onClick={() => { setEditingGoal(goal); setGoalModalOpen(true); }}
                          className="opacity-0 group-hover:opacity-100 cursor-pointer t-text-dim hover:t-text transition-opacity"><Pencil size={12} /></button>
                        <button onClick={() => setConfirmDelete({ type: 'goal', id: goal.id })}
                          className="opacity-0 group-hover:opacity-100 cursor-pointer text-red-400 hover:text-red-500 transition-opacity"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full animate-progress" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <div className="flex justify-between text-[0.7rem] t-text-dim mt-0.5">
                      <span>{fmt(goal.currentValue)} / {fmt(goal.targetValue)}</span>
                      {goal.deadline && <span>Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center t-text-dim text-sm gap-2">
              <Target size={24} className="opacity-40" />
              Defina metas para acompanhar seu progresso
            </div>
          )}
        </div>
      </div>

      {/* ── Lista de Ativos ── */}
      <div className="glass-card rounded-xl p-5 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold t-text">Meus Ativos</h3>
          <button onClick={() => { setEditingInv(null); setInvModalOpen(true); }}
            className="px-3 py-1.5 t-accent-bg text-white text-xs font-semibold rounded-lg cursor-pointer hover:opacity-90 flex items-center gap-1.5">
            <Plus size={14} /> Novo Investimento
          </button>
        </div>

        {investments.length > 0 ? (
          <div className="space-y-2">
            {investments.map(inv => {
              const ret = inv.currentValue - inv.amountInvested;
              const retPct = inv.amountInvested > 0 ? (ret / inv.amountInvested) * 100 : 0;
              const pctCarteira = data.totalCurrent > 0 ? (inv.currentValue / data.totalCurrent) * 100 : 0;
              const config = TYPE_CONFIG[inv.type];
              return (
                <div key={inv.id} className="group flex items-center gap-3 p-3 rounded-lg t-card-hover hover:bg-[var(--bg-card-hover)] transition-colors">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${config.color}15` }}>
                    <TrendingUp size={16} style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold t-text truncate">{inv.name}</span>
                      <span className="text-[0.6rem] px-1.5 py-px rounded-full font-semibold flex-shrink-0" style={{ background: `${config.color}15`, color: config.color }}>
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[0.72rem] t-text-dim">
                      <span>Investido: {fmt(inv.amountInvested)}</span>
                      <span>{pctCarteira.toFixed(0)}% da carteira</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold t-text">{fmt(inv.currentValue)}</div>
                    <div className={`text-[0.72rem] font-semibold ${ret >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {ret >= 0 ? '+' : ''}{fmt(ret)} ({retPct >= 0 ? '+' : ''}{retPct.toFixed(1)}%)
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => { setEditingInv(inv); setInvModalOpen(true); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer t-text-dim hover:t-text"><Pencil size={13} /></button>
                    <button onClick={() => setConfirmDelete({ type: 'inv', id: inv.id })}
                      className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer text-red-400 hover:text-red-500"><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center t-text-dim text-sm">
            <PiggyBank size={32} className="mx-auto mb-3 opacity-40" />
            <p>Nenhum investimento cadastrado</p>
            <p className="text-xs mt-1">Adicione seus ativos para acompanhar sua carteira</p>
          </div>
        )}
      </div>

      {/* ── Modais ── */}
      <InvestmentModal
        isOpen={invModalOpen}
        onClose={() => { setInvModalOpen(false); setEditingInv(null); }}
        editing={editingInv}
        onSave={async (d) => {
          if (editingInv) {
            await updateInvestment(editingInv.id, d);
            toast('Investimento atualizado', 'success');
          } else {
            await addInvestment(d);
            toast('Investimento adicionado', 'success');
          }
        }}
      />

      <InvestmentGoalModal
        isOpen={goalModalOpen}
        onClose={() => { setGoalModalOpen(false); setEditingGoal(null); }}
        editing={editingGoal}
        onSave={async (d) => {
          if (editingGoal) {
            await updateGoal(editingGoal.id, d);
            toast('Meta atualizada', 'success');
          } else {
            await addGoal(d);
            toast('Meta criada', 'success');
          }
        }}
      />

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDelete(null)} />
          <div className="relative w-full max-w-sm border t-border rounded-2xl shadow-2xl animate-modal-in p-6 text-center" style={{ background: 'var(--bg-elevated)' }}>
            <h3 className="text-sm font-bold t-text mb-2">Confirmar exclusão</h3>
            <p className="text-xs t-text-muted mb-4">Tem certeza que deseja remover este {confirmDelete.type === 'inv' ? 'investimento' : 'meta'}?</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-lg border t-border text-sm font-medium t-text cursor-pointer hover:opacity-80">Cancelar</button>
              <button onClick={handleDeleteConfirm}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold cursor-pointer hover:bg-red-600">Remover</button>
            </div>
          </div>
        </div>
      )}
      {upgradeMessage && (
        <UpgradeModal
          message={upgradeMessage}
          requiredPlan={requiredPlanFor('goals')}
          onClose={() => setUpgradeMessage(null)}
          onGoToPlans={() => setUpgradeMessage(null)}
        />
      )}
    </>
  );
}
