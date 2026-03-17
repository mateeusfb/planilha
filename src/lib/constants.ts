export const COLORS = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#db2777','#65a30d'];

export const CAT_COLORS: Record<string, string> = {
  Moradia:'#2563eb', Alimentacao:'#16a34a', Transporte:'#d97706', Saude:'#dc2626',
  Educacao:'#7c3aed', Lazer:'#0891b2', Vestuario:'#db2777', Assinaturas:'#64748b',
  Investimento:'#065f46', Outros:'#94a3b8'
};

export const PAY_COLORS: Record<string, string> = {
  Credito:'#d97706', Debito:'#2563eb', PIX:'#16a34a', Dinheiro:'#64748b',
  Boleto:'#7c3aed', Transferencia:'#db2777'
};

export const INCOME_CATS = ['Salario','Freelance','Aluguel Recebido','Dividendos','Bonus','Investimento','Outros'];
export const EXPENSE_CATS = ['Moradia','Alimentacao','Transporte','Saude','Educacao','Lazer','Vestuario','Assinaturas','Investimento','Outros'];
export const BASE_PAYMENTS = ['Credito','Debito','PIX','Dinheiro','Boleto','Transferencia'];
export const BASE_BANKS = ['Nubank','Inter','Itaú','Bradesco','Santander','Banco do Brasil','Caixa','C6 Bank','BTG Pactual','Sicoob'];

export const DEFAULT_ACCOUNTS = [
  { id: 'acc-carteira', name: 'Carteira', type: 'Dinheiro', isDefault: true },
  { id: 'acc-pix', name: 'PIX', type: 'PIX' },
  { id: 'acc-nubank-deb', name: 'Nubank', type: 'Débito' },
  { id: 'acc-nubank-cred', name: 'Nubank', type: 'Crédito' },
  { id: 'acc-inter-deb', name: 'Inter', type: 'Débito' },
  { id: 'acc-inter-cred', name: 'Inter', type: 'Crédito' },
  { id: 'acc-itau-deb', name: 'Itaú', type: 'Débito' },
  { id: 'acc-bradesco-deb', name: 'Bradesco', type: 'Débito' },
];

export function accountLabel(acc: { name: string; type: string }): string {
  if (acc.name === acc.type || acc.name === 'PIX' || acc.name === 'Carteira') return acc.name;
  return `${acc.name} · ${acc.type}`;
}
