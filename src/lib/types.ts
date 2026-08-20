export interface Member {
  id: string;
  name: string;
  color: string;
  photo?: string | null;
  isConjunta?: boolean;
}

export type PaidStatus = 'pending' | 'paid' | 'postponed';

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
  paidStatus?: PaidStatus;
}

export interface DateFilter {
  type: 'month' | 'preset' | 'custom';
  month?: string;
  preset?: string;
  startDate?: string;
  endDate?: string;
}

export interface AppState {
  members: Member[];
  activeMember: string;
  expenses: Expense[];
  activeMonth: string;
  dateFilter?: DateFilter;
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
  monthlyBudgets: Record<string, Record<string, number>>;
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

export type PageId = 'dashboard' | 'expenses' | 'analysis' | 'investments' | 'budget' | 'closing' | 'agenda' | 'agendaConvites' | 'profile' | 'settings';

// ── Agenda (Google Calendar) ────────────────────────────────────────────────
// O Google é a fonte da verdade: nada disto é gravado no banco do Folga.

export type RespostaConvite = 'accepted' | 'declined' | 'tentative';
export type StatusResposta = RespostaConvite | 'needsAction';

export interface AgendaConvidado {
  email: string;
  nome?: string;
  opcional?: boolean;
  organizador?: boolean;
  /** É a conta conectada. */
  souEu?: boolean;
  resposta: StatusResposta;
}

export interface AgendaEvento {
  id: string;
  titulo: string;
  descricao?: string;
  local?: string;
  diaInteiro: boolean;
  /** ISO com offset; se diaInteiro, 'YYYY-MM-DD'. */
  inicio: string;
  /** Idem. Em dia inteiro é o último dia INCLUSIVO (o Google usa exclusivo). */
  fim: string;
  fuso?: string;
  linkMeet?: string;
  linkGoogle?: string;
  organizadorEmail?: string;
  souOrganizador: boolean;
  convidados: AgendaConvidado[];
  minhaResposta?: StatusResposta;
  /** Ocorrência de um evento que se repete — editar afeta só ela. */
  recorrente: boolean;
}

/** O que o formulário de reunião manda para a API. */
export interface EntradaEvento {
  titulo: string;
  descricao?: string;
  local?: string;
  diaInteiro?: boolean;
  /** 'YYYY-MM-DD' — usado quando diaInteiro. */
  data?: string;
  dataFim?: string;
  /** 'YYYY-MM-DDTHH:mm' local — usado quando não é dia inteiro. */
  inicio?: string;
  fim?: string;
  fuso?: string;
  convidados?: { email: string; opcional?: boolean }[];
  criarMeet?: boolean;
  notificarConvidados?: boolean;
}

export interface StatusConexaoGoogle {
  conectado: boolean;
  email?: string;
  conectadaEm?: string;
  status?: 'ativa' | 'revogada';
  fuso?: string;
}

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
  linkedInvestmentIds?: string[];
  active: boolean;
}

export interface InvestmentWithdrawal {
  id: string;
  investmentId: string;
  amount: number;
  date: string;
  reason?: string;
  createdAt?: number;
}

export interface InvestmentSnapshot {
  id: string;
  month: string; // YYYY-MM
  totalInvested: number;
  totalCurrent: number;
  createdAt: string;
}
