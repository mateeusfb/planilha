export interface Member {
  id: string;
  name: string;
  color: string;
  photo?: string | null;
  isConjunta?: boolean;
}

export interface Expense {
  id: string;
  type: 'income' | 'expense';
  desc: string;
  cat: string;
  value: number;
  month: string;
  payment: string;
  installment: number;
  installmentCurrent?: number;
  installmentGroupId?: string;
  memberId: string;
  note?: string;
  purchaseDate?: string; // YYYY-MM-DD
  conjuntaGroupId?: string;
  conjuntaName?: string;
  bank?: string;
  createdAt?: number;
}

export interface AppState {
  members: Member[];
  activeMember: string;
  expenses: Expense[];
  activeMonth: string;
  editingId: string | null;
  deleteId: string | null;
  editingMemberId: string | null;
  selectedColor: string;
  selectedPhoto: string | null;
  customCats: string[];
  customPayments: string[];
  customBanks: string[];
  tableColumns?: string[];
  categoryBudgets: Record<string, number>;
}

export interface Workspace {
  id: string;
  userId: string;
  workspaceId?: string;
  label: string;
  icon: string;
  isOwn: boolean;
  ownerEmail?: string;
}

export interface RecurringExpense {
  id: string;
  description: string;
  category: string;
  value: number;
  payment: string;
  bank?: string;
  memberId: string;
  dayOfMonth: number;
  active: boolean;
}

export type PageId = 'dashboard' | 'expenses' | 'analysis' | 'investments' | 'summary' | 'plans' | 'profile' | 'settings';

export type InvestmentType = 'renda_fixa' | 'renda_variavel' | 'crypto' | 'previdencia' | 'poupanca' | 'outros';

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  amountInvested: number;
  currentValue: number;
  purchaseDate?: string;
  maturityDate?: string;
  notes?: string;
  active: boolean;
}

export interface InvestmentGoal {
  id: string;
  name: string;
  targetValue: number;
  currentValue: number;
  deadline?: string;
  icon: string;
  active: boolean;
}
