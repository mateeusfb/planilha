'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { fmt, fmtMonth, getTotal, groupBy } from '@/lib/helpers';
import { CAT_COLORS } from '@/lib/constants';
import { generateTips } from '@/lib/tips';
import type { Tip } from '@/lib/tips';

import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

function TipItem({ tip }: { tip: Tip }) {
  const styles: Record<string, string> = {
    good: 'bg-green-50 border-green-500',
    info: 'bg-blue-50 border-blue-600',
    warn: 'bg-amber-50 border-amber-500',
    bad: 'bg-red-50 border-red-500',
  };
  const icons: Record<string, string> = { ok: '✓', '!': '⚠', i: 'ℹ' };
  return (
    <div className={`flex gap-3 p-3 rounded-lg mb-2 border-l-[3px] text-[0.83rem] leading-relaxed ${styles[tip.type]}`}>
      <div className="text-lg flex-shrink-0 mt-0.5">{icons[tip.icon] || 'ℹ'}</div>
      <div><strong className="block font-semibold mb-0.5">{tip.title}</strong>{tip.text}</div>
    </div>
  );
}

export { TipItem };

export default function Dashboard() {
  const { state, getExpensesForMonth, getOutflows, getIndividualMembers } = useStore();
  const { activeMonth, activeMember } = state;

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

    // Previous month comparison
    const [y, m] = activeMonth.split('-').map(Number);
    const prevD = new Date(y, m - 2, 1);
    const prevYM = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`;
    const prevOutflows = getOutflows(prevYM, activeMember);
    const prevExpense = getTotal(prevOutflows) - prevOutflows.filter(e => e.cat === 'Investimento').reduce((s, e) => s + e.value, 0);
    const diff = despesasReais - prevExpense;
    const diffText = prevExpense > 0 ? `${diff >= 0 ? '+' : ''}${fmt(diff)} vs mes anterior` : 'Sem dados do mes anterior';

    // Family breakdown
    let familyBreakdown: { label: string; value: number }[] = [];
    if (activeMember === 'all') {
      const famOut = outflows.filter(e => !e.memberId || e.memberId === 'all');
      const famTotal = getTotal(famOut) - famOut.filter(e => e.cat === 'Investimento').reduce((s, e) => s + e.value, 0);
      if (famTotal > 0) familyBreakdown.push({ label: '🏠 Familia (conjunto)', value: famTotal });
      getIndividualMembers().forEach(mb => {
        const mbOut = outflows.filter(e => e.memberId === mb.id);
        const mbTotal = getTotal(mbOut) - mbOut.filter(e => e.cat === 'Investimento').reduce((s, e) => s + e.value, 0);
        if (mbTotal > 0) familyBreakdown.push({ label: `👤 ${mb.name}`, value: mbTotal });
      });
    }

    // Invest sub
    const investSubParts: string[] = [];
    if (investSaida > 0) investSubParts.push(`${fmt(investSaida)} aplicado`);
    if (totalIncomeInvest > 0) investSubParts.push(`${fmt(totalIncomeInvest)} rendimento`);
    const investSub = investSubParts.length > 0 ? investSubParts.join(' | ') : (totalIncome > 0 ? '0% da receita' : 'Sem movimentacao');

    // Chart data
    const byCat = groupBy(outflows, 'cat');
    const catLabels = Object.keys(byCat);
    const catData = catLabels.map(l => byCat[l]);
    const catColors = catLabels.map(l => CAT_COLORS[l] || '#94a3b8');

    // Monthly chart (6 months)
    const monthlyData: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const all = getExpensesForMonth(ym, activeMember);
      monthlyData.push({
        label: fmtMonth(ym),
        income: getTotal(all.filter(e => e.type === 'income' && e.cat !== 'Investimento')),
        expense: getTotal(all.filter(e => e.type !== 'income' && e.cat !== 'Investimento')),
      });
    }

    // Tips
    const tips = generateTips(allEntries, activeMember, getIndividualMembers);

    return {
      totalIncome, despesasReais, saldo, investTotal, investSub,
      diffText, familyShare, familyBreakdown, incomesNormais,
      catLabels, catData, catColors, monthlyData, tips,
    };
  }, [activeMonth, activeMember, state.expenses, state.members, getExpensesForMonth, getOutflows, getIndividualMembers]);

  return (
    <>
      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Receitas</div>
          <div className="text-2xl font-bold text-green-600">{fmt(data.totalIncome)}</div>
          <div className="text-xs text-slate-400 mt-1">{data.incomesNormais.length} entrada{data.incomesNormais.length !== 1 ? 's' : ''} em {fmtMonth(activeMonth)}</div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Despesas</div>
          <div className="text-2xl font-bold text-red-600">{fmt(data.despesasReais)}</div>
          <div className="text-xs text-slate-400 mt-1">
            {data.diffText}
            {data.familyShare > 0 && <><br /><span className="text-[0.72rem]">incl. {fmt(data.familyShare)} rateio familiar</span></>}
          </div>
          {data.familyBreakdown.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {data.familyBreakdown.map((fb, i) => (
                <div key={i} className="text-[0.72rem] text-slate-500">{fb.label}: {fmt(fb.value)}</div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Saldo Disponivel</div>
          <div className={`text-2xl font-bold ${data.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(data.saldo)}</div>
          <div className="text-xs text-slate-400 mt-1">
            {data.totalIncome > 0 ? `${Math.round((1 - data.despesasReais / data.totalIncome) * 100)}% da receita restante` : 'Sem receita registrada'}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Saldo Investimentos</div>
          <div className="text-2xl font-bold text-blue-600">{fmt(data.investTotal)}</div>
          <div className="text-xs text-slate-400 mt-1">{data.investSub}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <h3 className="text-sm font-bold mb-4">Gastos por Categoria</h3>
          <div className="h-56">
            {data.catLabels.length > 0 ? (
              <Doughnut
                data={{ labels: data.catLabels, datasets: [{ data: data.catData, backgroundColor: data.catColors, borderWidth: 2, borderColor: '#fff' }] }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }}
              />
            ) : <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sem dados</div>}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <h3 className="text-sm font-bold mb-4">Evolucao Mensal (6 meses)</h3>
          <div className="h-56">
            <Bar
              data={{
                labels: data.monthlyData.map(d => d.label),
                datasets: [
                  { label: 'Receitas', data: data.monthlyData.map(d => d.income), backgroundColor: '#16a34a' },
                  { label: 'Despesas', data: data.monthlyData.map(d => d.expense), backgroundColor: '#dc2626' },
                ],
              }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }, scales: { y: { beginAtZero: true } } }}
            />
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-white rounded-xl p-5 border border-slate-200">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-1.5">🧠 Dicas do Assistente Financeiro</h3>
        {data.tips.length > 0 ? data.tips.map((t, i) => <TipItem key={i} tip={t} />) : (
          <div className="text-slate-400 text-sm">Adicione lancamentos para receber dicas.</div>
        )}
      </div>
    </>
  );
}
