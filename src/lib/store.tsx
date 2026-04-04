'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AppState, Member, Expense, RecurringExpense, Investment, InvestmentGoal, InvestmentSnapshot, InvestmentWithdrawal } from './types';
import { COLORS } from './constants';
import { getCurrentMonth } from './helpers';
import { SkeletonDashboard } from '@/components/Skeleton';
import { supabase } from './supabase';

const defaultState: AppState = {
  members: [],
  activeMember: 'all',
  expenses: [],
  activeMonth: getCurrentMonth(),
  editingId: null,
  deleteId: null,
  editingMemberId: null,
  selectedColor: COLORS[0],
  selectedPhoto: null,
  customCats: [],
  customPayments: [],
  customBanks: [],
  categoryBudgets: {},
  monthlyBudgets: {},
};

// ── Supabase row helpers ──
function memberToRow(m: Member, userId: string, workspaceId?: string) {
  return { id: m.id, name: m.name, color: m.color, photo: m.photo || null, is_conjunta: !!m.isConjunta, user_id: userId, workspace_id: workspaceId || null };
}
function rowToMember(r: Record<string, unknown>): Member {
  return { id: r.id as string, name: r.name as string, color: r.color as string, photo: r.photo as string | null, isConjunta: !!r.is_conjunta };
}
function expenseToRow(e: Expense, userId: string, workspaceId?: string) {
  return {
    id: e.id, type: e.type, description: e.desc, category: e.cat, value: e.value,
    month: e.month, payment: e.payment, installment: e.installment || 0,
    installment_current: e.installmentCurrent || 0, installment_group_id: e.installmentGroupId || null,
    member_id: e.memberId || 'all', note: e.note || null,
    purchase_date: e.purchaseDate || null,
    conjunta_group_id: e.conjuntaGroupId || null, conjunta_name: e.conjuntaName || null,
    bank: e.bank || null,
    created_at: e.createdAt || Date.now(), user_id: userId, workspace_id: workspaceId || null,
  };
}
function rowToExpense(r: Record<string, unknown>): Expense {
  return {
    id: r.id as string, type: r.type as 'income' | 'expense', desc: r.description as string,
    cat: r.category as string, value: Number(r.value), month: r.month as string,
    payment: r.payment as string, installment: Number(r.installment) || 0,
    installmentCurrent: Number(r.installment_current) || 0,
    installmentGroupId: r.installment_group_id as string | undefined,
    memberId: r.member_id as string, note: r.note as string | undefined,
    purchaseDate: r.purchase_date as string | undefined,
    conjuntaGroupId: r.conjunta_group_id as string | undefined,
    conjuntaName: r.conjunta_name as string | undefined,
    bank: r.bank as string | undefined,
    createdAt: Number(r.created_at) || 0,
  };
}

interface StoreContextType {
  userId: string;
  workspaceId?: string;
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  getExpensesForMonth: (ym: string, memberId: string) => Expense[];
  getExpensesByExactMonth: (ym: string, memberId: string) => Expense[];
  getOutflows: (ym: string, memberId: string) => Expense[];
  getIncomes: (ym: string, memberId: string) => Expense[];
  getIndividualMembers: () => Member[];
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, expense: Expense) => void;
  removeExpense: (id: string) => void;
  addMember: (member: Member, targetWorkspaceId?: string | null) => void;
  updateMember: (id: string, member: Partial<Member>) => void;
  removeMember: (id: string) => void;
  setActiveMember: (id: string) => void;
  setActiveMonth: (ym: string) => void;
  recurringExpenses: RecurringExpense[];
  addRecurring: (r: Omit<RecurringExpense, 'id' | 'active'>) => Promise<void>;
  updateRecurring: (id: string, data: Partial<RecurringExpense>) => Promise<void>;
  removeRecurring: (id: string) => Promise<void>;
  investments: Investment[];
  investmentGoals: InvestmentGoal[];
  investmentSnapshots: InvestmentSnapshot[];
  addInvestment: (inv: Omit<Investment, 'id' | 'active'>) => Promise<void>;
  updateInvestment: (id: string, data: Partial<Investment>) => Promise<void>;
  removeInvestment: (id: string) => Promise<void>;
  addGoal: (goal: Omit<InvestmentGoal, 'id' | 'active'>) => Promise<void>;
  updateGoal: (id: string, data: Partial<InvestmentGoal>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  upsertSnapshot: (totalInvested: number, totalCurrent: number) => Promise<void>;
  withdrawals: InvestmentWithdrawal[];
  addWithdrawal: (w: Omit<InvestmentWithdrawal, 'id' | 'createdAt'>) => Promise<void>;
  removeWithdrawal: (id: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children, userId, workspaceId }: { children: ReactNode; userId: string; workspaceId?: string }) {
  const [state, setStateRaw] = useState<AppState>(defaultState);
  const [loaded, setLoaded] = useState(false);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [investmentGoals, setInvestmentGoals] = useState<InvestmentGoal[]>([]);
  const [investmentSnapshots, setInvestmentSnapshots] = useState<InvestmentSnapshot[]>([]);
  const [withdrawals, setWithdrawals] = useState<InvestmentWithdrawal[]>([]);

  // ── Load from Supabase ──
  useEffect(() => {
    async function loadData() {
      try {
        // Get user IDs I have access to (my own + shared with me)
        const { data: sharedWithMe } = await supabase.from('shares').select('owner_id').eq('shared_user_id', userId).eq('accepted', true);
        const accessIds = [userId, ...(sharedWithMe || []).map(s => s.owner_id)];

        // Filtrar por workspace: se tem workspaceId filtra por ele, senão pega os sem workspace (pessoal)
        let membersQuery = supabase.from('members').select('*').in('user_id', accessIds);
        let expensesQuery = supabase.from('expenses').select('*').in('user_id', accessIds);
        if (workspaceId) {
          membersQuery = membersQuery.eq('workspace_id', workspaceId);
          expensesQuery = expensesQuery.eq('workspace_id', workspaceId);
        } else {
          membersQuery = membersQuery.is('workspace_id', null);
          expensesQuery = expensesQuery.is('workspace_id', null);
        }

        const [membersRes, expensesRes, settingsRes] = await Promise.all([
          membersQuery,
          expensesQuery,
          supabase.from('settings').select('*').in('user_id', accessIds).limit(1).single(),
        ]);

        const dbMembers = (membersRes.data || []).map(rowToMember);
        const dbExpenses = (expensesRes.data || []).map(rowToExpense);
        let settings = settingsRes.data;

        // Se a query retornou erro, tentar novamente diretamente pelo userId (sem .single() que falha com 0 rows)
        if (!settings) {
          const { data: retryData } = await supabase.from('settings').select('*').eq('user_id', userId).maybeSingle();
          if (retryData) {
            settings = retryData;
          } else {
            // Realmente não existe — criar settings iniciais
            const newSettings = {
              user_id: userId, custom_cats: [] as string[], custom_payments: [] as string[],
              custom_banks: [] as string[], active_month: getCurrentMonth(),
              category_budgets: {}, monthly_budgets: {}, table_columns: null,
            };
            await supabase.from('settings').insert(newSettings);
            settings = newSettings;
          }
        }

        // Load recurring expenses
        let recurringQuery = supabase.from('recurring_expenses').select('*').eq('user_id', userId);
        if (workspaceId) {
          recurringQuery = recurringQuery.eq('workspace_id', workspaceId);
        } else {
          recurringQuery = recurringQuery.is('workspace_id', null);
        }
        const { data: recurringData } = await recurringQuery;
        const dbRecurring: RecurringExpense[] = (recurringData || []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          description: r.description as string,
          category: r.category as string,
          value: Number(r.value),
          payment: r.payment as string,
          bank: r.bank as string | undefined,
          memberId: r.member_id as string,
          dayOfMonth: Number(r.day_of_month),
          active: r.active as boolean,
        }));
        setRecurringExpenses(dbRecurring);

        // Auto-generate recurring expenses for current month
        const currentMonth = settings?.active_month || getCurrentMonth();
        const activeRecurring = dbRecurring.filter(r => r.active);
        if (activeRecurring.length > 0) {
          const { data: generated } = await supabase
            .from('recurring_generated')
            .select('recurring_id')
            .eq('month', currentMonth)
            .in('recurring_id', activeRecurring.map(r => r.id));
          const alreadyGenerated = new Set((generated || []).map((g: Record<string, unknown>) => g.recurring_id));

          const toGenerate = activeRecurring.filter(r => !alreadyGenerated.has(r.id));
          const newExpenses: Expense[] = [];
          for (const r of toGenerate) {
            const expId = crypto.randomUUID();
            const expense: Expense = {
              id: expId,
              type: 'expense',
              desc: r.description,
              cat: r.category,
              value: r.value,
              month: currentMonth,
              payment: r.payment,
              installment: 0,
              memberId: r.memberId,
              bank: r.bank,
              purchaseDate: `${currentMonth}-${String(r.dayOfMonth).padStart(2, '0')}`,
              note: 'Recorrente',
              createdAt: Date.now(),
            };
            newExpenses.push(expense);
            await supabase.from('expenses').insert(expenseToRow(expense, userId, workspaceId));
            await supabase.from('recurring_generated').insert({ recurring_id: r.id, month: currentMonth, expense_id: expId });
          }
          dbExpenses.push(...newExpenses);
        }

        setStateRaw(prev => ({
          ...prev,
          members: dbMembers,
          expenses: dbExpenses,
          customCats: settings?.custom_cats || [],
          customPayments: settings?.custom_payments || [],
          customBanks: settings?.custom_banks || [],
          tableColumns: settings?.table_columns || undefined,
          categoryBudgets: settings?.category_budgets || {},
          monthlyBudgets: settings?.monthly_budgets || {},
          activeMonth: settings?.active_month || getCurrentMonth(),
        }));
      } catch {
        // Fallback localStorage
        try {
          const d = localStorage.getItem('fin_data');
          if (d) {
            const parsed = JSON.parse(d);
            setStateRaw(prev => ({
              ...prev, ...parsed,
              members: parsed.members?.length ? parsed.members.filter((m: Member) => m.id !== 'all') : [],
              activeMonth: parsed.activeMonth || getCurrentMonth(),
            }));
          }
        } catch { /* ignore */ }
      }
      // ── Load investments ──
      let invQuery = supabase.from('investments').select('*').eq('user_id', userId).eq('active', true);
      if (workspaceId) invQuery = invQuery.eq('workspace_id', workspaceId);
      else invQuery = invQuery.is('workspace_id', null);
      const { data: dbInv } = await invQuery;
      if (dbInv) setInvestments(dbInv.map((r: Record<string, unknown>) => ({
        id: r.id as string, name: r.name as string, type: r.type as Investment['type'],
        amountInvested: Number(r.amount_invested), currentValue: Number(r.current_value),
        purchaseDate: r.purchase_date as string | undefined, maturityDate: r.maturity_date as string | undefined,
        notes: r.notes as string | undefined, active: r.active as boolean,
      })));

      // ── Load investment snapshots ──
      try {
        const { data: dbSnaps } = await supabase
          .from('investment_snapshots')
          .select('*')
          .eq('user_id', userId)
          .order('month', { ascending: true })
          .limit(24);
        if (dbSnaps) {
          setInvestmentSnapshots(dbSnaps.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            month: r.month as string,
            totalInvested: Number(r.total_invested),
            totalCurrent: Number(r.total_current),
            createdAt: r.created_at as string,
          })));
          // Auto-save snapshot for current month if not yet saved
          const currentMonth = getCurrentMonth();
          const alreadySaved = dbSnaps.some((r: Record<string, unknown>) => r.month === currentMonth);
          if (!alreadySaved) {
            const totalInvested = (dbInv || []).reduce((s: number, i: Record<string, unknown>) => s + Number(i.amount_invested), 0);
            const totalCurrent = (dbInv || []).reduce((s: number, i: Record<string, unknown>) => s + Number(i.current_value), 0);
            const { data: newSnap } = await supabase
              .from('investment_snapshots')
              .insert({ user_id: userId, workspace_id: workspaceId || null, month: currentMonth, total_invested: totalInvested, total_current: totalCurrent })
              .select()
              .single();
            if (newSnap) {
              setInvestmentSnapshots(prev => [...prev, {
                id: newSnap.id as string,
                month: newSnap.month as string,
                totalInvested: Number(newSnap.total_invested),
                totalCurrent: Number(newSnap.total_current),
                createdAt: newSnap.created_at as string,
              }]);
            }
          }
        }
      } catch { /* tabela investment_snapshots não existe ainda */ }

      // ── Load investment goals ──
      let goalQuery = supabase.from('investment_goals').select('*').eq('user_id', userId).eq('active', true);
      if (workspaceId) goalQuery = goalQuery.eq('workspace_id', workspaceId);
      else goalQuery = goalQuery.is('workspace_id', null);
      const { data: dbGoals } = await goalQuery;
      if (dbGoals) setInvestmentGoals(dbGoals.map((r: Record<string, unknown>) => ({
        id: r.id as string, name: r.name as string, targetValue: Number(r.target_value),
        currentValue: Number(r.current_value), deadline: r.deadline as string | undefined,
        linkedInvestmentIds: (r.linked_investment_ids as string[]) || [],
        icon: (r.icon as string) || '🎯', active: r.active as boolean,
      })));

      // ── Load investment withdrawals ──
      try {
        let wQuery = supabase.from('investment_withdrawals').select('*').eq('user_id', userId);
        if (workspaceId) wQuery = wQuery.eq('workspace_id', workspaceId);
        else wQuery = wQuery.is('workspace_id', null);
        const { data: dbWithdrawals } = await wQuery.order('date', { ascending: false });
        if (dbWithdrawals) setWithdrawals(dbWithdrawals.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          investmentId: r.investment_id as string,
          amount: Number(r.amount),
          date: r.date as string,
          reason: r.reason as string | undefined,
          createdAt: Number(r.created_at) || 0,
        })));
      } catch { /* tabela não existe ainda */ }

      setLoaded(true);
    }

    loadData();
  }, [userId]);

  // Cache in localStorage
  useEffect(() => {
    if (loaded) localStorage.setItem('fin_data', JSON.stringify(state));
  }, [state, loaded]);

  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateRaw(prev => {
      const next = updater(prev);
      if (prev.customCats !== next.customCats || prev.customPayments !== next.customPayments || prev.customBanks !== next.customBanks || prev.tableColumns !== next.tableColumns || prev.categoryBudgets !== next.categoryBudgets || prev.monthlyBudgets !== next.monthlyBudgets) {
        supabase.from('settings').upsert({
          user_id: userId, custom_cats: next.customCats, custom_payments: next.customPayments, custom_banks: next.customBanks, table_columns: next.tableColumns || null, category_budgets: next.categoryBudgets || {}, monthly_budgets: next.monthlyBudgets || {}, active_month: next.activeMonth,
        }, { onConflict: 'user_id' });
      }
      return next;
    });
  }, [userId]);

  // Date filter helper - checks if expense matches the current filter
  const matchesDateFilter = useCallback((e: Expense): boolean => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dateFilter = (state as any).dateFilter;
    if (!dateFilter || dateFilter.type === 'month') {
      const ym = dateFilter?.month || state.activeMonth;
      return e.month === ym;
    }
    // For preset and custom filters, use purchaseDate if available, else createdAt
    let date: Date;
    if (e.purchaseDate) {
      date = new Date(e.purchaseDate + 'T12:00:00');
    } else {
      const ts = e.createdAt || 0;
      if (!ts) return false;
      date = new Date(ts);
    }

    if (dateFilter.type === 'preset') {
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      switch (dateFilter.preset) {
        case 'today': return date >= today && date <= now;
        case '7days': return date >= new Date(today.getTime() - 6 * 86400000) && date <= now;
        case '15days': return date >= new Date(today.getTime() - 14 * 86400000) && date <= now;
        case '30days': return date >= new Date(today.getTime() - 29 * 86400000) && date <= now;
        default: return false;
      }
    }

    if (dateFilter.type === 'custom' && dateFilter.startDate) {
      const start = new Date(dateFilter.startDate + 'T00:00:00');
      const end = new Date((dateFilter.endDate || dateFilter.startDate) + 'T23:59:59');
      return date >= start && date <= end;
    }

    return e.month === state.activeMonth;
  }, [state]);

  const getExpensesForMonth = useCallback((ym: string, memberId: string): Expense[] => {
    return state.expenses.filter(e => {
      if (!matchesDateFilter(e)) return false;
      if (memberId === 'all') return true;
      return e.memberId === memberId;
    });
  }, [state.expenses, matchesDateFilter]);

  const getOutflows = useCallback((ym: string, memberId: string): Expense[] => {
    return state.expenses.filter(e => {
      if (e.type === 'income' || !matchesDateFilter(e)) return false;
      if (memberId === 'all') return true;
      return e.memberId === memberId;
    });
  }, [state.expenses, matchesDateFilter]);

  const getIncomes = useCallback((ym: string, memberId: string): Expense[] => {
    return state.expenses.filter(e => {
      if (e.type !== 'income' || !matchesDateFilter(e)) return false;
      if (memberId === 'all') return true;
      return e.memberId === memberId;
    });
  }, [state.expenses, matchesDateFilter]);

  // Filtro direto por mês (sem dateFilter) - para gráficos de evolução
  const getExpensesByExactMonth = useCallback((ym: string, memberId: string): Expense[] => {
    return state.expenses.filter(e => {
      if (e.month !== ym) return false;
      if (memberId === 'all') return true;
      return e.memberId === memberId;
    });
  }, [state.expenses]);

  const getIndividualMembers = useCallback((): Member[] => {
    return state.members.filter(m => m.id !== 'all' && !m.isConjunta);
  }, [state.members]);

  const addExpense = useCallback(async (expense: Expense) => {
    setStateRaw(prev => ({ ...prev, expenses: [...prev.expenses, expense] }));
    const { error } = await supabase.from('expenses').insert(expenseToRow(expense, userId, workspaceId));
    if (error) console.error('Erro ao salvar lançamento:', error.message);
  }, [userId]);

  const updateExpense = useCallback(async (id: string, expense: Expense) => {
    setStateRaw(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => e.id === id ? { ...expense, createdAt: e.createdAt } : e),
    }));
    const { error } = await supabase.from('expenses').update(expenseToRow(expense, userId, workspaceId)).eq('id', id);
    if (error) console.error('Erro ao atualizar lançamento:', error.message);
  }, [userId]);

  const removeExpense = useCallback(async (id: string) => {
    setStateRaw(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) console.error('Erro ao excluir lançamento:', error.message);
  }, []);

  const addMember = useCallback(async (member: Member, targetWorkspaceId?: string | null) => {
    setStateRaw(prev => ({ ...prev, members: [...prev.members, member] }));
    const wsId = targetWorkspaceId !== undefined ? targetWorkspaceId : workspaceId;
    const { error } = await supabase.from('members').insert(memberToRow(member, userId, wsId || undefined));
    if (error) console.error('Erro ao salvar membro:', error.message);
  }, [userId, workspaceId]);

  const updateMember = useCallback(async (id: string, data: Partial<Member>) => {
    setStateRaw(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === id ? { ...m, ...data } : m),
    }));
    const member = state.members.find(m => m.id === id);
    if (member) {
      const { error } = await supabase.from('members').update(memberToRow({ ...member, ...data }, userId, workspaceId)).eq('id', id);
      if (error) console.error('Erro ao atualizar membro:', error.message);
    }
  }, [state.members, userId]);

  const removeMember = useCallback(async (id: string) => {
    setStateRaw(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== id),
      expenses: prev.expenses.filter(e => e.memberId !== id),
      activeMember: prev.activeMember === id ? 'all' : prev.activeMember,
    }));
    const { error: e1 } = await supabase.from('members').delete().eq('id', id);
    if (e1) console.error('Erro ao excluir membro:', e1.message);
    const { error: e2 } = await supabase.from('expenses').delete().eq('member_id', id);
    if (e2) console.error('Erro ao excluir lançamentos do membro:', e2.message);
  }, []);

  const setActiveMember = useCallback((id: string) => {
    setStateRaw(prev => ({ ...prev, activeMember: id }));
  }, []);

  const setActiveMonth = useCallback((ym: string) => {
    setStateRaw(prev => ({ ...prev, activeMonth: ym }));
    supabase.from('settings').update({ active_month: ym }).eq('user_id', userId);
  }, [userId]);

  const addRecurring = useCallback(async (r: Omit<RecurringExpense, 'id' | 'active'>) => {
    const row = {
      user_id: userId, workspace_id: workspaceId || null,
      description: r.description, category: r.category, value: r.value,
      payment: r.payment, bank: r.bank || null, member_id: r.memberId,
      day_of_month: r.dayOfMonth, active: true,
    };
    const { data, error } = await supabase.from('recurring_expenses').insert(row).select('id').single();
    if (error) { console.error('Erro ao criar recorrência:', error.message); return; }
    setRecurringExpenses(prev => [...prev, { ...r, id: data.id, active: true }]);
  }, [userId, workspaceId]);

  const updateRecurring = useCallback(async (id: string, data: Partial<RecurringExpense>) => {
    const dbData: Record<string, unknown> = {};
    if (data.description !== undefined) dbData.description = data.description;
    if (data.category !== undefined) dbData.category = data.category;
    if (data.value !== undefined) dbData.value = data.value;
    if (data.payment !== undefined) dbData.payment = data.payment;
    if (data.bank !== undefined) dbData.bank = data.bank || null;
    if (data.memberId !== undefined) dbData.member_id = data.memberId;
    if (data.dayOfMonth !== undefined) dbData.day_of_month = data.dayOfMonth;
    if (data.active !== undefined) dbData.active = data.active;
    await supabase.from('recurring_expenses').update(dbData).eq('id', id);
    setRecurringExpenses(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  }, []);

  const removeRecurring = useCallback(async (id: string) => {
    await supabase.from('recurring_expenses').delete().eq('id', id);
    setRecurringExpenses(prev => prev.filter(r => r.id !== id));
  }, []);

  // ── Investment CRUD ──
  const addInvestment = useCallback(async (inv: Omit<Investment, 'id' | 'active'>) => {
    const row = {
      user_id: userId, workspace_id: workspaceId || null,
      name: inv.name, type: inv.type, amount_invested: inv.amountInvested,
      current_value: inv.currentValue, purchase_date: inv.purchaseDate || null,
      maturity_date: inv.maturityDate || null, notes: inv.notes || null, active: true,
    };
    const { data, error } = await supabase.from('investments').insert(row).select().single();
    if (error) throw new Error(error.message);
    setInvestments(prev => [...prev, {
      id: data.id, name: data.name, type: data.type, amountInvested: Number(data.amount_invested),
      currentValue: Number(data.current_value), purchaseDate: data.purchase_date,
      maturityDate: data.maturity_date, notes: data.notes, active: true,
    }]);
  }, [userId, workspaceId]);

  const updateInvestment = useCallback(async (id: string, data: Partial<Investment>) => {
    const row: Record<string, unknown> = {};
    if (data.name !== undefined) row.name = data.name;
    if (data.type !== undefined) row.type = data.type;
    if (data.amountInvested !== undefined) row.amount_invested = data.amountInvested;
    if (data.currentValue !== undefined) row.current_value = data.currentValue;
    if (data.purchaseDate !== undefined) row.purchase_date = data.purchaseDate;
    if (data.maturityDate !== undefined) row.maturity_date = data.maturityDate;
    if (data.notes !== undefined) row.notes = data.notes;
    const { error } = await supabase.from('investments').update(row).eq('id', id);
    if (error) throw new Error(error.message);
    setInvestments(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
  }, []);

  const removeInvestment = useCallback(async (id: string) => {
    const { error } = await supabase.from('investments').update({ active: false }).eq('id', id);
    if (error) throw new Error(error.message);
    setInvestments(prev => prev.filter(i => i.id !== id));
  }, []);

  // ── Goal CRUD ──
  const addGoal = useCallback(async (goal: Omit<InvestmentGoal, 'id' | 'active'>) => {
    const row = {
      user_id: userId, workspace_id: workspaceId || null,
      name: goal.name, target_value: goal.targetValue, current_value: goal.currentValue,
      deadline: goal.deadline || null, icon: goal.icon || '🎯',
      linked_investment_ids: goal.linkedInvestmentIds || [], active: true,
    };
    const { data, error } = await supabase.from('investment_goals').insert(row).select().single();
    if (error) throw new Error(error.message);
    setInvestmentGoals(prev => [...prev, {
      id: data.id, name: data.name, targetValue: Number(data.target_value),
      currentValue: Number(data.current_value), deadline: data.deadline,
      icon: data.icon || '🎯', linkedInvestmentIds: data.linked_investment_ids || [], active: true,
    }]);
  }, [userId, workspaceId]);

  const updateGoal = useCallback(async (id: string, data: Partial<InvestmentGoal>) => {
    const row: Record<string, unknown> = {};
    if (data.name !== undefined) row.name = data.name;
    if (data.targetValue !== undefined) row.target_value = data.targetValue;
    if (data.currentValue !== undefined) row.current_value = data.currentValue;
    if (data.deadline !== undefined) row.deadline = data.deadline;
    if (data.icon !== undefined) row.icon = data.icon;
    if (data.linkedInvestmentIds !== undefined) row.linked_investment_ids = data.linkedInvestmentIds;
    const { error } = await supabase.from('investment_goals').update(row).eq('id', id);
    if (error) throw new Error(error.message);
    setInvestmentGoals(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
  }, []);

  const removeGoal = useCallback(async (id: string) => {
    const { error } = await supabase.from('investment_goals').update({ active: false }).eq('id', id);
    if (error) throw new Error(error.message);
    setInvestmentGoals(prev => prev.filter(g => g.id !== id));
  }, []);

  const upsertSnapshot = useCallback(async (totalInvested: number, totalCurrent: number) => {
    const currentMonth = getCurrentMonth();
    try {
      const existing = investmentSnapshots.find(s => s.month === currentMonth);
      if (existing) {
        await supabase
          .from('investment_snapshots')
          .update({ total_invested: totalInvested, total_current: totalCurrent })
          .eq('id', existing.id);
        setInvestmentSnapshots(prev => prev.map(s =>
          s.month === currentMonth ? { ...s, totalInvested, totalCurrent } : s
        ));
      } else {
        const { data: newSnap } = await supabase
          .from('investment_snapshots')
          .insert({ user_id: userId, workspace_id: workspaceId || null, month: currentMonth, total_invested: totalInvested, total_current: totalCurrent })
          .select()
          .single();
        if (newSnap) {
          setInvestmentSnapshots(prev => [...prev, {
            id: newSnap.id as string,
            month: newSnap.month as string,
            totalInvested: Number(newSnap.total_invested),
            totalCurrent: Number(newSnap.total_current),
            createdAt: newSnap.created_at as string,
          }]);
        }
      }
    } catch { /* ignore */ }
  }, [userId, workspaceId, investmentSnapshots]);

  // ── Withdrawal CRUD ──
  const addWithdrawal = useCallback(async (w: Omit<InvestmentWithdrawal, 'id' | 'createdAt'>) => {
    const row = {
      investment_id: w.investmentId, user_id: userId, workspace_id: workspaceId || null,
      amount: w.amount, date: w.date, reason: w.reason || null,
    };
    const { data, error } = await supabase.from('investment_withdrawals').insert(row).select().single();
    if (error) throw new Error(error.message);
    setWithdrawals(prev => [{
      id: data.id, investmentId: data.investment_id, amount: Number(data.amount),
      date: data.date, reason: data.reason, createdAt: Number(data.created_at) || 0,
    }, ...prev]);
    // Subtrair do currentValue do investimento
    const inv = investments.find(i => i.id === w.investmentId);
    if (inv) {
      const newValue = Math.max(0, inv.currentValue - w.amount);
      await supabase.from('investments').update({ current_value: newValue }).eq('id', inv.id);
      setInvestments(prev => prev.map(i => i.id === inv.id ? { ...i, currentValue: newValue } : i));
    }
  }, [userId, workspaceId, investments]);

  const removeWithdrawal = useCallback(async (id: string) => {
    const w = withdrawals.find(x => x.id === id);
    if (!w) return;
    const { error } = await supabase.from('investment_withdrawals').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setWithdrawals(prev => prev.filter(x => x.id !== id));
    // Restaurar valor no investimento
    const inv = investments.find(i => i.id === w.investmentId);
    if (inv) {
      const newValue = inv.currentValue + w.amount;
      await supabase.from('investments').update({ current_value: newValue }).eq('id', inv.id);
      setInvestments(prev => prev.map(i => i.id === inv.id ? { ...i, currentValue: newValue } : i));
    }
  }, [investments, withdrawals]);

  if (!loaded) {
    return (
      <div className="flex min-h-screen">
        <div className="flex-1 p-3 md:p-6">
          <SkeletonDashboard />
        </div>
      </div>
    );
  }

  return (
    <StoreContext.Provider value={{
      userId, workspaceId,
      state, setState,
      getExpensesForMonth, getExpensesByExactMonth, getOutflows, getIncomes, getIndividualMembers,
      addExpense, updateExpense, removeExpense,
      addMember, updateMember, removeMember,
      setActiveMember, setActiveMonth,
      recurringExpenses, addRecurring, updateRecurring, removeRecurring,
      investments, investmentGoals, investmentSnapshots,
      addInvestment, updateInvestment, removeInvestment,
      addGoal, updateGoal, removeGoal, upsertSnapshot,
      withdrawals, addWithdrawal, removeWithdrawal,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
