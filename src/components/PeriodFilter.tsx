'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { fmtMonth, buildMonthList, formatDate } from '@/lib/helpers';

interface DateFilter {
  type: 'month' | 'preset' | 'custom';
  month?: string;
  preset?: string;
  startDate?: string;
  endDate?: string;
}

// Export for use in other components
export type { DateFilter };

// Get a label for the current filter
export function getFilterLabel(filter: DateFilter): string {
  switch (filter.type) {
    case 'month':
      return fmtMonth(filter.month || '');
    case 'preset':
      const labels: Record<string, string> = {
        today: 'Hoje',
        '7days': 'Ultimos 7 dias',
        '15days': 'Ultimos 15 dias',
        '30days': 'Ultimos 30 dias',
      };
      return labels[filter.preset || ''] || '';
    case 'custom':
      if (filter.startDate && filter.endDate) {
        if (filter.startDate === filter.endDate) return formatDate(filter.startDate);
        return `${formatDate(filter.startDate)} - ${formatDate(filter.endDate)}`;
      }
      return 'Periodo personalizado';
    default:
      return '';
  }
}

export default function PeriodFilter() {
  const { state, setActiveMonth, setState } = useStore();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'month' | 'period'>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const months = buildMonthList();

  // Current filter state - stored in state.activeMonth for months, or state.dateFilter for periods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dateFilter: DateFilter = (state as any).dateFilter || { type: 'month', month: state.activeMonth };

  function applyMonth(ym: string) {
    setActiveMonth(ym);
    setState(prev => ({ ...prev, dateFilter: { type: 'month', month: ym } } as typeof prev));
    setOpen(false);
  }

  function applyPreset(preset: string) {
    setState(prev => ({ ...prev, dateFilter: { type: 'preset', preset } } as typeof prev));
    setOpen(false);
  }

  function applyCustom() {
    if (!customStart) return;
    const end = customEnd || customStart;
    setState(prev => ({ ...prev, dateFilter: { type: 'custom', startDate: customStart, endDate: end } } as typeof prev));
    setOpen(false);
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="px-3 py-1.5 border rounded-lg text-sm t-input cursor-pointer flex items-center gap-2 min-w-[160px]">
        <span>📅</span>
        <span className="font-medium">{getFilterLabel(dateFilter)}</span>
        <span className="ml-auto t-text-dim text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>
          <div className="absolute top-full mt-1 right-0 z-50 t-card border rounded-xl shadow-xl w-80 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b t-border">
              <button onClick={() => setTab('month')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${tab === 'month' ? 't-accent border-b-2' : 't-text-muted'}`}
                style={tab === 'month' ? { borderBottomColor: 'var(--accent)' } : {}}>
                Mes
              </button>
              <button onClick={() => setTab('period')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${tab === 'period' ? 't-accent border-b-2' : 't-text-muted'}`}
                style={tab === 'period' ? { borderBottomColor: 'var(--accent)' } : {}}>
                Periodo
              </button>
            </div>

            {tab === 'month' ? (
              <div className="p-3 max-h-60 overflow-y-auto">
                {months.map(ym => (
                  <button key={ym} onClick={() => applyMonth(ym)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors mb-0.5 ${
                      dateFilter.type === 'month' && dateFilter.month === ym ? 't-accent-light font-semibold' : 't-text hover:opacity-80'
                    }`}>
                    {fmtMonth(ym)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {/* Presets */}
                <div className="text-[0.7rem] t-text-dim font-semibold uppercase tracking-wider mb-1">Atalhos</div>
                {[
                  { id: 'today', label: 'Hoje' },
                  { id: '7days', label: 'Ultimos 7 dias' },
                  { id: '15days', label: 'Ultimos 15 dias' },
                  { id: '30days', label: 'Ultimos 30 dias' },
                ].map(p => (
                  <button key={p.id} onClick={() => applyPreset(p.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                      dateFilter.type === 'preset' && dateFilter.preset === p.id ? 't-accent-light font-semibold' : 't-text hover:opacity-80'
                    }`}>
                    {p.label}
                  </button>
                ))}

                {/* Custom range */}
                <div className="border-t t-border pt-3 mt-2">
                  <div className="text-[0.7rem] t-text-dim font-semibold uppercase tracking-wider mb-2">Periodo personalizado</div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-[0.7rem] t-text-dim block mb-1">De</label>
                      <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                        className="w-full px-2 py-1.5 border rounded-lg text-xs t-input" />
                    </div>
                    <div>
                      <label className="text-[0.7rem] t-text-dim block mb-1">Ate</label>
                      <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                        className="w-full px-2 py-1.5 border rounded-lg text-xs t-input" />
                    </div>
                  </div>
                  <button onClick={applyCustom} disabled={!customStart}
                    className="w-full py-2 t-accent-bg text-white rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50">
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
