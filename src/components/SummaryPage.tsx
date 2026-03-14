'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { fmt, fmtMonth, getTotal, groupBy } from '@/lib/helpers';
import { CAT_COLORS } from '@/lib/constants';
import { generateTips } from '@/lib/tips';
import { TipItem } from './Dashboard';

export default function SummaryPage() {
  const { state, getExpensesForMonth, getIndividualMembers } = useStore();
  const { activeMonth, activeMember } = state;

  const data = useMemo(() => {
    const expenses = getExpensesForMonth(activeMonth, activeMember);
    let outflows = expenses.filter(e => e.type !== 'income');
    const incomes = expenses.filter(e => e.type === 'income');
    const incomesNormais = incomes.filter(e => e.cat !== 'Investimento');
    const incomesInvest = incomes.filter(e => e.cat === 'Investimento');
    const totalIncome = getTotal(incomesNormais);
    const totalIncomeInvest = getTotal(incomesInvest);

    let familyShare = 0;
    const indivCount = getIndividualMembers().length;
    if (activeMember !== 'all' && indivCount > 0) {
      const familyOutflows = state.expenses.filter(e =>
        e.month === activeMonth && e.type !== 'income' && (!e.memberId || e.memberId === 'all')
      );
      const prorated = familyOutflows.map(e => ({ ...e, value: Math.round((e.value / indivCount) * 100) / 100 }));
      familyShare = getTotal(prorated);
      outflows = [...outflows, ...prorated];
    }

    const total = getTotal(outflows);
    const investSaida = outflows.filter(e => e.cat === 'Investimento').reduce((s, e) => s + e.value, 0);
    const investTotal = investSaida + totalIncomeInvest;
    const despesasReais = total - investSaida;
    const saldo = totalIncome - despesasReais;
    const byCat = groupBy(outflows, 'cat');
    const byPay = groupBy(outflows, 'payment');

    // Family breakdown
    let familyBreakdown: { label: string; value: number }[] = [];
    if (activeMember === 'all') {
      const famOut = outflows.filter(e => !e.memberId || e.memberId === 'all');
      const famTotal = getTotal(famOut) - famOut.filter(e => e.cat === 'Investimento').reduce((s, e) => s + e.value, 0);
      if (famTotal > 0) familyBreakdown.push({ label: '🏠 Gastos em conjunto (familia)', value: famTotal });
      getIndividualMembers().forEach(mb => {
        const mbOut = outflows.filter(e => e.memberId === mb.id);
        const mbTotal = getTotal(mbOut) - mbOut.filter(e => e.cat === 'Investimento').reduce((s, e) => s + e.value, 0);
        if (mbTotal > 0) familyBreakdown.push({ label: `👤 ${mb.name}`, value: mbTotal });
      });
    }

    // 3 months history
    const [y, m] = activeMonth.split('-').map(Number);
    const monthHistory = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const all = getExpensesForMonth(ym, activeMember);
      let histTotal = getTotal(all.filter(e => e.type !== 'income'));
      if (activeMember !== 'all' && indivCount > 0) {
        const famOut = state.expenses.filter(e => e.month === ym && e.type !== 'income' && (!e.memberId || e.memberId === 'all'));
        histTotal += famOut.reduce((s, e) => s + e.value / indivCount, 0);
      }
      monthHistory.push({ ym, label: fmtMonth(ym), income: getTotal(all.filter(e => e.type === 'income')), total: histTotal });
    }

    const memberName = activeMember === 'all' ? 'Família' : (state.members.find(m => m.id === activeMember)?.name || 'Membro');
    const sortedCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const topCat = sortedCats[0];
    const tips = generateTips(expenses, activeMember, getIndividualMembers);

    return {
      totalIncome, despesasReais, saldo, investTotal, investSaida, totalIncomeInvest,
      familyShare, indivCount, familyBreakdown, byCat, byPay, total, sortedCats, topCat,
      monthHistory, memberName, tips, expenses, outflows,
    };
  }, [activeMonth, activeMember, state.expenses, state.members, getExpensesForMonth, getIndividualMembers]);

  const maxHist = Math.max(...data.monthHistory.map(x => Math.max(x.total, x.income)), 1);

  return (
    <>
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-7 text-white mb-5">
        <h2 className="text-xl font-bold mb-1">Resumo Financeiro - {fmtMonth(activeMonth)}</h2>
        <p className="text-white/80 text-sm">{data.memberName} - Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
        <div className="text-4xl font-bold my-3">{fmt(data.saldo >= 0 ? data.saldo : data.despesasReais)}</div>
        <div className="text-sm text-white/70">
          {data.saldo >= 0 && data.totalIncome > 0 ? 'Saldo disponível no mês' : 'Total de despesas (sem investimentos)'} | {data.expenses.length} lancamentos
        </div>
      </div>

      {/* Resumo do Mês */}
      <div className="t-card rounded-xl p-6 border mb-5">
        <h3 className="text-base font-bold mb-4 pb-3 border-b t-border">Resumo do Mês</h3>
        <Row label="Total de Receitas" value={fmt(data.totalIncome)} color="text-green-600" />
        <Row label="Despesas (sem investimentos)" value={fmt(data.despesasReais)} color="text-red-600" />
        {data.familyBreakdown.map((fb, i) => (
          <Row key={i} label={fb.label} value={fmt(fb.value)} color="text-red-600" sub />
        ))}
        {data.familyShare > 0 && <>
          <Row label="↳ Despesas proprias" value={fmt(data.despesasReais - data.familyShare)} color="text-red-600" sub />
          <Row label={`↳ Rateio familiar (1/${data.indivCount} membros)`} value={fmt(data.familyShare)} color="text-red-600" sub />
        </>}
        <div className="flex justify-between items-center py-2 border-b t-border-light text-sm bg-blue-50/60 rounded-lg px-2 my-1">
          <span className="text-blue-600">Saldo Investimentos</span>
          <span className="font-semibold text-blue-600">{fmt(data.investTotal)}</span>
        </div>
        {data.investSaida > 0 && <Row label="↳ Aplicado" value={fmt(data.investSaida)} color="text-blue-600" sub />}
        {data.totalIncomeInvest > 0 && <Row label="↳ Rendimento" value={fmt(data.totalIncomeInvest)} color="text-blue-600" sub />}
        <div className="flex justify-between items-center py-3 text-sm">
          <span className="font-bold">Saldo Disponivel</span>
          <span className={`font-bold text-lg ${data.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(data.saldo)}</span>
        </div>
        {data.totalIncome > 0 && <Row label="Taxa de Poupanca (incl. investimentos)" value={`${Math.max(0, Math.round((data.saldo + data.investTotal) / data.totalIncome * 100))}% da receita`} />}
        <Row label="Maior Categoria" value={data.topCat ? `${data.topCat[0]} (${fmt(data.topCat[1])})` : '-'} />
        <Row label="Parcelamentos Ativos" value={String(data.outflows.filter(e => e.installment > 0).length)} />
      </div>

      {/* Gastos por Categoria */}
      <div className="t-card rounded-xl p-6 border mb-5">
        <h3 className="text-base font-bold mb-4 pb-3 border-b t-border">Gastos por Categoria</h3>
        {data.sortedCats.length ? data.sortedCats.map(([cat, val]) => {
          const pct = data.total > 0 ? Math.round(val / data.total * 100) : 0;
          return <Row key={cat} label={<><span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: CAT_COLORS[cat] || '#94a3b8' }}></span>{cat}</>}
            value={<>{fmt(val)} <span className="text-slate-400 font-normal">({pct}%)</span></>} />;
        }) : <p className="text-slate-400 text-sm">Sem dados.</p>}
      </div>

      {/* Forma de Pagamento */}
      <div className="t-card rounded-xl p-6 border mb-5">
        <h3 className="text-base font-bold mb-4 pb-3 border-b t-border">Forma de Pagamento</h3>
        {Object.entries(data.byPay).sort((a, b) => b[1] - a[1]).map(([pay, val]) => {
          const pct = data.total > 0 ? Math.round(val / data.total * 100) : 0;
          return <Row key={pay} label={pay} value={<>{fmt(val)} <span className="text-slate-400 font-normal">({pct}%)</span></>} />;
        })}
      </div>

      {/* Comparativo */}
      <div className="t-card rounded-xl p-6 border mb-5">
        <h3 className="text-base font-bold mb-4 pb-3 border-b t-border">Comparativo - Ultimos 3 Meses</h3>
        {data.monthHistory.map(({ label, total: t, income: inc }) => (
          <div key={label} className="mb-3.5">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-semibold">{label}</span>
              <span className="text-xs text-slate-400">Rec: <b className="text-green-600">{fmt(inc)}</b> | Desp: <b className="text-red-600">{fmt(t)}</b></span>
            </div>
            <div className="space-y-1">
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.round(inc / maxHist * 100)}%` }}></div>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.round(t / maxHist * 100)}%` }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="t-card rounded-xl p-5 border mb-5">
        <h3 className="text-sm font-bold mb-4">🧠 Análise e Recomendações</h3>
        {data.tips.map((t, i) => <TipItem key={i} tip={t} />)}
      </div>

      {/* Full table */}
      {data.expenses.length > 0 && (
        <div className="t-card rounded-xl border overflow-hidden mb-6">
          <div className="p-4 border-b t-border"><h3 className="text-sm font-bold">Todos os Lançamentos</h3></div>
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                {['Descrição','Categoria','Valor','Pagamento','Parcelas'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500 border-b t-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.expenses.sort((a, b) => b.value - a.value).map(e => (
                <tr key={e.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 border-b t-border-light text-sm"><div className="font-semibold">{e.desc}</div>{e.note && <div className="text-[0.74rem] text-slate-400">{e.note}</div>}</td>
                  <td className="px-4 py-2.5 border-b t-border-light text-sm"><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: CAT_COLORS[e.cat] || '#94a3b8' }}></span>{e.cat}</td>
                  <td className="px-4 py-2.5 border-b t-border-light text-sm font-bold">{fmt(e.value)}</td>
                  <td className="px-4 py-2.5 border-b t-border-light text-sm">{e.payment}</td>
                  <td className="px-4 py-2.5 border-b t-border-light text-sm">{e.installment > 0 ? e.installment + 'x' : '-'}</td>
                </tr>
              ))}
              <tr className="bg-slate-50">
                <td colSpan={2} className="px-4 py-2.5 font-bold text-sm">TOTAL</td>
                <td className="px-4 py-2.5 font-bold text-red-600 text-sm">{fmt(data.total)}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Row({ label, value, color, sub }: { label: React.ReactNode; value: React.ReactNode; color?: string; sub?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-2 border-b t-border-light text-sm ${sub ? 'bg-blue-50/40 rounded-lg px-2 my-0.5' : ''}`}>
      <span className={`${sub ? 'text-blue-600 text-[0.82rem]' : 'text-slate-500'}`}>{label}</span>
      <span className={`font-semibold ${color || ''} ${sub ? 'text-[0.82rem]' : ''}`}>{value}</span>
    </div>
  );
}
