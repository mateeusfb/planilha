'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AppState, Member, Expense } from './types';
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
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children, userId, workspaceId }: { children: ReactNode; userId: string; workspaceId?: string }) {
  const [state, setStateRaw] = useState<AppState>(defaultState);
  const [loaded, setLoaded] = useState(false);

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

        // Criar settings para o usuário se não existir
        if (!settings) {
          const newSettings = { user_id: userId, custom_cats: [], custom_payments: [], custom_banks: [], active_month: getCurrentMonth() };
          await supabase.from('settings').upsert(newSettings, { onConflict: 'user_id' });
          settings = newSettings;
        }

        setStateRaw(prev => ({
          ...prev,
          members: dbMembers,
          expenses: dbExpenses,
          customCats: settings?.custom_cats || [],
          customPayments: settings?.custom_payments || [],
          customBanks: settings?.custom_banks || [],
          tableColumns: settings?.table_columns || undefined,
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
      if (prev.customCats !== next.customCats || prev.customPayments !== next.customPayments || prev.customBanks !== next.customBanks || prev.tableColumns !== next.tableColumns) {
        supabase.from('settings').upsert({
          user_id: userId, custom_cats: next.customCats, custom_payments: next.customPayments, custom_banks: next.customBanks, table_columns: next.tableColumns || null, active_month: next.activeMonth,
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
    supabase.from('settings').upsert({ user_id: userId, active_month: ym }, { onConflict: 'user_id' });
  }, [userId]);

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
      state, setState,
      getExpensesForMonth, getExpensesByExactMonth, getOutflows, getIncomes, getIndividualMembers,
      addExpense, updateExpense, removeExpense,
      addMember, updateMember, removeMember,
      setActiveMember, setActiveMonth,
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
