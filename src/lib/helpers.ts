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
  const now = new Date();
  const months: string[] = [];
  for (let i = -12; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}
