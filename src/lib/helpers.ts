export function fmt(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

export function fmtMonth(ym: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${months[parseInt(m) - 1]}/${y}`;
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function getTotal(expenses: { value: number }[]): number {
  return expenses.reduce((s, e) => s + (e.value || 0), 0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function groupBy(arr: any[], key: string): Record<string, number> {
  return arr.reduce((acc: Record<string, number>, item) => {
    const k = (item[key] as string) || 'Outros';
    acc[k] = (acc[k] || 0) + (item.value || 0);
    return acc;
  }, {});
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function buildMonthList(): string[] {
  const months: string[] = [];
  // Start from Jan 2026, go up to 3 months ahead of current month
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 1);
  const startDate = new Date(2026, 0, 1); // Jan 2026
  const d = new Date(startDate);
  while (d <= endDate) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() + 1);
  }
  return months;
}

export function formatDate(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

export function getDateRange(preset: string): { start: Date; end: Date } | null {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'today':
      return { start: today, end: now };
    case '7days':
      return { start: new Date(today.getTime() - 6 * 86400000), end: now };
    case '15days':
      return { start: new Date(today.getTime() - 14 * 86400000), end: now };
    case '30days':
      return { start: new Date(today.getTime() - 29 * 86400000), end: now };
    default:
      return null;
  }
}
