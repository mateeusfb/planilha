import { describe, it, expect } from 'vitest';
import { generateTips } from '@/lib/tips';
import type { Expense, Member } from '@/lib/types';

// Helper para criar expense rapidamente
function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    type: 'expense',
    desc: 'Teste',
    cat: 'Outros',
    value: 100,
    month: '2026-03',
    payment: 'PIX',
    installment: 0,
    memberId: 'all',
    ...overrides,
  };
}

function makeIncome(overrides: Partial<Expense> = {}): Expense {
  return makeExpense({ type: 'income', cat: 'Salario', payment: '-', ...overrides });
}

const noMembers = () => [] as Member[];

describe('generateTips', () => {
  it('sugere registrar lançamentos quando vazio', () => {
    const tips = generateTips([], 'all', noMembers);
    expect(tips).toHaveLength(1);
    expect(tips[0].title).toContain('Comece registrando');
  });

  it('sugere registrar despesas quando só tem receita', () => {
    const tips = generateTips([makeIncome({ value: 5000 })], 'all', noMembers);
    expect(tips).toHaveLength(1);
    expect(tips[0].title).toContain('Registre suas despesas');
  });

  it('alerta quando despesas excedem receita', () => {
    const expenses = [
      makeIncome({ value: 3000 }),
      makeExpense({ value: 4000, cat: 'Moradia' }),
    ];
    const tips = generateTips(expenses, 'all', noMembers);
    const alert = tips.find(t => t.type === 'bad' && t.title.includes('acima da receita'));
    expect(alert).toBeDefined();
  });

  it('parabeniza quando saldo >= 30%', () => {
    const expenses = [
      makeIncome({ value: 10000 }),
      makeExpense({ value: 5000, cat: 'Moradia' }),
    ];
    const tips = generateTips(expenses, 'all', noMembers);
    const good = tips.find(t => t.type === 'good' && t.title.includes('Excelente'));
    expect(good).toBeDefined();
  });

  it('alerta margem apertada quando saldo < 10%', () => {
    const expenses = [
      makeIncome({ value: 5000 }),
      makeExpense({ value: 4800, cat: 'Moradia' }),
    ];
    const tips = generateTips(expenses, 'all', noMembers);
    const warn = tips.find(t => t.title.includes('Margem apertada'));
    expect(warn).toBeDefined();
  });

  it('pede receitas quando não tem nenhuma', () => {
    const tips = generateTips([makeExpense({ value: 500 })], 'all', noMembers);
    const warn = tips.find(t => t.title.includes('Cadastre suas receitas'));
    expect(warn).toBeDefined();
  });

  // Investimentos
  it('alerta quando não há investimentos', () => {
    const expenses = [
      makeIncome({ value: 5000 }),
      makeExpense({ value: 3000, cat: 'Moradia' }),
    ];
    const tips = generateTips(expenses, 'all', noMembers);
    const alert = tips.find(t => t.title.includes('Nenhum investimento'));
    expect(alert).toBeDefined();
  });

  it('parabeniza investimentos >= 20%', () => {
    const expenses = [
      makeIncome({ value: 5000 }),
      makeExpense({ value: 2000, cat: 'Moradia' }),
      makeExpense({ value: 1500, cat: 'Investimento' }),
    ];
    const tips = generateTips(expenses, 'all', noMembers);
    const good = tips.find(t => t.title.includes('Investidor de peso'));
    expect(good).toBeDefined();
  });

  it('separa receita de investimento do saldo normal', () => {
    const expenses = [
      makeIncome({ value: 5000 }),
      makeIncome({ value: 500, cat: 'Investimento' }),
      makeExpense({ value: 2000, cat: 'Moradia' }),
    ];
    const tips = generateTips(expenses, 'all', noMembers);
    // Saldo deveria ser 5000 - 2000 = 3000 (60%), não incluir os 500 de investimento na receita
    const saldoTip = tips.find(t => t.title.includes('Excelente'));
    expect(saldoTip).toBeDefined();
  });

  // Categorias
  it('alerta moradia > 35%', () => {
    const expenses = [
      makeIncome({ value: 5000 }),
      makeExpense({ value: 2000, cat: 'Moradia' }),
    ];
    const tips = generateTips(expenses, 'all', noMembers);
    const alert = tips.find(t => t.type === 'bad' && t.title.includes('Moradia'));
    expect(alert).toBeDefined();
  });

  it('alerta alimentação > 25%', () => {
    const expenses = [
      makeIncome({ value: 4000 }),
      makeExpense({ value: 1200, cat: 'Alimentacao' }),
    ];
    const tips = generateTips(expenses, 'all', noMembers);
    const warn = tips.find(t => t.title.includes('Alimentacao'));
    expect(warn).toBeDefined();
  });

  it('alerta lazer > 15%', () => {
    const expenses = [
      makeIncome({ value: 5000 }),
      makeExpense({ value: 1000, cat: 'Lazer' }),
    ];
    const tips = generateTips(expenses, 'all', noMembers);
    const warn = tips.find(t => t.title.includes('Lazer acima'));
    expect(warn).toBeDefined();
  });

  it('alerta crédito > 60% das despesas', () => {
    const expenses = [
      makeIncome({ value: 5000 }),
      makeExpense({ value: 2000, cat: 'Alimentacao', payment: 'Credito' }),
      makeExpense({ value: 500, cat: 'Transporte', payment: 'PIX' }),
    ];
    const tips = generateTips(expenses, 'all', noMembers);
    const warn = tips.find(t => t.title.includes('despesas no credito'));
    expect(warn).toBeDefined();
  });

  it('alerta muitos parcelamentos (>= 5)', () => {
    const expenses = [
      makeIncome({ value: 10000 }),
      ...Array.from({ length: 5 }, (_, i) => makeExpense({
        id: `p${i}`, value: 200, cat: 'Outros', installment: 12, installmentCurrent: 1,
      })),
    ];
    const tips = generateTips(expenses, 'all', noMembers);
    const alert = tips.find(t => t.title.includes('parcelamentos ativos'));
    expect(alert).toBeDefined();
  });

  it('parabeniza educação', () => {
    const expenses = [
      makeIncome({ value: 5000 }),
      makeExpense({ value: 500, cat: 'Educacao' }),
    ];
    const tips = generateTips(expenses, 'all', noMembers);
    const good = tips.find(t => t.title.includes('educacao'));
    expect(good).toBeDefined();
  });

  it('lembra de saúde quando não tem gastos', () => {
    const expenses = [
      makeIncome({ value: 5000 }),
      makeExpense({ value: 1000, cat: 'Alimentacao' }),
    ];
    const tips = generateTips(expenses, 'all', noMembers);
    const info = tips.find(t => t.title.includes('Saude'));
    expect(info).toBeDefined();
  });

  // Regra 50-30-20
  it('calcula regra 50-30-20', () => {
    const expenses = [
      makeIncome({ value: 10000 }),
      makeExpense({ value: 3000, cat: 'Moradia' }),
      makeExpense({ value: 1500, cat: 'Alimentacao' }),
      makeExpense({ value: 1000, cat: 'Lazer' }),
      makeExpense({ value: 2000, cat: 'Investimento' }),
    ];
    const tips = generateTips(expenses, 'all', noMembers);
    const rule = tips.find(t => t.title.includes('Regra 50-30-20'));
    expect(rule).toBeDefined();
  });

  // Visão familiar
  it('compara gastos entre membros na visão família', () => {
    const members: Member[] = [
      { id: 'm1', name: 'Ana', color: '#ff0000' },
      { id: 'm2', name: 'Carlos', color: '#0000ff' },
    ];
    const expenses = [
      makeIncome({ value: 10000, memberId: 'm1' }),
      makeExpense({ value: 3000, cat: 'Lazer', memberId: 'm1' }),
      makeExpense({ value: 500, cat: 'Transporte', memberId: 'm2' }),
    ];
    const tips = generateTips(expenses, 'all', () => members);
    const diff = tips.find(t => t.title.includes('Diferenca nos gastos'));
    expect(diff).toBeDefined();
  });
});
