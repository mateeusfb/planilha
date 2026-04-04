'use client';

import { useState, useMemo, Fragment } from 'react';
import { useStore } from '@/lib/store';
import { EXPENSE_CATS, CAT_COLORS } from '@/lib/constants';
import { fmt, fmtMonth, getBudgetForMonth, getPreviousMonth, getTotal } from '@/lib/helpers';
import { Eye, EyeOff, Copy, Target, AlertTriangle, CheckCircle, TrendingDown, ArrowRightLeft, Award, BarChart3, Lightbulb, Zap, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from './Toast';
import { usePlan } from '@/lib/plans';
import { Bar } from 'react-chartjs-2';

// ── Helpers locais ──
function getNPreviousMonths(ym: string, n: number): string[] {
  const result: string[] = [];
  let current = ym;
  for (let i = 0; i < n; i++) {
    current = getPreviousMonth(current);
    result.unshift(current);
  }
  return result;
}

function getScoreColor(score: number) {
  if (score >= 80) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

// ── Sparkline SVG ──
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2 || data.every(v => v === 0)) return <span className="text-[0.5rem] t-text-dim">—</span>;
  const max = Math.max(...data, 1);
  const w = 56, h = 18;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * (h - 2) - 1;
    return `${x},${y}`;
  }).join(' ');
  const lastX = w;
  const lastY = h - (data[data.length - 1] / max) * (h - 2) - 1;
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  );
}

export default function BudgetPage() {
  const { state, setState, getExpensesByExactMonth, getIndividualMembers, setActiveMonth } = useStore();
  const { activeMonth, activeMember, categoryBudgets, monthlyBudgets, customCats } = state;
  const [valuesHidden, setValuesHidden] = useState(true);
  const [showRealloc, setShowRealloc] = useState(false);
  const [reallocFrom, setReallocFrom] = useState('');
  const [reallocTo, setReallocTo] = useState('');
  const [reallocAmount, setReallocAmount] = useState(0);
  const { toast } = useToast();
  const { checkCustomCategoryLimit } = usePlan();

  const resolvedBudget = getBudgetForMonth(activeMonth, monthlyBudgets || {}, categoryBudgets || {});
  const prevMonth = getPreviousMonth(activeMonth);
  const prevBudget = getBudgetForMonth(prevMonth, monthlyBudgets || {}, categoryBudgets || {});
  const hasPrevBudget = Object.values(prevBudget).some(v => v > 0);

  const outflows = getExpensesByExactMonth(activeMonth, activeMember).filter(e => e.type === 'expense');
  const allCats = [...EXPENSE_CATS, ...customCats].filter(c => c !== 'Investimento');

  const budgetItems = allCats.map(cat => {
    const limit = resolvedBudget[cat] || 0;
    const spent = outflows.filter(e => e.cat === cat).reduce((s, e) => s + e.value, 0);
    const pct = limit > 0 ? (spent / limit) * 100 : 0;
    const deviation = limit > 0 ? spent - limit : 0;
    return { cat, limit, spent, pct, deviation };
  });

  const budgetItemsWithLimit = budgetItems.filter(b => b.limit > 0);
  const totalPrevisto = budgetItemsWithLimit.reduce((s, b) => s + b.limit, 0);
  const totalRealizado = budgetItemsWithLimit.reduce((s, b) => s + b.spent, 0);
  const totalDesvio = totalRealizado - totalPrevisto;

  // ── Ritmo de Gastos ──
  const spendingPace = useMemo(() => {
    if (budgetItemsWithLimit.length === 0 || totalPrevisto === 0) return null;
    const now = new Date();
    const [y, m] = activeMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m;
    const dayOfMonth = isCurrentMonth ? now.getDate() : daysInMonth;
    const expectedPct = (dayOfMonth / daysInMonth) * 100;
    const actualPct = (totalRealizado / totalPrevisto) * 100;
    const projectedTotal = dayOfMonth > 0 ? (totalRealizado / dayOfMonth) * daysInMonth : 0;
    const projectedDeviation = projectedTotal - totalPrevisto;
    return { dayOfMonth, daysInMonth, expectedPct, actualPct, projectedTotal, projectedDeviation, isCurrentMonth };
  }, [activeMonth, totalPrevisto, totalRealizado, budgetItemsWithLimit.length]);

  // ── Score de Aderência ──
  const adherenceScore = useMemo(() => {
    if (budgetItemsWithLimit.length === 0) return null;
    const avgDeviation = budgetItemsWithLimit.reduce((sum, b) => {
      return sum + Math.abs((b.spent - b.limit) / b.limit) * 100;
    }, 0) / budgetItemsWithLimit.length;
    return Math.max(0, Math.min(100, Math.round(100 - avgDeviation)));
  }, [budgetItemsWithLimit]);

  // ── Dados Históricos (6 meses) ──
  const historicalData = useMemo(() => {
    const months = [...getNPreviousMonths(activeMonth, 5), activeMonth];
    return months.map(ym => {
      const budget = getBudgetForMonth(ym, monthlyBudgets || {}, categoryBudgets || {});
      const expenses = getExpensesByExactMonth(ym, activeMember).filter(e => e.type === 'expense');
      const catData: Record<string, { budget: number; spent: number; variance: number }> = {};
      for (const cat of allCats) {
        const limit = budget[cat] || 0;
        const spent = expenses.filter(e => e.cat === cat).reduce((s, e) => s + e.value, 0);
        catData[cat] = { budget: limit, spent, variance: limit > 0 ? ((spent - limit) / limit) * 100 : 0 };
      }
      return { month: ym, label: fmtMonth(ym), catData };
    });
  }, [activeMonth, activeMember, monthlyBudgets, categoryBudgets, allCats, getExpensesByExactMonth]);

  // ── Sugestões Inteligentes ──
  const smartSuggestions = useMemo(() => {
    const prev3 = getNPreviousMonths(activeMonth, 3);
    const suggestions: { cat: string; avg: number; budget: number }[] = [];
    for (const b of budgetItems) {
      if (b.limit <= 0) continue;
      let total = 0, count = 0;
      for (const pm of prev3) {
        const spent = getExpensesByExactMonth(pm, activeMember)
          .filter(e => e.type === 'expense' && e.cat === b.cat)
          .reduce((s, e) => s + e.value, 0);
        if (spent > 0) { total += spent; count++; }
      }
      if (count === 0) continue;
      const avg = total / count;
      if (avg > b.limit * 1.15) suggestions.push({ cat: b.cat, avg, budget: b.limit });
    }
    return suggestions;
  }, [activeMonth, activeMember, budgetItems, getExpensesByExactMonth]);

  // ── Melhor Mês ──
  const bestMonth = useMemo(() => {
    if (adherenceScore === null) return null;
    const prev5 = getNPreviousMonths(activeMonth, 5);
    let best = { month: activeMonth, score: adherenceScore };
    for (const ym of prev5) {
      const budget = getBudgetForMonth(ym, monthlyBudgets || {}, categoryBudgets || {});
      const expenses = getExpensesByExactMonth(ym, activeMember).filter(e => e.type === 'expense');
      const items = allCats.map(cat => {
        const limit = budget[cat] || 0;
        const spent = expenses.filter(e => e.cat === cat).reduce((s, e) => s + e.value, 0);
        return { limit, spent };
      }).filter(b => b.limit > 0);
      if (items.length === 0) continue;
      const avgDev = items.reduce((s, b) => s + Math.abs((b.spent - b.limit) / b.limit) * 100, 0) / items.length;
      const score = Math.max(0, Math.min(100, Math.round(100 - avgDev)));
      if (score > best.score) best = { month: ym, score };
    }
    return { ...best, isCurrent: best.month === activeMonth };
  }, [adherenceScore, activeMonth, activeMember, monthlyBudgets, categoryBudgets, allCats, getExpensesByExactMonth]);

  // ── Breakdown por Membro ──
  const memberBreakdown = useMemo(() => {
    if (activeMember !== 'all') return null;
    const members = getIndividualMembers();
    if (members.length === 0) return null;
    return members.map(member => {
      const memberOutflows = getExpensesByExactMonth(activeMonth, member.id).filter(e => e.type === 'expense');
      const spent = getTotal(memberOutflows);
      const topCats = allCats
        .map(cat => ({ cat, spent: memberOutflows.filter(e => e.cat === cat).reduce((s, e) => s + e.value, 0) }))
        .filter(c => c.spent > 0)
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 3);
      return { member, spent, topCats };
    }).filter(m => m.spent > 0);
  }, [activeMember, activeMonth, getIndividualMembers, getExpensesByExactMonth, allCats]);

  function handleBudgetChange(cat: string, value: number) {
    const currentBudget = getBudgetForMonth(activeMonth, monthlyBudgets || {}, categoryBudgets || {});
    const activeBudgets = Object.keys(currentBudget).filter(k => currentBudget[k] > 0).length;
    const blocked = checkCustomCategoryLimit(activeBudgets);
    if (blocked && value > 0 && !currentBudget[cat]) return;
    setState(prev => ({
      ...prev,
      monthlyBudgets: {
        ...prev.monthlyBudgets,
        [activeMonth]: { ...getBudgetForMonth(activeMonth, prev.monthlyBudgets || {}, prev.categoryBudgets || {}), [cat]: value },
      },
    }));
  }

  function handleCopyFromPrevious() {
    if (!hasPrevBudget) return;
    setState(prev => ({
      ...prev,
      monthlyBudgets: { ...prev.monthlyBudgets, [activeMonth]: { ...prevBudget } },
    }));
    toast(`Orçamento copiado de ${fmtMonth(prevMonth)}!`, 'success');
  }

  function handleRealloc() {
    if (!reallocFrom || !reallocTo || reallocAmount <= 0) return;
    const fromLimit = resolvedBudget[reallocFrom] || 0;
    if (reallocAmount > fromLimit) { toast('Valor excede o orçamento da categoria de origem.', 'error'); return; }
    handleBudgetChange(reallocFrom, fromLimit - reallocAmount);
    handleBudgetChange(reallocTo, (resolvedBudget[reallocTo] || 0) + reallocAmount);
    toast(`${fmt(reallocAmount)} realocado de ${reallocFrom} para ${reallocTo}`, 'success');
    setShowRealloc(false);
    setReallocFrom('');
    setReallocTo('');
    setReallocAmount(0);
  }

  function goToPrevMonth() {
    setActiveMonth(getPreviousMonth(activeMonth));
  }
  function goToNextMonth() {
    const [y, m] = activeMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setActiveMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const blur = valuesHidden ? 'blur-[8px] select-none' : '';

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* ═══ 1. Header ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Target size={20} className="t-text" />
            <button onClick={goToPrevMonth} className="w-7 h-7 rounded-lg flex items-center justify-center border t-border t-text-dim hover:opacity-80 transition-colors cursor-pointer">
              <ChevronLeft size={15} />
            </button>
            <h3 className="text-lg font-bold t-text min-w-[120px] text-center">{fmtMonth(activeMonth)}</h3>
            <button onClick={goToNextMonth} className="w-7 h-7 rounded-lg flex items-center justify-center border t-border t-text-dim hover:opacity-80 transition-colors cursor-pointer">
              <ChevronRight size={15} />
            </button>
          </div>
          <p className="text-xs t-text-dim mt-0.5">Defina o valor previsto por categoria e acompanhe o realizado.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {budgetItemsWithLimit.length > 0 && (
            <button onClick={() => setShowRealloc(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border t-border hover:bg-white/5 transition-colors t-text-dim cursor-pointer">
              <ArrowRightLeft size={13} /> Realocar
            </button>
          )}
          {hasPrevBudget && (
            <button onClick={handleCopyFromPrevious}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border t-border hover:bg-white/5 transition-colors t-text-dim cursor-pointer">
              <Copy size={13} /> Copiar de {fmtMonth(prevMonth)}
            </button>
          )}
          <button onClick={() => setValuesHidden(v => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center border t-border t-text-dim hover:opacity-80 transition-colors cursor-pointer"
            title={valuesHidden ? 'Mostrar valores' : 'Ocultar valores'}>
            {valuesHidden ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {/* ═══ 2. Cards Resumo (4 cards) ═══ */}
      {budgetItemsWithLimit.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wider t-text-dim mb-1">Previsto</p>
            <p className={`text-base sm:text-lg font-bold t-text ${blur}`}>{fmt(totalPrevisto)}</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wider t-text-dim mb-1">Realizado</p>
            <p className={`text-base sm:text-lg font-bold t-text ${blur}`}>{fmt(totalRealizado)}</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wider t-text-dim mb-1">Desvio</p>
            <p className={`text-base sm:text-lg font-bold ${totalDesvio > 0 ? 'text-red-500' : 'text-green-500'} ${blur}`}>
              {totalDesvio > 0 ? '+' : ''}{fmt(totalDesvio)}
            </p>
          </div>
          {adherenceScore !== null && (
            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-[0.6rem] font-semibold uppercase tracking-wider t-text-dim mb-1">Score</p>
              <p className="text-base sm:text-lg font-bold" style={{ color: getScoreColor(adherenceScore) }}>
                {adherenceScore}<span className="text-xs font-normal">/100</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══ 3. Ritmo de Gastos ═══ */}
      {spendingPace && spendingPace.isCurrentMonth && (
        <div className={`glass-card rounded-xl p-4 border-l-4 ${
          spendingPace.actualPct > spendingPace.expectedPct * 1.1 ? 'border-l-red-500' :
          spendingPace.actualPct > spendingPace.expectedPct * 0.9 ? 'border-l-amber-500' : 'border-l-green-500'
        }`}>
          <div className="flex items-start gap-3">
            <Zap size={18} className={
              spendingPace.actualPct > spendingPace.expectedPct * 1.1 ? 'text-red-500' :
              spendingPace.actualPct > spendingPace.expectedPct * 0.9 ? 'text-amber-500' : 'text-green-500'
            } />
            <div className="flex-1">
              <p className="text-sm font-semibold t-text">
                Dia {spendingPace.dayOfMonth}/{spendingPace.daysInMonth} — {Math.round(spendingPace.actualPct)}% do orçamento usado
              </p>
              <p className="text-xs t-text-dim mt-0.5">
                Esperado para hoje: {Math.round(spendingPace.expectedPct)}%.
                {spendingPace.projectedDeviation > 0
                  ? ` No ritmo atual, vai estourar em ${fmt(spendingPace.projectedDeviation)}.`
                  : ` No ritmo atual, vai sobrar ${fmt(Math.abs(spendingPace.projectedDeviation))}.`
                }
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden relative">
                  {/* Marcador do esperado */}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500 z-10" style={{ left: `${Math.min(spendingPace.expectedPct, 100)}%` }} />
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.min(spendingPace.actualPct, 100)}%`,
                    background: spendingPace.actualPct > spendingPace.expectedPct * 1.1 ? '#ef4444' :
                      spendingPace.actualPct > spendingPace.expectedPct * 0.9 ? '#f59e0b' : '#10b981',
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 4. Melhor Mês ═══ */}
      {bestMonth && bestMonth.isCurrent && adherenceScore !== null && adherenceScore >= 70 && (
        <div className="glass-card rounded-xl p-3 flex items-center gap-3 border-l-4 border-l-amber-400">
          <Award size={20} className="text-amber-500 flex-shrink-0" />
          <p className="text-xs t-text">
            <strong className="text-amber-500">Melhor mês!</strong> Seu score de {adherenceScore} pontos é o mais alto dos últimos 6 meses.
          </p>
        </div>
      )}

      {/* ═══ 5. Sugestões Inteligentes ═══ */}
      {smartSuggestions.length > 0 && (
        <div className="glass-card rounded-xl p-4 space-y-2">
          <h4 className="text-xs font-bold t-text flex items-center gap-2">
            <Lightbulb size={14} className="text-amber-500" /> Sugestões Inteligentes
          </h4>
          {smartSuggestions.map(s => (
            <div key={s.cat} className="flex items-start gap-2 text-xs t-text-dim">
              <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
              <span>
                Gasto médio em <strong className="t-text">{s.cat}</strong>: {fmt(s.avg)}.
                Considere ajustar de {fmt(s.budget)} para <strong className="t-text">{fmt(Math.ceil(s.avg / 50) * 50)}</strong>.
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ═══ 6. Painel de Realocação ═══ */}
      {showRealloc && (
        <div className="glass-card rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold t-text flex items-center gap-2">
              <ArrowRightLeft size={16} /> Realocar Orçamento
            </h4>
            <button onClick={() => setShowRealloc(false)} className="t-text-dim hover:opacity-80 cursor-pointer"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-[0.6rem] font-semibold t-text-dim uppercase">De</label>
              <select value={reallocFrom} onChange={e => setReallocFrom(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 text-xs border rounded-lg t-input">
                <option value="">Selecione</option>
                {budgetItemsWithLimit.map(b => (
                  <option key={b.cat} value={b.cat}>{b.cat} ({fmt(b.limit)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[0.6rem] font-semibold t-text-dim uppercase">Para</label>
              <select value={reallocTo} onChange={e => setReallocTo(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 text-xs border rounded-lg t-input">
                <option value="">Selecione</option>
                {allCats.filter(c => c !== reallocFrom).map(cat => (
                  <option key={cat} value={cat}>{cat} ({fmt(resolvedBudget[cat] || 0)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[0.6rem] font-semibold t-text-dim uppercase">Valor (R$)</label>
              <input type="number" min="0" value={reallocAmount || ''}
                onChange={e => setReallocAmount(Number(e.target.value) || 0)}
                className="w-full mt-1 px-2 py-1.5 text-xs border rounded-lg t-input" />
            </div>
          </div>
          <button onClick={handleRealloc}
            disabled={!reallocFrom || !reallocTo || reallocAmount <= 0}
            className="w-full py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors cursor-pointer">
            Confirmar Realocação
          </button>
        </div>
      )}

      {/* ═══ 7. Tabela de Categorias (com sparklines) ═══ */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b t-border">
          <h4 className="text-sm font-bold t-text">Categorias</h4>
        </div>
        <div className="px-5 py-4">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_90px_90px_70px] sm:grid-cols-[1fr_60px_100px_90px_90px_70px] gap-2 text-[0.6rem] font-bold t-text-dim uppercase tracking-wider mb-3 px-1">
            <span>Categoria</span>
            <span className="hidden sm:block text-center">Trend</span>
            <span className="text-right">Previsto</span>
            <span className="text-right">Realizado</span>
            <span className="text-right">Desvio</span>
            <span className="text-right">%</span>
          </div>

          {/* Rows */}
          <div className="space-y-1.5">
            {budgetItems.map(b => {
              const catColor = CAT_COLORS[b.cat] || '#94a3b8';
              const color = b.limit === 0 ? '#94a3b8' : b.pct >= 100 ? '#ef4444' : b.pct >= 80 ? '#f59e0b' : '#10b981';
              const StatusIcon = b.limit === 0 ? null : b.pct >= 100 ? AlertTriangle : b.pct >= 80 ? TrendingDown : CheckCircle;
              const sparkData = historicalData.map(h => h.catData[b.cat]?.spent || 0);

              return (
                <div key={b.cat} className="grid grid-cols-[1fr_100px_90px_90px_70px] sm:grid-cols-[1fr_60px_100px_90px_90px_70px] gap-2 items-center py-2 px-1 rounded-lg hover:bg-white/5 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: catColor }} />
                    <span className="text-sm font-medium t-text truncate">{b.cat}</span>
                    {StatusIcon && <StatusIcon size={12} style={{ color }} className="flex-shrink-0" />}
                  </div>

                  {/* Sparkline */}
                  <div className="hidden sm:flex justify-center">
                    <Sparkline data={sparkData} color={catColor} />
                  </div>

                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[0.6rem] t-text-dim">R$</span>
                    <input type="number" min="0" step="50" value={b.limit || ''}
                      onChange={e => handleBudgetChange(b.cat, Number(e.target.value) || 0)}
                      placeholder="—" className="w-full pl-7 pr-1 py-1.5 border rounded-lg text-xs t-input text-right" />
                  </div>

                  <span className={`text-xs text-right font-semibold t-text ${blur}`}>
                    {b.spent > 0 ? fmt(b.spent) : <span className="t-text-dim">—</span>}
                  </span>

                  <span className={`text-xs text-right font-semibold ${b.limit === 0 ? 't-text-dim' : b.deviation > 0 ? 'text-red-500' : 'text-green-500'} ${blur}`}>
                    {b.limit > 0 ? `${b.deviation > 0 ? '+' : ''}${fmt(b.deviation)}` : '—'}
                  </span>

                  <div className="flex items-center justify-end gap-1">
                    {b.limit > 0 ? (
                      <>
                        <div className="w-6 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(b.pct, 100)}%`, background: color }} />
                        </div>
                        <span className="text-[0.6rem] font-bold min-w-[24px] text-right" style={{ color }}>{Math.round(b.pct)}%</span>
                      </>
                    ) : (
                      <span className="text-[0.6rem] t-text-dim">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total */}
          {budgetItemsWithLimit.length > 0 && (
            <div className="mt-3 pt-3 border-t t-border grid grid-cols-[1fr_100px_90px_90px_70px] sm:grid-cols-[1fr_60px_100px_90px_90px_70px] gap-2 px-1">
              <span className="text-sm font-bold t-text">Total</span>
              <span className="hidden sm:block" />
              <span className={`text-xs text-right font-bold t-text-dim ${blur}`}>{fmt(totalPrevisto)}</span>
              <span className={`text-xs text-right font-bold t-text ${blur}`}>{fmt(totalRealizado)}</span>
              <span className={`text-xs text-right font-bold ${totalDesvio > 0 ? 'text-red-500' : 'text-green-500'} ${blur}`}>
                {totalDesvio > 0 ? '+' : ''}{fmt(totalDesvio)}
              </span>
              <span />
            </div>
          )}
        </div>
      </div>

      {/* ═══ 8. Gráfico de Barras ═══ */}
      {budgetItemsWithLimit.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h4 className="text-sm font-bold t-text mb-4 flex items-center gap-2">
            <BarChart3 size={16} /> Previsto vs Realizado
          </h4>
          <div className="h-64">
            <Bar
              data={{
                labels: budgetItemsWithLimit.map(b => b.cat),
                datasets: [
                  {
                    label: 'Previsto',
                    data: budgetItemsWithLimit.map(b => b.limit),
                    backgroundColor: 'rgba(99, 102, 241, 0.6)',
                    borderRadius: 6,
                  },
                  {
                    label: 'Realizado',
                    data: budgetItemsWithLimit.map(b => b.spent),
                    backgroundColor: budgetItemsWithLimit.map(b =>
                      b.spent > b.limit ? 'rgba(239, 68, 68, 0.6)' : 'rgba(16, 185, 129, 0.6)'
                    ),
                    borderRadius: 6,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1200, easing: 'easeOutQuart' as const },
                plugins: {
                  legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12, usePointStyle: true, pointStyle: 'circle' } },
                  tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y ?? 0)}` } },
                },
                scales: {
                  y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { font: { size: 10 } } },
                  x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* ═══ 9. Breakdown por Membro ═══ */}
      {memberBreakdown && memberBreakdown.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b t-border">
            <h4 className="text-sm font-bold t-text">Gastos por Membro</h4>
          </div>
          <div className="px-5 py-4 space-y-3">
            {memberBreakdown.map(({ member, spent, topCats }) => (
              <div key={member.id} className="flex items-center gap-3 py-2">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: member.color }}>
                  {member.name[0].toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold t-text">{member.name}</span>
                    <span className={`text-sm font-bold t-text ${blur}`}>{fmt(spent)}</span>
                  </div>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {topCats.map(c => (
                      <span key={c.cat} className="text-[0.6rem] t-text-dim flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: CAT_COLORS[c.cat] || '#94a3b8' }} />
                        {c.cat}: <span className={blur}>{fmt(c.spent)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 10. Heatmap (6 meses) ═══ */}
      {budgetItemsWithLimit.length > 0 && historicalData.some(h => Object.values(h.catData).some(d => d.budget > 0)) && (
        <div className="glass-card rounded-xl p-5">
          <h4 className="text-sm font-bold t-text mb-4">Mapa de Calor — Últimos 6 Meses</h4>
          <div className="overflow-x-auto">
            <div className="grid gap-[2px]" style={{ gridTemplateColumns: `100px repeat(${historicalData.length}, 1fr)`, minWidth: '500px' }}>
              {/* Header */}
              <div />
              {historicalData.map(h => (
                <div key={h.month} className={`text-[0.55rem] font-semibold t-text-dim text-center py-1 ${h.month === activeMonth ? 'font-bold t-text' : ''}`}>
                  {h.label}
                </div>
              ))}
              {/* Rows */}
              {allCats.filter(cat => budgetItemsWithLimit.some(b => b.cat === cat)).map(cat => (
                <Fragment key={cat}>
                  <div className="text-[0.65rem] t-text truncate py-1.5 pr-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[cat] || '#94a3b8' }} />
                    {cat}
                  </div>
                  {historicalData.map(h => {
                    const d = h.catData[cat];
                    if (!d || d.budget <= 0) {
                      return <div key={h.month} className="rounded text-center py-1.5 text-[0.5rem] t-text-dim" style={{ background: 'rgba(148,163,184,0.08)' }}>—</div>;
                    }
                    const intensity = Math.min(Math.abs(d.variance), 100) / 100;
                    const bg = d.variance > 0
                      ? `rgba(239, 68, 68, ${0.12 + intensity * 0.55})`
                      : `rgba(16, 185, 129, ${0.12 + intensity * 0.55})`;
                    return (
                      <div key={h.month} className="rounded text-center py-1.5 text-[0.5rem] font-semibold transition-colors"
                        style={{ background: bg, color: intensity > 0.5 ? 'white' : undefined }}
                        title={`${cat} ${h.label}: ${fmt(d.spent)} / ${fmt(d.budget)} (${Math.round(d.variance)}%)`}>
                        {d.variance > 0 ? '+' : ''}{Math.round(d.variance)}%
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-[0.55rem] t-text-dim">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ background: 'rgba(16,185,129,0.5)' }} /> Abaixo do previsto</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ background: 'rgba(239,68,68,0.5)' }} /> Acima do previsto</span>
          </div>
        </div>
      )}

      {/* ═══ Empty state ═══ */}
      {budgetItemsWithLimit.length === 0 && (
        <div className="glass-card rounded-xl p-6 text-center">
          <Target size={32} className="mx-auto t-text-dim mb-3" />
          <p className="text-sm font-medium t-text mb-1">Nenhum orçamento definido</p>
          <p className="text-xs t-text-dim">Defina valores na coluna &quot;Previsto&quot; acima para acompanhar seus gastos vs planejado.</p>
        </div>
      )}
    </div>
  );
}
