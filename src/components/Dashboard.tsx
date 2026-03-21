'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { fmt, fmtMonth, getTotal, groupBy } from '@/lib/helpers';
import { CAT_COLORS } from '@/lib/constants';
import { generateTips } from '@/lib/tips';
import type { Tip } from '@/lib/tips';

import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Check, AlertTriangle, Info, Eye, EyeOff, ChevronDown, Brain, Target } from 'lucide-react';
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

function TipItem({ tip }: { tip: Tip }) {
  const styles: Record<string, string> = {
    good: 'bg-green-50 border-green-500',
    info: 'bg-blue-50 border-blue-600',
    warn: 'bg-amber-50 border-amber-500',
    bad: 'bg-red-50 border-red-500',
  };
  const icons: Record<string, React.ReactNode> = {
    ok: <Check size={18} className="text-green-600" />,
    '!': <AlertTriangle size={18} className="text-amber-500" />,
    i: <Info size={18} className="text-blue-600" />,
  };
  return (
    <div className={`flex gap-3 p-3 rounded-lg mb-2 border-l-[3px] text-[0.83rem] leading-relaxed ${styles[tip.type]}`}>
      <div className="flex-shrink-0 mt-0.5">{icons[tip.icon] || <Info size={18} className="text-blue-600" />}</div>
      <div><strong className="block font-semibold mb-0.5">{tip.title}</strong>{tip.text}</div>
    </div>
  );
}

export { TipItem };

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
    <div className="t-card rounded-xl border mb-4 overflow-hidden">
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
          <ChevronDown size={14} className="t-text-dim transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </div>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
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
  const [valuesHidden, setValuesHidden] = useState(true); // Oculto por padrão

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

    const tips = generateTips(allEntries, activeMember, getIndividualMembers);

    // Budget data
    const budgets = state.categoryBudgets || {};
    const budgetItems = Object.entries(budgets)
      .filter(([, limit]) => limit > 0)
      .map(([cat, limit]) => {
        const spent = outflows.filter(e => e.cat === cat).reduce((s, e) => s + e.value, 0);
        const pct = limit > 0 ? (spent / limit) * 100 : 0;
        return { cat, limit, spent, pct };
      })
      .sort((a, b) => b.pct - a.pct);

    return {
      totalIncome, despesasReais, saldo, investTotal, investSub,
      diffText, familyShare, familyBreakdown, incomesNormais,
      catLabels, catData, catColors, monthlyData, tips, budgetItems,
    };
  }, [activeMonth, activeMember, state.expenses, state.members, getExpensesForMonth, getExpensesByExactMonth, getOutflows, getIndividualMembers]);

  const toggleValues = () => setValuesHidden(v => !v);

  return (
    <>
      {/* Resumo Financeiro — sempre expandido, olho para ocultar/mostrar valores */}
      <div className="t-card rounded-xl border mb-4 overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-5 py-3">
          <h3 className="text-sm font-bold">Resumo Financeiro</h3>
          <button onClick={toggleValues}
            className="cursor-pointer hover:opacity-60 transition-opacity px-1"
            title={valuesHidden ? 'Mostrar valores' : 'Ocultar valores'}>
            {valuesHidden ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <div className="px-3 md:px-5 pb-4 md:pb-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            <div className="t-card rounded-xl p-4 border">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Receitas</div>
              <HiddenValue hidden={valuesHidden} className="text-lg md:text-2xl font-bold text-green-600">{fmt(data.totalIncome)}</HiddenValue>
              <div className="text-xs text-slate-400 mt-1">{data.incomesNormais.length} entrada{data.incomesNormais.length !== 1 ? 's' : ''} em {fmtMonth(activeMonth)}</div>
            </div>
            <div className="t-card rounded-xl p-4 border">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Despesas</div>
              <HiddenValue hidden={valuesHidden} className="text-lg md:text-2xl font-bold text-red-600">{fmt(data.despesasReais)}</HiddenValue>
              <div className="text-xs text-slate-400 mt-1">
                {valuesHidden ? '••••' : data.diffText}
                {!valuesHidden && data.familyShare > 0 && <><br /><span className="text-[0.72rem]">incl. {fmt(data.familyShare)} rateio familiar</span></>}
              </div>
              {!valuesHidden && data.familyBreakdown.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {data.familyBreakdown.map((fb, i) => (
                    <div key={i} className="text-[0.72rem] text-slate-500">{fb.label}: {fmt(fb.value)}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="t-card rounded-xl p-4 border">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Saldo Disponível</div>
              <HiddenValue hidden={valuesHidden} className={`text-2xl font-bold ${data.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(data.saldo)}</HiddenValue>
              <div className="text-xs text-slate-400 mt-1">
                {valuesHidden ? '••••' : (data.totalIncome > 0 ? `${Math.round((1 - data.despesasReais / data.totalIncome) * 100)}% da receita restante` : 'Sem receita registrada')}
              </div>
            </div>
            <div className="t-card rounded-xl p-4 border">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Saldo Investimentos</div>
              <HiddenValue hidden={valuesHidden} className="text-lg md:text-2xl font-bold text-blue-600">{fmt(data.investTotal)}</HiddenValue>
              <div className="text-xs text-slate-400 mt-1">{valuesHidden ? '••••' : data.investSub}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos — sempre expandido, sem colapsável */}
      <div className="t-card rounded-xl border mb-4 overflow-hidden">
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
                    data={{ labels: data.catLabels, datasets: [{ data: data.catData, backgroundColor: data.catColors, borderWidth: 2, borderColor: '#fff' }] }}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      animation: { duration: 800, easing: 'easeOutQuart' },
                      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
                    }}
                  />
                ) : <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sem dados</div>}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold t-text-muted uppercase mb-3">Evolução Mensal (6 meses)</h4>
              <div className="h-56">
                <Bar
                  data={{
                    labels: data.monthlyData.map(d => d.label),
                    datasets: [
                      { label: 'Receitas', data: data.monthlyData.map(d => d.income), backgroundColor: '#16a34a' },
                      { label: 'Despesas', data: data.monthlyData.map(d => d.expense), backgroundColor: '#dc2626' },
                    ],
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 1000, easing: 'easeOutQuart' },
                    plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
                    scales: { y: { beginAtZero: true } },
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
              const color = b.pct >= 100 ? '#dc2626' : b.pct >= 80 ? '#f59e0b' : '#16a34a';
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
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(b.pct, 100)}%`, background: color }}
                    />
                  </div>
                  {b.pct >= 100 && (
                    <div className="text-[0.7rem] text-red-600 mt-0.5 font-medium">
                      Limite ultrapassado em {fmt(b.spent - b.limit)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Dicas — colapsável, fechado por padrão */}
      <Section title="Dicas do Assistente Financeiro" icon={<Brain size={18} />}>
        {data.tips.length > 0 ? data.tips.map((t, i) => <TipItem key={i} tip={t} />) : (
          <div className="text-slate-400 text-sm">Adicione lançamentos para receber dicas.</div>
        )}
      </Section>
    </>
  );
}
