'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { fmt, fmtMonth } from '@/lib/helpers';
import type { Investment, InvestmentGoal, InvestmentType } from '@/lib/types';
import { Plus, TrendingUp, TrendingDown, Wallet, Target, PiggyBank, Pencil, Trash2, RefreshCw, Check, X as XIcon, AlertTriangle, ArrowUpDown, Download, Clock } from 'lucide-react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, PointElement, LineElement, Filler,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import InvestmentModal from './InvestmentModal';
import InvestmentGoalModal from './InvestmentGoalModal';
import { useToast } from './Toast';
import { usePlan } from '@/lib/plans';
import UpgradeModal from './UpgradeModal';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

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
    investments, investmentGoals, investmentSnapshots,
    addInvestment, updateInvestment, removeInvestment,
    addGoal, updateGoal, removeGoal, upsertSnapshot,
  } = useStore();

  const { toast } = useToast();
  const { checkGoalLimit, checkInvestmentLimit, requiredPlanFor } = usePlan();
  const [invModalOpen, setInvModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<Investment | null>(null);
  const [editingGoal, setEditingGoal] = useState<InvestmentGoal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'inv' | 'goal'; id: string } | null>(null);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);

  // Batch update state
  const [batchEditing, setBatchEditing] = useState(false);
  const [batchValues, setBatchValues] = useState<Record<string, string>>({});
  const [batchSaving, setBatchSaving] = useState(false);

  // Filter & sort state
  const [filterType, setFilterType] = useState<InvestmentType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'return' | 'pct'>('value');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

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

    // Resumo por tipo
    const byTypeSummary = Object.entries(byType).map(([type, currentVal]) => {
      const invested = investments.filter(i => i.type === type).reduce((s, i) => s + i.amountInvested, 0);
      const ret = currentVal - invested;
      const retPct = invested > 0 ? (ret / invested) * 100 : 0;
      const pct = totalCurrent > 0 ? (currentVal / totalCurrent) * 100 : 0;
      return { type: type as InvestmentType, currentValue: currentVal, amountInvested: invested, return: ret, returnPct: retPct, pct };
    }).sort((a, b) => b.currentValue - a.currentValue);

    // Alertas de concentração (>70% em um único tipo)
    const concentrationWarnings = byTypeSummary
      .filter(t => t.pct > 70)
      .map(t => ({ label: TYPE_CONFIG[t.type]?.label || t.type, pct: t.pct }));

    return { totalInvested, totalCurrent, totalReturn, returnPct, byType, typeLabels, typeData, typeColors, byTypeSummary, concentrationWarnings };
  }, [investments]);

  // Dados do gráfico de evolução
  const evolutionChart = useMemo(() => {
    if (investmentSnapshots.length < 2) return null;
    const sorted = [...investmentSnapshots].sort((a, b) => a.month.localeCompare(b.month));
    return {
      labels: sorted.map(s => fmtMonth(s.month)),
      invested: sorted.map(s => s.totalInvested),
      current: sorted.map(s => s.totalCurrent),
    };
  }, [investmentSnapshots]);

  async function handleDeleteConfirm() {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === 'inv') {
        await removeInvestment(confirmDelete.id);
        toast('Investimento removido', 'success');
      } else {
        await removeGoal(confirmDelete.id);
        toast('Meta removida', 'success');
      }
    } catch {
      toast('Erro ao remover. Tente novamente.', 'error');
    }
    setConfirmDelete(null);
  }

  function startBatchEdit() {
    const initial: Record<string, string> = {};
    investments.forEach(inv => { initial[inv.id] = String(inv.currentValue); });
    setBatchValues(initial);
    setBatchEditing(true);
  }

  async function saveBatchEdit() {
    setBatchSaving(true);
    const changed = investments.filter(inv => {
      const draft = parseFloat(batchValues[inv.id]?.replace(',', '.') || '0');
      return !isNaN(draft) && draft !== inv.currentValue;
    });
    try {
      await Promise.all(changed.map(inv => {
        const newVal = parseFloat(batchValues[inv.id].replace(',', '.'));
        return updateInvestment(inv.id, { currentValue: newVal });
      }));
      setBatchEditing(false);
      if (changed.length > 0) {
        toast(`${changed.length} ativo${changed.length > 1 ? 's' : ''} atualizado${changed.length > 1 ? 's' : ''}`, 'success');
        // Atualizar snapshot do mês atual com os novos totais
        const changedMap = Object.fromEntries(changed.map(inv => [inv.id, parseFloat(batchValues[inv.id].replace(',', '.'))]));
        const newTotalInvested = investments.reduce((s, i) => s + i.amountInvested, 0);
        const newTotalCurrent = investments.reduce((s, i) => s + (changedMap[i.id] ?? i.currentValue), 0);
        await upsertSnapshot(newTotalInvested, newTotalCurrent);
      }
    } catch {
      toast('Erro ao atualizar valores. Tente novamente.', 'error');
    }
    setBatchSaving(false);
  }

  function exportCSV() {
    const headers = ['Nome', 'Tipo', 'Valor Investido', 'Valor Atual', 'Retorno (R$)', 'Retorno (%)', '% Carteira', 'Data Compra', 'Vencimento'];
    const rows = investments.map(inv => {
      const ret = inv.currentValue - inv.amountInvested;
      const retPct = inv.amountInvested > 0 ? (ret / inv.amountInvested) * 100 : 0;
      const pctCarteira = data.totalCurrent > 0 ? (inv.currentValue / data.totalCurrent) * 100 : 0;
      return [
        inv.name,
        TYPE_CONFIG[inv.type].label,
        inv.amountInvested.toFixed(2).replace('.', ','),
        inv.currentValue.toFixed(2).replace('.', ','),
        ret.toFixed(2).replace('.', ','),
        retPct.toFixed(2).replace('.', ',') + '%',
        pctCarteira.toFixed(1).replace('.', ',') + '%',
        inv.purchaseDate || '',
        inv.maturityDate || '',
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carteira-${new Date().toISOString().slice(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getDaysLabel(deadline: string): { label: string; color: string } {
    const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
    if (daysLeft < 0) return { label: `Venceu há ${Math.abs(daysLeft)}d`, color: 'text-red-500' };
    if (daysLeft === 0) return { label: 'Vence hoje!', color: 'text-red-500' };
    if (daysLeft <= 30) return { label: `Faltam ${daysLeft}d`, color: 'text-amber-500' };
    if (daysLeft <= 90) return { label: `Faltam ${daysLeft}d`, color: 'text-blue-400' };
    return { label: `Faltam ${daysLeft}d`, color: 't-text-dim' };
  }

  // Heurística de ativo desatualizado: valor atual === valor investido E data de compra > 60 dias
  function isStale(inv: Investment): boolean {
    if (inv.currentValue !== inv.amountInvested) return false;
    if (!inv.purchaseDate) return false;
    const diffDays = (Date.now() - new Date(inv.purchaseDate).getTime()) / 86400000;
    return diffDays > 60;
  }

  // Alerta de vencimento
  function getMaturityAlert(inv: Investment): { label: string; color: string } | null {
    if (!inv.maturityDate) return null;
    const daysLeft = Math.ceil((new Date(inv.maturityDate).getTime() - Date.now()) / 86400000);
    if (daysLeft < 0) return { label: 'Vencido', color: 'bg-red-500/15 text-red-600' };
    if (daysLeft <= 30) return { label: `Vence em ${daysLeft}d`, color: 'bg-red-500/15 text-red-600' };
    if (daysLeft <= 60) return { label: `Vence em ${daysLeft}d`, color: 'bg-amber-400/15 text-amber-600' };
    return null;
  }

  // Rentabilidade anualizada % a.a.
  function getAnnualizedReturn(inv: Investment): string | null {
    if (!inv.purchaseDate || inv.amountInvested <= 0) return null;
    const days = (Date.now() - new Date(inv.purchaseDate).getTime()) / 86400000;
    if (days < 7) return null;
    const ratio = inv.currentValue / inv.amountInvested;
    const annualized = (Math.pow(ratio, 365 / days) - 1) * 100;
    return `${annualized >= 0 ? '+' : ''}${annualized.toFixed(1)}% a.a.`;
  }

  // Lista filtrada e ordenada
  const filteredInvestments = useMemo(() => {
    let list = filterType === 'all' ? investments : investments.filter(i => i.type === filterType);
    list = [...list].sort((a, b) => {
      let diff = 0;
      if (sortBy === 'name') diff = a.name.localeCompare(b.name);
      else if (sortBy === 'value') diff = a.currentValue - b.currentValue;
      else if (sortBy === 'return') diff = (a.currentValue - a.amountInvested) / (a.amountInvested || 1) - (b.currentValue - b.amountInvested) / (b.amountInvested || 1);
      else if (sortBy === 'pct') diff = (a.currentValue / (data.totalCurrent || 1)) - (b.currentValue / (data.totalCurrent || 1));
      return sortDir === 'desc' ? -diff : diff;
    });
    return list;
  }, [investments, filterType, sortBy, sortDir, data.totalCurrent]);

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir('desc'); }
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
            <div className="text-lg md:text-2xl font-bold" style={{ color: 'var(--accent)' }}>{fmt(data.totalCurrent)}</div>
            <div className="text-xs t-text-dim mt-1">Valor total da carteira</div>
          </div>
        </div>
      </div>

      {/* ── Alerta de concentração ── */}
      {data.concentrationWarnings.length > 0 && (
        <div className="mb-4 animate-fade-in-up">
          {data.concentrationWarnings.map(w => (
            <div key={w.label} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span><strong>{w.label}</strong> representa <strong>{w.pct.toFixed(0)}%</strong> da sua carteira. Considere diversificar para reduzir riscos.</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Evolução do Patrimônio ── */}
      {evolutionChart && (
        <div className="glass-card rounded-xl p-5 mb-4 animate-fade-in-up">
          <h3 className="text-sm font-bold t-text mb-4">Evolução da Carteira</h3>
          <div className="h-52">
            <Line
              data={{
                labels: evolutionChart.labels,
                datasets: [
                  {
                    label: 'Valor Atual',
                    data: evolutionChart.current,
                    borderColor: '#16a34a',
                    backgroundColor: 'rgba(22,163,74,0.08)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#16a34a',
                  },
                  {
                    label: 'Valor Investido',
                    data: evolutionChart.invested,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37,99,235,0.05)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#2563eb',
                    borderDash: [4, 4],
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800 },
                plugins: {
                  legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12, usePointStyle: true, pointStyle: 'circle' } },
                  tooltip: {
                    callbacks: {
                      label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y ?? 0)}`,
                    },
                  },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                  y: {
                    grid: { color: 'rgba(100,116,139,0.1)' },
                    ticks: { font: { size: 11 }, callback: v => fmt(Number(v)) },
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* ── Alocação + Metas (grid 2 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Donut de alocação + tabela resumo por tipo */}
        <div className="glass-card rounded-xl p-5 animate-fade-in-up stagger-5 flex flex-col">
          <h3 className="text-sm font-bold t-text mb-4">Alocação por Tipo</h3>
          {data.typeLabels.length > 0 ? (
            <>
              <div className="h-48">
                <Doughnut
                  data={{
                    labels: data.typeLabels,
                    datasets: [{ data: data.typeData, backgroundColor: data.typeColors, borderWidth: 0, borderRadius: 4 }],
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: false, cutout: '70%',
                    animation: { duration: 1000, easing: 'easeOutQuart' },
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
              {/* Tabela resumo por tipo */}
              <div className="mt-4 border-t t-border pt-3 space-y-2">
                {data.byTypeSummary.map(t => (
                  <div key={t.type} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TYPE_CONFIG[t.type]?.color }} />
                    <span className="flex-1 t-text font-medium truncate">{TYPE_CONFIG[t.type]?.label}</span>
                    <span className="t-text-dim">{fmt(t.currentValue)}</span>
                    <span className={`font-semibold w-14 text-right ${t.return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {t.returnPct >= 0 ? '+' : ''}{t.returnPct.toFixed(1)}%
                    </span>
                    <span className="t-text-dim w-10 text-right">{t.pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </>
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
                const isLinked = (goal.linkedInvestmentIds?.length ?? 0) > 0;
                const effectiveValue = isLinked
                  ? investments.filter(i => goal.linkedInvestmentIds!.includes(i.id)).reduce((s, i) => s + i.currentValue, 0)
                  : goal.currentValue;
                const pct = goal.targetValue > 0 ? Math.min((effectiveValue / goal.targetValue) * 100, 100) : 0;
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
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-card-hover)' }}>
                      <div className="h-full rounded-full animate-progress" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <div className="flex justify-between text-[0.7rem] t-text-dim mt-0.5">
                      <span className="flex items-center gap-1">
                        {fmt(effectiveValue)} / {fmt(goal.targetValue)}
                        {isLinked && <span title="Valor calculado automaticamente dos ativos vinculados" className="text-blue-500">⬡</span>}
                      </span>
                      {goal.deadline && (() => {
                        const dl = getDaysLabel(goal.deadline);
                        return (
                          <span className={`flex items-center gap-0.5 ${dl.color}`}>
                            <Clock size={9} />{dl.label}
                          </span>
                        );
                      })()}
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
          <div className="flex items-center gap-2">
            {investments.length > 0 && !batchEditing && (
              <>
                <button onClick={exportCSV}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border t-border t-text cursor-pointer hover:opacity-80 flex items-center gap-1.5">
                  <Download size={13} /> Exportar CSV
                </button>
                <button onClick={startBatchEdit}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border t-border t-text cursor-pointer hover:opacity-80 flex items-center gap-1.5">
                  <RefreshCw size={13} /> Atualizar Valores
                </button>
              </>
            )}
            {batchEditing && (
              <>
                <button onClick={() => setBatchEditing(false)} disabled={batchSaving}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border t-border t-text cursor-pointer hover:opacity-80 flex items-center gap-1.5">
                  <XIcon size={13} /> Cancelar
                </button>
                <button onClick={saveBatchEdit} disabled={batchSaving}
                  className="px-3 py-1.5 t-accent-bg text-white text-xs font-semibold rounded-lg cursor-pointer hover:opacity-90 flex items-center gap-1.5">
                  <Check size={13} /> {batchSaving ? 'Salvando...' : 'Salvar tudo'}
                </button>
              </>
            )}
            {!batchEditing && (
              <button onClick={() => {
                const blocked = checkInvestmentLimit(investments.length);
                if (blocked) { setUpgradeMessage(blocked); return; }
                setEditingInv(null); setInvModalOpen(true);
              }}
                className="px-3 py-1.5 t-accent-bg text-white text-xs font-semibold rounded-lg cursor-pointer hover:opacity-90 flex items-center gap-1.5">
                <Plus size={14} /> Novo Investimento
              </button>
            )}
          </div>
        </div>

        {batchEditing && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-600 text-xs font-medium">
            Edite os valores atuais abaixo e clique em "Salvar tudo" para atualizar todos de uma vez.
          </div>
        )}

        {/* Filtro e ordenação */}
        {investments.length > 0 && !batchEditing && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {/* Pills de tipo */}
            <div className="flex items-center gap-1 flex-wrap">
              {(['all', ...Object.keys(TYPE_CONFIG)] as Array<'all' | InvestmentType>).map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`text-[0.65rem] px-2 py-1 rounded-full font-semibold cursor-pointer transition-all ${
                    filterType === t
                      ? 't-accent-bg text-white'
                      : 'border t-border t-text-muted hover:opacity-80'
                  }`}>
                  {t === 'all' ? 'Todos' : TYPE_CONFIG[t].label}
                </button>
              ))}
            </div>
            {/* Ordenação */}
            <div className="ml-auto flex items-center gap-1">
              {(['value', 'return', 'pct', 'name'] as const).map(f => (
                <button key={f} onClick={() => toggleSort(f)}
                  className={`text-[0.65rem] px-2 py-1 rounded-full font-semibold cursor-pointer transition-all flex items-center gap-0.5 ${
                    sortBy === f ? 't-accent-bg text-white' : 'border t-border t-text-muted hover:opacity-80'
                  }`}>
                  {f === 'value' ? 'Valor' : f === 'return' ? 'Retorno' : f === 'pct' ? '% Carteira' : 'Nome'}
                  {sortBy === f && <ArrowUpDown size={9} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {investments.length > 0 ? (
          <div className="space-y-2">
            {filteredInvestments.length === 0 ? (
              <div className="py-8 text-center t-text-dim text-sm">Nenhum ativo neste tipo.</div>
            ) : filteredInvestments.map(inv => {
              const ret = inv.currentValue - inv.amountInvested;
              const retPct = inv.amountInvested > 0 ? (ret / inv.amountInvested) * 100 : 0;
              const pctCarteira = data.totalCurrent > 0 ? (inv.currentValue / data.totalCurrent) * 100 : 0;
              const config = TYPE_CONFIG[inv.type];
              const stale = isStale(inv);
              const maturity = getMaturityAlert(inv);
              const annualized = getAnnualizedReturn(inv);
              return (
                <div key={inv.id} className="group flex items-center gap-3 p-3 rounded-lg t-card-hover hover:bg-[var(--bg-card-hover)] transition-colors">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 relative" style={{ background: `${config.color}15` }}>
                    <TrendingUp size={16} style={{ color: config.color }} />
                    {stale && !batchEditing && (
                      <span title="Valor pode estar desatualizado" className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold t-text truncate">{inv.name}</span>
                      <span className="text-[0.6rem] px-1.5 py-px rounded-full font-semibold flex-shrink-0" style={{ background: `${config.color}15`, color: config.color }}>
                        {config.label}
                      </span>
                      {maturity && !batchEditing && (
                        <span className={`text-[0.6rem] px-1.5 py-px rounded-full font-semibold flex-shrink-0 flex items-center gap-0.5 ${maturity.color}`}>
                          <AlertTriangle size={9} />{maturity.label}
                        </span>
                      )}
                      {stale && !batchEditing && (
                        <span className="text-[0.6rem] px-1.5 py-px rounded-full font-semibold flex-shrink-0 bg-amber-400/15 text-amber-600">
                          Desatualizado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[0.72rem] t-text-dim">
                      <span>Investido: {fmt(inv.amountInvested)}</span>
                      {!batchEditing && <span>{pctCarteira.toFixed(0)}% da carteira</span>}
                    </div>
                  </div>
                  {batchEditing ? (
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <div className="text-right">
                        <label className="block text-[0.65rem] t-text-dim mb-0.5">Valor atual</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={batchValues[inv.id] ?? ''}
                          onChange={e => setBatchValues(prev => ({ ...prev, [inv.id]: e.target.value }))}
                          className="w-32 px-2 py-1.5 rounded-lg t-input border text-sm text-right font-semibold"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold t-text">{fmt(inv.currentValue)}</div>
                        <div className={`text-[0.72rem] font-semibold ${ret >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {ret >= 0 ? '+' : ''}{fmt(ret)} ({retPct >= 0 ? '+' : ''}{retPct.toFixed(1)}%)
                        </div>
                        {annualized && (
                          <div className="text-[0.65rem] t-text-dim mt-0.5">{annualized}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => { setEditingInv(inv); setInvModalOpen(true); }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer t-text-dim hover:t-text"><Pencil size={13} /></button>
                        <button onClick={() => setConfirmDelete({ type: 'inv', id: inv.id })}
                          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer text-red-400 hover:text-red-500"><Trash2 size={13} /></button>
                      </div>
                    </>
                  )}
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
          try {
            if (editingInv) {
              await updateInvestment(editingInv.id, d);
              toast('Investimento atualizado', 'success');
            } else {
              await addInvestment(d);
              toast('Investimento adicionado', 'success');
            }
          } catch {
            toast('Erro ao salvar investimento. Tente novamente.', 'error');
          }
        }}
      />

      <InvestmentGoalModal
        isOpen={goalModalOpen}
        onClose={() => { setGoalModalOpen(false); setEditingGoal(null); }}
        editing={editingGoal}
        investments={investments}
        onSave={async (d) => {
          try {
            if (editingGoal) {
              await updateGoal(editingGoal.id, d);
              toast('Meta atualizada', 'success');
            } else {
              await addGoal(d);
              toast('Meta criada', 'success');
            }
          } catch {
            toast('Erro ao salvar meta. Tente novamente.', 'error');
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
