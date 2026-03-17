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
  accounts: Account[];
  tableColumns?: string[];
}

export interface Account {
  id: string;
  name: string;       // ex: "Nubank", "Carteira", "Inter"
  type: string;       // ex: "Débito", "Crédito", "PIX", "Dinheiro"
  isDefault?: boolean;
}

export type PageId = 'dashboard' | 'expenses' | 'analysis' | 'summary' | 'settings';
