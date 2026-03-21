'use client';

import { useMemo, useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { fmt, getTotal, groupBy } from '@/lib/helpers';
import { CAT_COLORS, PAY_COLORS } from '@/lib/constants';
import { useToast } from './Toast';
import { Tag, CreditCard, Landmark, User, ImageIcon, FileText, Download } from 'lucide-react';
import { exportToPDF } from '@/lib/export';

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie, Doughnut } from 'react-chartjs-2';
ChartJS.register(ArcElement, Tooltip, Legend);

const MEMBER_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#db2777', '#65a30d'];
const BANK_COLORS = ['#7c3aed', '#8b5cf6', '#6d28d9', '#059669', '#0891b2', '#d97706', '#dc2626', '#2563eb', '#db2777', '#64748b'];

type ChartTab = 'cat' | 'pay' | 'bank' | 'member';

export default function AnalysisPage() {
  const { state, getExpensesForMonth, getIndividualMembers } = useStore();
  const { activeMonth, activeMember } = state;
  const [chartTab, setChartTab] = useState<ChartTab>('cat');
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const tabTitles: Record<ChartTab, string> = {
    cat: 'Categoria', pay: 'Pagamento', bank: 'Instituição', member: 'Membro',
  };

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

    const total = getTotal(expenses);

    // Por categoria
    const byCat = groupBy(expenses, 'cat');
    const catLabels = Object.keys(byCat);
    const catData = catLabels.map(l => byCat[l]);
    const catColors = catLabels.map(l => CAT_COLORS[l] || '#94a3b8');
    const sortedCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

    // Por pagamento
    const byPay = groupBy(expenses, 'payment');
    const payLabels = Object.keys(byPay);
    const payData = payLabels.map(l => byPay[l]);
    const payColors = payLabels.map(l => PAY_COLORS[l] || '#94a3b8');
    const sortedPays = Object.entries(byPay).sort((a, b) => b[1] - a[1]);

    // Por instituição
    const byBank: Record<string, number> = {};
    expenses.forEach(e => {
      const bank = e.bank || 'Não informado';
      byBank[bank] = (byBank[bank] || 0) + e.value;
    });
    const bankLabels = Object.keys(byBank);
    const bankData = bankLabels.map(l => byBank[l]);
    const bankColors = bankLabels.map((_, i) => BANK_COLORS[i % BANK_COLORS.length]);
    const sortedBanks = Object.entries(byBank).sort((a, b) => b[1] - a[1]);

    // Por membro
    const byMember: Record<string, number> = {};
    const memberNames: Record<string, string> = {};
    expenses.forEach(e => {
      const mid = e.memberId || 'all';
      const member = state.members.find(m => m.id === mid);
      const name = member?.name || (mid === 'all' ? 'Família' : 'Outro');
      memberNames[mid] = name;
      byMember[mid] = (byMember[mid] || 0) + e.value;
    });
    const memberLabels = Object.keys(byMember).map(id => memberNames[id]);
    const memberData = Object.values(byMember);
    const memberColors = Object.keys(byMember).map((id, i) => {
      const member = state.members.find(m => m.id === id);
      return member?.color || MEMBER_COLORS[i % MEMBER_COLORS.length];
    });
    const sortedMembers = Object.entries(byMember).map(([id, val]) => [memberNames[id], val] as [string, number]).sort((a, b) => b[1] - a[1]);

    return {
      total, familyShare, familyShareCount,
      catLabels, catData, catColors, sortedCats,
      payLabels, payData, payColors, sortedPays,
      bankLabels, bankData, bankColors, sortedBanks,
      memberLabels, memberData, memberColors, sortedMembers,
      hasData: expenses.length > 0,
    };
  }, [activeMonth, activeMember, state.expenses, state.members, getExpensesForMonth, getIndividualMembers]);

  const tabs: { id: ChartTab; label: string; icon: React.ReactNode }[] = [
    { id: 'cat', label: 'Categoria', icon: <Tag size={14} /> },
    { id: 'pay', label: 'Pagamento', icon: <CreditCard size={14} /> },
    { id: 'bank', label: 'Instituição', icon: <Landmark size={14} /> },
    { id: 'member', label: 'Membro', icon: <User size={14} /> },
  ];

  // Dados do gráfico ativo
  const chartData: Record<ChartTab, { labels: string[]; data: number[]; colors: string[] }> = {
    cat: { labels: data.catLabels, data: data.catData, colors: data.catColors },
    pay: { labels: data.payLabels, data: data.payData, colors: data.payColors },
    bank: { labels: data.bankLabels, data: data.bankData, colors: data.bankColors },
    member: { labels: data.memberLabels, data: data.memberData, colors: data.memberColors },
  };

  const sortedData: Record<ChartTab, [string, number][]> = {
    cat: data.sortedCats,
    pay: data.sortedPays,
    bank: data.sortedBanks,
    member: data.sortedMembers,
  };

  const colorMap: Record<ChartTab, Record<string, string>> = {
    cat: CAT_COLORS,
    pay: PAY_COLORS,
    bank: Object.fromEntries(data.bankLabels.map((l, i) => [l, BANK_COLORS[i % BANK_COLORS.length]])),
    member: Object.fromEntries(data.memberLabels.map((l, i) => [l, data.memberColors[i]])),
  };

  const active = chartData[chartTab];
  const sorted = sortedData[chartTab];
  const colors = colorMap[chartTab];

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' as const },
    plugins: { legend: { position: 'bottom' as const, labels: { font: { size: 11 } } } },
  };

  function exportAs(format: 'png' | 'pdf') {
    setExporting(true);
    try {
      const chartCanvas = exportRef.current?.querySelector('canvas');
      if (!chartCanvas) { toast('Nenhum gráfico para exportar.', 'warning'); setExporting(false); return; }

      const chartImg = chartCanvas.toDataURL('image/png', 1.0);
      const rows = sorted.map(([label, val]) => {
        const pct = data.total > 0 ? Math.round(val / data.total * 100) : 0;
        return { label, value: fmt(val), pct, color: colors[label] || '#94a3b8' };
      });

      const pad = 30;
      const rowH = 32;
      const detailH = rows.length * rowH + 40;
      const w = Math.max(chartCanvas.width, 600);
      const totalH = chartCanvas.height + detailH + pad * 3;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = totalH;
      const ctx = canvas.getContext('2d')!;
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

      ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
      ctx.fillRect(0, 0, w, totalH);
      ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`Análise por ${tabTitles[chartTab]}`, pad, pad + 14);

      const chartX = Math.round((w - chartCanvas.width) / 2);
      const img = new Image();
      img.onload = async () => {
        ctx.drawImage(img, chartX, pad + 30);
        const detailY = pad + 30 + chartCanvas.height + 20;
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.fillText(`DETALHAMENTO POR ${tabTitles[chartTab].toUpperCase()}`, pad, detailY);

        rows.forEach((row, i) => {
          const y = detailY + 20 + i * rowH;
          ctx.beginPath();
          ctx.arc(pad + 5, y + 6, 5, 0, Math.PI * 2);
          ctx.fillStyle = row.color;
          ctx.fill();
          ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
          ctx.font = '13px sans-serif';
          ctx.fillText(row.label, pad + 16, y + 10);
          ctx.font = 'bold 13px sans-serif';
          const valText = `${row.value} (${row.pct}%)`;
          ctx.fillText(valText, w - pad - ctx.measureText(valText).width, y + 10);
          const barY = y + 18;
          const barW = w - pad * 2;
          ctx.fillStyle = isDark ? '#334155' : '#f1f5f9';
          ctx.fillRect(pad, barY, barW, 6);
          ctx.fillStyle = row.color;
          ctx.fillRect(pad, barY, barW * row.pct / 100, 6);
        });

        const finalData = canvas.toDataURL('image/png', 1.0);
        if (format === 'png') {
          const link = document.createElement('a');
          link.download = `analise-${tabTitles[chartTab].toLowerCase()}.png`;
          link.href = finalData;
          link.click();
          toast('Imagem exportada!', 'success');
        } else {
          // Create temporary element for PDF export
          const tempDiv = document.createElement('div');
          tempDiv.style.cssText = 'padding:30px;background:white;width:600px;position:absolute;left:-9999px';
          const title = document.createElement('h2');
          title.textContent = `Análise por ${tabTitles[chartTab]}`;
          title.style.cssText = 'font:bold 18px sans-serif;margin-bottom:16px;color:#1e293b';
          tempDiv.appendChild(title);
          const imgEl = document.createElement('img');
          imgEl.src = finalData;
          imgEl.style.cssText = 'max-width:100%;height:auto';
          tempDiv.appendChild(imgEl);
          document.body.appendChild(tempDiv);
          await exportToPDF(tempDiv, `analise-${tabTitles[chartTab].toLowerCase()}`);
          document.body.removeChild(tempDiv);
          toast('PDF exportado!', 'success');
        }
        setExporting(false);
      };
      img.src = chartImg;
    } catch (err) {
      console.error('Export error:', err);
      toast('Erro ao exportar.', 'error');
      setExporting(false);
    }
  }

  return (
    <>
      {/* Gráfico unificado */}
      <div className="t-card rounded-xl border mb-6 overflow-hidden">
        {/* Tabs + Export */}
        <div className="flex items-center justify-between px-4 pt-4 gap-2">
          <div className="flex gap-1 flex-wrap">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setChartTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  chartTab === t.id ? 't-accent-bg text-white shadow-sm' : 'bg-slate-100 t-text-muted hover:bg-slate-200'
                }`}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => exportAs('png')} disabled={exporting}
              className="px-2.5 py-1.5 border t-border rounded-lg text-[0.7rem] font-semibold t-text-muted hover:opacity-80 cursor-pointer disabled:opacity-50 flex items-center gap-1">
              <ImageIcon size={14} /> PNG
            </button>
            <button onClick={() => exportAs('pdf')} disabled={exporting}
              className="px-2.5 py-1.5 border t-border rounded-lg text-[0.7rem] font-semibold t-text-muted hover:opacity-80 cursor-pointer disabled:opacity-50 flex items-center gap-1">
              <FileText size={14} /> PDF
            </button>
          </div>
        </div>

        {/* Exportable area */}
        <div ref={exportRef}>
          {/* Chart */}
          <div className="p-5">
            <div className="h-64">
              {active.labels.length > 0 ? (
                chartTab === 'cat' ? (
                  <Pie
                    data={{ labels: active.labels, datasets: [{ data: active.data, backgroundColor: active.colors, borderWidth: 2, borderColor: '#fff' }] }}
                    options={chartOptions}
                  />
                ) : (
                  <Doughnut
                    data={{ labels: active.labels, datasets: [{ data: active.data, backgroundColor: active.colors, borderWidth: 2, borderColor: '#fff' }] }}
                    options={chartOptions}
                  />
                )
              ) : <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sem dados</div>}
            </div>
          </div>

          {/* Detalhamento */}
          <div className="px-5 pb-5">
            <div className="text-xs t-text-dim font-semibold uppercase tracking-wide mb-3">
              {chartTab === 'cat' ? 'Detalhamento por Categoria' : chartTab === 'pay' ? 'Detalhamento por Pagamento' : chartTab === 'bank' ? 'Detalhamento por Instituição' : 'Detalhamento por Membro'}
            </div>
            {data.familyShare > 0 && (
              <div className="bg-blue-50 border-l-[3px] border-blue-600 rounded-lg px-3 py-2 mb-3 text-[0.82rem]">
                Inclui <strong>{fmt(data.familyShare)}</strong> de rateio familiar (sua parte: 1/{data.familyShareCount} membros)
              </div>
            )}
            {data.hasData && sorted.length > 0 ? sorted.map(([label, val]) => {
              const pct = data.total > 0 ? Math.round(val / data.total * 100) : 0;
              const color = colors[label] || '#94a3b8';
              return (
                <div key={label} className="mb-2.5">
                  <div className="flex justify-between text-[0.82rem] mb-1">
                    <span><span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: color }}></span>{label}</span>
                    <span className="font-semibold">{fmt(val)} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }}></div>
                  </div>
                </div>
              );
            }) : <p className="text-slate-400 text-sm">Sem dados para o mês selecionado.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
