import { describe, it, expect } from 'vitest';
import { fmt, fmtMonth, genId, getTotal, groupBy, getCurrentMonth, buildMonthList, formatDate, getDateRange } from '@/lib/helpers';

describe('fmt', () => {
  it('formata valor em reais', () => {
    expect(fmt(1500)).toContain('1.500');
    expect(fmt(1500)).toContain('R$');
  });

  it('formata zero', () => {
    expect(fmt(0)).toContain('0,00');
  });

  it('formata valor nulo como zero', () => {
    expect(fmt(null as unknown as number)).toContain('0,00');
  });

  it('formata centavos', () => {
    expect(fmt(49.90)).toContain('49,90');
  });
});

describe('fmtMonth', () => {
  it('formata mês corretamente', () => {
    expect(fmtMonth('2026-01')).toBe('Jan/2026');
    expect(fmtMonth('2026-12')).toBe('Dez/2026');
    expect(fmtMonth('2026-06')).toBe('Jun/2026');
  });

  it('retorna vazio para string vazia', () => {
    expect(fmtMonth('')).toBe('');
  });
});

describe('genId', () => {
  it('gera IDs únicos', () => {
    const id1 = genId();
    const id2 = genId();
    expect(id1).not.toBe(id2);
  });

  it('gera string não vazia', () => {
    expect(genId().length).toBeGreaterThan(0);
  });
});

describe('getTotal', () => {
  it('soma valores corretamente', () => {
    expect(getTotal([{ value: 100 }, { value: 250 }, { value: 50 }])).toBe(400);
  });

  it('retorna 0 para array vazio', () => {
    expect(getTotal([])).toBe(0);
  });

  it('trata valores nulos como 0', () => {
    expect(getTotal([{ value: 100 }, { value: 0 }])).toBe(100);
  });
});

describe('groupBy', () => {
  it('agrupa despesas por categoria', () => {
    const items = [
      { cat: 'Alimentacao', value: 200 },
      { cat: 'Transporte', value: 100 },
      { cat: 'Alimentacao', value: 150 },
    ];
    const result = groupBy(items, 'cat');
    expect(result['Alimentacao']).toBe(350);
    expect(result['Transporte']).toBe(100);
  });

  it('agrupa por forma de pagamento', () => {
    const items = [
      { payment: 'PIX', value: 50 },
      { payment: 'Credito', value: 200 },
      { payment: 'PIX', value: 80 },
    ];
    const result = groupBy(items, 'payment');
    expect(result['PIX']).toBe(130);
    expect(result['Credito']).toBe(200);
  });

  it('itens sem chave vão para "Outros"', () => {
    const items = [
      { value: 100 },
      { cat: 'Lazer', value: 50 },
    ];
    const result = groupBy(items, 'cat');
    expect(result['Outros']).toBe(100);
    expect(result['Lazer']).toBe(50);
  });
});

describe('getCurrentMonth', () => {
  it('retorna formato YYYY-MM', () => {
    const result = getCurrentMonth();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('buildMonthList', () => {
  it('começa em Janeiro de 2026', () => {
    const months = buildMonthList();
    expect(months[0]).toBe('2026-01');
  });

  it('contém o mês atual', () => {
    const months = buildMonthList();
    const current = getCurrentMonth();
    expect(months).toContain(current);
  });

  it('vai até 3 meses à frente', () => {
    const months = buildMonthList();
    const now = new Date();
    const futureDate = new Date(now.getFullYear(), now.getMonth() + 3, 1);
    const futureYM = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
    expect(months).toContain(futureYM);
  });
});

describe('formatDate', () => {
  it('formata data ISO para DD/MM/YYYY', () => {
    expect(formatDate('2026-03-14')).toBe('14/03/2026');
    expect(formatDate('2026-01-05')).toBe('05/01/2026');
  });
});

describe('getDateRange', () => {
  it('retorna range de hoje', () => {
    const range = getDateRange('today');
    expect(range).not.toBeNull();
    expect(range!.start.getDate()).toBe(new Date().getDate());
  });

  it('retorna range de 7 dias', () => {
    const range = getDateRange('7days');
    expect(range).not.toBeNull();
    const diffDays = Math.ceil((range!.end.getTime() - range!.start.getTime()) / 86400000);
    expect(diffDays).toBe(7);
  });

  it('retorna range de 30 dias', () => {
    const range = getDateRange('30days');
    expect(range).not.toBeNull();
    const diffDays = Math.ceil((range!.end.getTime() - range!.start.getTime()) / 86400000);
    expect(diffDays).toBe(30);
  });

  it('retorna null para preset desconhecido', () => {
    expect(getDateRange('unknown')).toBeNull();
  });
});
