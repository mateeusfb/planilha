'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { fmt, fmtMonth, getTotal, groupBy } from '@/lib/helpers';
import { CAT_COLORS } from '@/lib/constants';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Eye, EyeOff, ChevronDown, Target, TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

/* ── Animated Counter ── */
function AnimatedValue({ value, prefix = 'R$ ', hidden, className, style }: {
  value: number; prefix?: string; hidden: boolean; className?: string; style?: React.CSSProperties;
}) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    if (hidden) return;
    const start = prevRef.current;
    const end = value;
    const duration = 600;
    const startTime = performance.now();

    function animate(time: number) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplay(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(animate);
      else prevRef.current = end;
    }
    requestAnimationFrame(animate);
  }, [value, hidden]);

  if (hidden) {
    return <span className={className} style={{ ...style, filter: 'blur(8px)', userSelect: 'none' }}>R$ •••••</span>;
  }

  const formatted = display.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <span className={className} style={style}>{prefix}{formatted}</span>;
}

// Componente de seção colapsável
function Section({ title, icon, children, defaultOpen = false, valuesHidden, onToggleValues }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  valuesHidden?: boolean;
  onToggleValues?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="glass-card rounded-xl mb-4 overflow-hidden animate-fade-in-up">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer hover:opacity-80 transition-colors"
      >
        <h3 className="text-sm font-bold flex items-center gap-2">
          <span>{icon}</span>
          <span>{title}</span>
        </h3>
        <div className="flex items-center gap-2">
          {onToggleValues && (
            <span
              onClick={(e) => { e.stopPropagation(); onToggleValues(); }}
              className="cursor-pointer hover:opacity-60 transition-opacity px-1"
              title={valuesHidden ? 'Mostrar valores' : 'Ocultar valores'}
            >
              {valuesHidden ? <EyeOff size={16} /> : <Eye size={16} />}
            </span>
          )}
          <ChevronDown size={14} className="t-text-dim transition-transform duration-300" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

// Valor que pode ser ocultado
function HiddenValue({ children, hidden, className = '', style }: { children: React.ReactNode; hidden: boolean; className?: string; style?: React.CSSProperties }) {
  if (hidden) {
    return <span className={className} style={{ ...style, filter: 'blur(8px)', userSelect: 'none' }}>R$ •••••</span>;
  }
  return <span className={className} style={style}>{children}</span>;
}

export default function Dashboard() {
  const { state, getExpensesForMonth, getExpensesByExactMonth, getOutflows, getIndividualMembers } = useStore();
  const { activeMonth, activeMember } = state;
  const [valuesHidden, setValuesHidden] = useState(true);

  const data = useMemo(() => {
    const allEntries = getExpensesForMonth(activeMonth, activeMember);
    const incomes = allEntries.filter(e => e.type === 'income');
    const outflows = allEntries.filter(e => e.type !== 'income');

    const incomesNormais = incomes.filter(e => e.cat !== 'Investimento');
    const incomesInvest = incomes.filter(e => e.cat === 'Investimento');
    const totalIncome = getTotal(incomesNormais);
    const totalIncomeInvest = getTotal(incomesInvest);
    let totalExpense = getTotal(outflows);

    let familyShare = 0;
    if (activeMember !== 'all') {
      const individualCount = getIndividualMembers().length;
      if (individualCount > 0) {
        const familyOutflows = state.expenses.filter(e =>
          e.month === activeMonth && e.type !== 'income' && (!e.memberId || e.memberId === 'all')
        );
        familyShare = getTotal(familyOutflows) / individualCount;
        totalExpense += familyShare;
      }
    }

    const investSaida = outflows.filter(e => e.cat === 'Investimento').reduce((s, e) => s + e.value, 0);
    const investTotal = investSaida + totalIncomeInvest;
    const despesasReais = totalExpense - investSaida;
    const saldo = totalIncome - despesasReais;

    const [y, m] = activeMonth.split('-').map(Number);
    const prevD = new Date(y, m - 2, 1);
    const prevYM = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`;
    const prevOutflows = getOutflows(prevYM, activeMember);
    const prevExpense = getTotal(prevOutflows) - prevOutflows.filter(e => e.cat === 'Investimento').reduce((s, e) => s + e.value, 0);
    const diff = despesasReais - prevExpense;
    const diffPct = prevExpense > 0 ? Math.round((diff / prevExpense) * 100) : 0;
    const diffText = prevExpense > 0 ? `${diff >= 0 ? '+' : ''}${fmt(diff)} vs mês anterior` : 'Sem dados do mês anterior';

    const familyBreakdown: { label: string; value: number }[] = [];
    if (activeMember === 'all') {
      const famOut = outflows.filter(e => !e.memberId || e.memberId === 'all');
      const famTotal = getTotal(famOut) - famOut.filter(e => e.cat === 'Investimento').reduce((s, e) => s + e.value, 0);
      if (famTotal > 0) familyBreakdown.push({ label: 'Família (conjunto)', value: famTotal });
      getIndividualMembers().forEach(mb => {
        const mbOut = outflows.filter(e => e.memberId === mb.id);
        const mbTotal = getTotal(mbOut) - mbOut.filter(e => e.cat === 'Investimento').reduce((s, e) => s + e.value, 0);
        if (mbTotal > 0) familyBreakdown.push({ label: mb.name, value: mbTotal });
      });
    }

    const investSubParts: string[] = [];
    if (investSaida > 0) investSubParts.push(`${fmt(investSaida)} aplicado`);
    if (totalIncomeInvest > 0) investSubParts.push(`${fmt(totalIncomeInvest)} rendimento`);
    const investSub = investSubParts.length > 0 ? investSubParts.join(' | ') : (totalIncome > 0 ? '0% da receita' : 'Sem movimentação');

    const byCat = groupBy(outflows, 'cat');
    const catLabels = Object.keys(byCat);
    const catData = catLabels.map(l => byCat[l]);
    const catColors = catLabels.map(l => CAT_COLORS[l] || '#94a3b8');

    const monthlyData: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const all = getExpensesByExactMonth(ym, activeMember);
      monthlyData.push({
        label: fmtMonth(ym),
        income: getTotal(all.filter(e => e.type === 'income' && e.cat !== 'Investimento')),
        expense: getTotal(all.filter(e => e.type !== 'income' && e.cat !== 'Investimento')),
      });
    }

    const budgets = state.categoryBudgets || {};
    const budgetItems = Object.entries(budgets)
      .filter(([, limit]) => limit > 0)
      .map(([cat, limit]) => {
        const spent = outflows.filter(e => e.cat === cat).reduce((s, e) => s + e.value, 0);
        const pct = limit > 0 ? (spent / limit) * 100 : 0;
        return { cat, limit, spent, pct };
      })
      .sort((a, b) => b.pct - a.pct);

    const savingsRate = totalIncome > 0 ? Math.round((1 - despesasReais / totalIncome) * 100) : 0;

    return {
      totalIncome, despesasReais, saldo, investTotal, investSub,
      diffText, diffPct, familyShare, familyBreakdown, incomesNormais,
      catLabels, catData, catColors, monthlyData, budgetItems, savingsRate,
    };
  }, [activeMonth, activeMember, state.expenses, state.members, state.categoryBudgets, getExpensesForMonth, getExpensesByExactMonth, getOutflows, getIndividualMembers]);

  const toggleValues = () => setValuesHidden(v => !v);

  return (
    <>
      {/* ── Bento Grid: Resumo Financeiro ── */}
      <div className="mb-4 animate-fade-in-up">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold t-text">Resumo Financeiro</h3>
          <button onClick={toggleValues}
            className="cursor-pointer hover:opacity-60 transition-opacity px-1"
            title={valuesHidden ? 'Mostrar valores' : 'Ocultar valores'}>
            {valuesHidden ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="bento-grid">
          {/* Card: Receitas */}
          <div className="glass-card rounded-xl p-4 md:p-5 animate-fade-in-up stagger-1">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs t-text-muted font-semibold uppercase tracking-wide">Receitas</div>
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-green-500" />
              </div>
            </div>
            <AnimatedValue value={data.totalIncome} hidden={valuesHidden}
              className="text-lg md:text-2xl font-bold text-green-500" />
            <div className="text-xs t-text-dim mt-2">{data.incomesNormais.length} entrada{data.incomesNormais.length !== 1 ? 's' : ''} em {fmtMonth(activeMonth)}</div>
          </div>

          {/* Card: Despesas */}
          <div className="glass-card rounded-xl p-4 md:p-5 animate-fade-in-up stagger-2">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs t-text-muted font-semibold uppercase tracking-wide">Despesas</div>
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <TrendingDown size={16} className="text-red-500" />
              </div>
            </div>
            <AnimatedValue value={data.despesasReais} hidden={valuesHidden}
              className="text-lg md:text-2xl font-bold text-red-500" />
            <div className="text-xs t-text-dim mt-2">
              {valuesHidden ? '••••' : (
                <span className="flex items-center gap-1">
                  {data.diffPct !== 0 && (
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[0.65rem] font-bold ${
                      data.diffPct > 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                    }`}>
                      {data.diffPct > 0 ? '↑' : '↓'} {Math.abs(data.diffPct)}%
                    </span>
                  )}
                  <span>vs mês anterior</span>
                </span>
              )}
            </div>
            {!valuesHidden && data.familyShare > 0 && (
              <div className="text-[0.72rem] t-text-dim mt-1">incl. {fmt(data.familyShare)} rateio familiar</div>
            )}
            {!valuesHidden && data.familyBreakdown.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {data.familyBreakdown.map((fb, i) => (
                  <div key={i} className="text-[0.72rem] t-text-muted">{fb.label}: {fmt(fb.value)}</div>
                ))}
              </div>
            )}
          </div>

          {/* Card: Saldo — span 2 on large */}
          <div className="glass-card rounded-xl p-4 md:p-5 animate-fade-in-up stagger-3 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs t-text-muted font-semibold uppercase tracking-wide">Saldo Disponível</div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${data.saldo >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <Wallet size={16} className={data.saldo >= 0 ? 'text-green-500' : 'text-red-500'} />
              </div>
            </div>
            <AnimatedValue value={data.saldo} hidden={valuesHidden}
              className={`text-xl md:text-2xl font-bold ${data.saldo >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            <div className="text-xs t-text-dim mt-2">
              {valuesHidden ? '••••' : (data.totalIncome > 0 ? (
                <span className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[0.65rem] font-bold ${
                    data.savingsRate >= 20 ? 'bg-green-500/10 text-green-500' : data.savingsRate >= 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {data.savingsRate}%
                  </span>
                  <span>da receita restante</span>
                </span>
              ) : 'Sem receita registrada')}
            </div>
          </div>

          {/* Card: Investimentos */}
          <div className="glass-card rounded-xl p-4 md:p-5 animate-fade-in-up stagger-4 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs t-text-muted font-semibold uppercase tracking-wide">Investimentos</div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                <PiggyBank size={16} style={{ color: 'var(--accent)' }} />
              </div>
            </div>
            <AnimatedValue value={data.investTotal} hidden={valuesHidden}
              className="text-lg md:text-2xl font-bold" style={{ color: 'var(--accent)' }} />
            <div className="text-xs t-text-dim mt-2">{valuesHidden ? '••••' : data.investSub}</div>
          </div>
        </div>
      </div>

      {/* ── Gráficos — Bento Grid 2 cols ── */}
      <div className="glass-card rounded-xl mb-4 overflow-hidden animate-fade-in-up stagger-5">
        <div className="px-4 md:px-5 py-3">
          <h3 className="text-sm font-bold">Gráficos</h3>
        </div>
        <div className="px-3 md:px-5 pb-4 md:pb-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold t-text-muted uppercase mb-3">Gastos por Categoria</h4>
              <div className="h-56">
                {data.catLabels.length > 0 ? (
                  <Doughnut
                    data={{ labels: data.catLabels, datasets: [{ data: data.catData, backgroundColor: data.catColors, borderWidth: 0, borderRadius: 4 }] }}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      cutout: '70%',
                      animation: { duration: 1000, easing: 'easeOutQuart' },
                      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12, usePointStyle: true, pointStyle: 'circle' } } },
                    }}
                  />
                ) : <div className="flex items-center justify-center h-full t-text-dim text-sm">Sem dados</div>}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold t-text-muted uppercase mb-3">Evolução Mensal (6 meses)</h4>
              <div className="h-56">
                <Bar
                  data={{
                    labels: data.monthlyData.map(d => d.label),
                    datasets: [
                      { label: 'Receitas', data: data.monthlyData.map(d => d.income), backgroundColor: 'rgba(16,185,129,0.8)', borderRadius: 6 },
                      { label: 'Despesas', data: data.monthlyData.map(d => d.expense), backgroundColor: 'rgba(239,68,68,0.8)', borderRadius: 6 },
                    ],
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 1200, easing: 'easeOutQuart' },
                    plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12, usePointStyle: true, pointStyle: 'circle' } } },
                    scales: {
                      y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { font: { size: 10 } } },
                      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orçamentos por categoria */}
      {data.budgetItems.length > 0 && (
        <Section title="Orçamento por Categoria" icon={<Target size={18} />} defaultOpen>
          <div className="space-y-3">
            {data.budgetItems.map(b => {
              const color = b.pct >= 100 ? '#ef4444' : b.pct >= 80 ? '#f59e0b' : '#10b981';
              const bgColor = b.pct >= 100 ? 'bg-red-50' : b.pct >= 80 ? 'bg-amber-50' : 'bg-green-50';
              const catColor = CAT_COLORS[b.cat] || '#94a3b8';
              return (
                <div key={b.cat}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: catColor }} />
                      <span className="text-sm font-medium t-text">{b.cat}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <HiddenValue hidden={valuesHidden} className="font-semibold" style={{ color }}>
                        {fmt(b.spent)}
                      </HiddenValue>
                      <span className="t-text-dim">/</span>
                      <HiddenValue hidden={valuesHidden} className="t-text-muted">
                        {fmt(b.limit)}
                      </HiddenValue>
                      <span className={`px-1.5 py-0.5 rounded-full text-[0.65rem] font-bold ${bgColor}`} style={{ color }}>
                        {Math.round(b.pct)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full animate-progress"
                      style={{ width: `${Math.min(b.pct, 100)}%`, background: color }}
                    />
                  </div>
                  {b.pct >= 100 && (
                    <div className="text-[0.7rem] text-red-500 mt-0.5 font-medium">
                      Limite ultrapassado em {fmt(b.spent - b.limit)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

    </>
  );
}
