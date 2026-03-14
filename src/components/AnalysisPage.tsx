'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { fmt, getTotal, groupBy } from '@/lib/helpers';
import { CAT_COLORS, PAY_COLORS } from '@/lib/constants';
import { generateTips } from '@/lib/tips';
import { TipItem } from './Dashboard';

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie, Doughnut } from 'react-chartjs-2';
ChartJS.register(ArcElement, Tooltip, Legend);

export default function AnalysisPage() {
  const { state, getExpensesForMonth, getIndividualMembers } = useStore();
  const { activeMonth, activeMember } = state;

  const data = useMemo(() => {
    const allEntries = getExpensesForMonth(activeMonth, activeMember);
    let expenses = allEntries.filter(e => e.type !== 'income');

    let familyShare = 0;
    let familyShareCount = 0;
    if (activeMember !== 'all') {
      const individualCount = getIndividualMembers().length;
      if (individualCount > 0) {
        const familyOutflows = state.expenses.filter(e =>
          e.month === activeMonth && e.type !== 'income' && (!e.memberId || e.memberId === 'all')
        );
        const sharedEntries = familyOutflows.map(e => ({ ...e, value: Math.round((e.value / individualCount) * 100) / 100 }));
        familyShare = getTotal(sharedEntries);
        familyShareCount = individualCount;
        expenses = [...expenses, ...sharedEntries];
      }
    }

    const byCat = groupBy(expenses, 'cat');
    const byPay = groupBy(expenses, 'payment');
    const total = getTotal(expenses);

    const catLabels = Object.keys(byCat);
    const catData = catLabels.map(l => byCat[l]);
    const catColors = catLabels.map(l => CAT_COLORS[l] || '#94a3b8');

    const payLabels = Object.keys(byPay);
    const payData = payLabels.map(l => byPay[l]);
    const payColors = payLabels.map(l => PAY_COLORS[l] || '#94a3b8');

    const sortedCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

    const tips = generateTips(allEntries, activeMember, getIndividualMembers);

    return { catLabels, catData, catColors, payLabels, payData, payColors, sortedCats, total, familyShare, familyShareCount, tips, hasData: expenses.length > 0 };
  }, [activeMonth, activeMember, state.expenses, state.members, getExpensesForMonth, getIndividualMembers]);

  return (
    <>
      {/* Tips */}
      <div className="t-card rounded-xl p-5 border mb-6">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-1.5">🧠 Analise Inteligente dos seus Gastos</h3>
        {data.tips.length > 0 ? data.tips.map((t, i) => <TipItem key={i} tip={t} />) : (
          <div className="text-slate-400 text-sm">Adicione lancamentos para receber analises.</div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="t-card rounded-xl p-5 border">
          <h3 className="text-sm font-bold mb-4">Distribuicao por Categoria</h3>
          <div className="h-56">
            {data.catLabels.length > 0 ? (
              <Pie data={{ labels: data.catLabels, datasets: [{ data: data.catData, backgroundColor: data.catColors, borderWidth: 2, borderColor: '#fff' }] }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }} />
            ) : <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sem dados</div>}
          </div>
        </div>
        <div className="t-card rounded-xl p-5 border">
          <h3 className="text-sm font-bold mb-4">Forma de Pagamento</h3>
          <div className="h-56">
            {data.payLabels.length > 0 ? (
              <Doughnut data={{ labels: data.payLabels, datasets: [{ data: data.payData, backgroundColor: data.payColors, borderWidth: 2, borderColor: '#fff' }] }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }} />
            ) : <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sem dados</div>}
          </div>
        </div>
      </div>

      {/* Category bars */}
      <div className="t-card rounded-xl p-5 border">
        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">Categorias Detalhadas</div>
        {data.familyShare > 0 && (
          <div className="bg-blue-50 border-l-[3px] border-blue-600 rounded-lg px-3 py-2 mb-3 text-[0.82rem]">
            Inclui <strong>{fmt(data.familyShare)}</strong> de rateio familiar (sua parte: 1/{data.familyShareCount} membros)
          </div>
        )}
        {data.hasData ? data.sortedCats.map(([cat, val]) => {
          const pct = data.total > 0 ? Math.round(val / data.total * 100) : 0;
          const color = CAT_COLORS[cat] || '#94a3b8';
          return (
            <div key={cat} className="mb-2.5">
              <div className="flex justify-between text-[0.82rem] mb-1">
                <span><span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: color }}></span>{cat}</span>
                <span className="font-semibold">{fmt(val)} <span className="text-slate-400 font-normal">({pct}%)</span></span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }}></div>
              </div>
            </div>
          );
        }) : <p className="text-slate-400 text-sm">Sem dados para o mes selecionado.</p>}
      </div>
    </>
  );
}
