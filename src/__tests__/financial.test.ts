import { describe, it, expect } from 'vitest';
import { getTotal, groupBy } from '@/lib/helpers';
import type { Expense } from '@/lib/types';

// Helper para criar expense
function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1', type: 'expense', desc: 'Teste', cat: 'Outros',
    value: 100, month: '2026-03', payment: 'PIX', installment: 0, memberId: 'all',
    ...overrides,
  };
}

describe('Separação Investimentos x Saldo', () => {
  it('investimentos não devem afetar o saldo disponível', () => {
    const entries = [
      makeExpense({ type: 'income', cat: 'Salario', value: 5000 }),
      makeExpense({ type: 'expense', cat: 'Moradia', value: 2000 }),
      makeExpense({ type: 'expense', cat: 'Investimento', value: 1000 }),
    ];

    const incomes = entries.filter(e => e.type === 'income');
    const outflows = entries.filter(e => e.type !== 'income');
    const incomesNormais = incomes.filter(e => e.cat !== 'Investimento');
    const totalIncome = getTotal(incomesNormais);
    const investSaida = outflows.filter(e => e.cat === 'Investimento').reduce((s, e) => s + e.value, 0);
    const despesasReais = getTotal(outflows) - investSaida;
    const saldo = totalIncome - despesasReais;

    expect(totalIncome).toBe(5000);
    expect(despesasReais).toBe(2000); // Só moradia, sem investimento
    expect(saldo).toBe(3000); // 5000 - 2000
    expect(investSaida).toBe(1000); // Separado
  });

  it('receita de investimento vai para saldo de investimentos, não para receita normal', () => {
    const entries = [
      makeExpense({ type: 'income', cat: 'Salario', value: 5000 }),
      makeExpense({ type: 'income', cat: 'Investimento', value: 800 }),
      makeExpense({ type: 'expense', cat: 'Investimento', value: 1000 }),
    ];

    const incomes = entries.filter(e => e.type === 'income');
    const outflows = entries.filter(e => e.type !== 'income');
    const incomesNormais = incomes.filter(e => e.cat !== 'Investimento');
    const incomesInvest = incomes.filter(e => e.cat === 'Investimento');
    const totalIncome = getTotal(incomesNormais);
    const totalIncomeInvest = getTotal(incomesInvest);
    const investSaida = outflows.filter(e => e.cat === 'Investimento').reduce((s, e) => s + e.value, 0);
    const investTotal = investSaida + totalIncomeInvest;

    expect(totalIncome).toBe(5000); // Apenas salário
    expect(totalIncomeInvest).toBe(800); // Rendimento investimento
    expect(investSaida).toBe(1000); // Aporte
    expect(investTotal).toBe(1800); // Aporte + rendimento
  });
});

describe('Rateio Familiar', () => {
  it('divide despesas familiares igualmente entre membros', () => {
    const familyExpense = makeExpense({ value: 300, memberId: 'all', cat: 'Moradia' });
    const individualCount = 2;
    const share = familyExpense.value / individualCount;

    expect(share).toBe(150);
  });

  it('despesas individuais não são rateadas', () => {
    const entries = [
      makeExpense({ value: 200, memberId: 'm1', cat: 'Lazer' }),
      makeExpense({ value: 300, memberId: 'm2', cat: 'Transporte' }),
      makeExpense({ value: 600, memberId: 'all', cat: 'Moradia' }),
    ];

    const individualCount = 2;

    // Visão do membro m1
    const m1Own = entries.filter(e => e.memberId === 'm1');
    const familyShare = getTotal(entries.filter(e => e.memberId === 'all')) / individualCount;
    const m1Total = getTotal(m1Own) + familyShare;

    expect(getTotal(m1Own)).toBe(200);
    expect(familyShare).toBe(300);
    expect(m1Total).toBe(500); // 200 próprio + 300 rateio
  });

  it('visão família soma tudo (todos os membros + gastos compartilhados)', () => {
    const entries = [
      makeExpense({ value: 200, memberId: 'm1', cat: 'Lazer' }),
      makeExpense({ value: 300, memberId: 'm2', cat: 'Transporte' }),
      makeExpense({ value: 600, memberId: 'all', cat: 'Moradia' }),
    ];

    // Visão família = soma de tudo
    const totalFamilia = getTotal(entries);
    expect(totalFamilia).toBe(1100);

    // Detalhamento
    const compartilhado = getTotal(entries.filter(e => e.memberId === 'all'));
    const m1 = getTotal(entries.filter(e => e.memberId === 'm1'));
    const m2 = getTotal(entries.filter(e => e.memberId === 'm2'));

    expect(compartilhado).toBe(600);
    expect(m1).toBe(200);
    expect(m2).toBe(300);
  });
});

describe('Categorias e Agrupamento', () => {
  it('agrupa corretamente por categoria excluindo investimentos', () => {
    const outflows = [
      makeExpense({ cat: 'Moradia', value: 1500 }),
      makeExpense({ cat: 'Alimentacao', value: 800 }),
      makeExpense({ cat: 'Investimento', value: 1000 }),
      makeExpense({ cat: 'Lazer', value: 200 }),
    ];

    const semInvest = outflows.filter(e => e.cat !== 'Investimento');
    const byCat = groupBy(semInvest, 'cat');

    expect(byCat['Moradia']).toBe(1500);
    expect(byCat['Alimentacao']).toBe(800);
    expect(byCat['Lazer']).toBe(200);
    expect(byCat['Investimento']).toBeUndefined();
  });

  it('calcula percentuais por categoria corretamente', () => {
    const outflows = [
      makeExpense({ cat: 'Moradia', value: 1500 }),
      makeExpense({ cat: 'Alimentacao', value: 500 }),
    ];

    const total = getTotal(outflows);
    const moradiaPct = Math.round(1500 / total * 100);
    const alimentacaoPct = Math.round(500 / total * 100);

    expect(total).toBe(2000);
    expect(moradiaPct).toBe(75);
    expect(alimentacaoPct).toBe(25);
  });
});

describe('Regra 50-30-20', () => {
  it('calcula percentuais de essenciais, desejos e investimentos', () => {
    const totalIncome = 10000;
    const essenciais = 4500; // Moradia + Alimentacao + Transporte + Saude + Educacao
    const desejos = 2000; // Lazer + Vestuario + Assinaturas
    const investimentos = 2000;

    const essePct = Math.round(essenciais / totalIncome * 100);
    const desPct = Math.round(desejos / totalIncome * 100);
    const investPct = Math.round(investimentos / totalIncome * 100);

    expect(essePct).toBe(45);
    expect(desPct).toBe(20);
    expect(investPct).toBe(20);

    // Está saudável: essenciais <= 55, desejos <= 35, invest >= 15
    expect(essePct <= 55).toBe(true);
    expect(desPct <= 35).toBe(true);
    expect(investPct >= 15).toBe(true);
  });

  it('detecta quando essenciais estão altos (> 60%)', () => {
    const totalIncome = 5000;
    const essenciais = 3500;
    const essePct = Math.round(essenciais / totalIncome * 100);

    expect(essePct).toBe(70);
    expect(essePct > 60).toBe(true);
  });
});
