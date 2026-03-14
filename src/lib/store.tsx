'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AppState, Member, Expense } from './types';
import { COLORS } from './constants';
import { getCurrentMonth } from './helpers';
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
};

// ── Supabase row helpers ──
function memberToRow(m: Member, userId: string) {
  return { id: m.id, name: m.name, color: m.color, photo: m.photo || null, is_conjunta: !!m.isConjunta, user_id: userId };
}
function rowToMember(r: Record<string, unknown>): Member {
  return { id: r.id as string, name: r.name as string, color: r.color as string, photo: r.photo as string | null, isConjunta: !!r.is_conjunta };
}
function expenseToRow(e: Expense, userId: string) {
  return {
    id: e.id, type: e.type, description: e.desc, category: e.cat, value: e.value,
    month: e.month, payment: e.payment, installment: e.installment || 0,
    installment_current: e.installmentCurrent || 0, installment_group_id: e.installmentGroupId || null,
    member_id: e.memberId || 'all', note: e.note || null,
    purchase_date: e.purchaseDate || null,
    conjunta_group_id: e.conjuntaGroupId || null, conjunta_name: e.conjuntaName || null,
    created_at: e.createdAt || Date.now(), user_id: userId,
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
    createdAt: Number(r.created_at) || 0,
  };
}

interface StoreContextType {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  getExpensesForMonth: (ym: string, memberId: string) => Expense[];
  getOutflows: (ym: string, memberId: string) => Expense[];
  getIncomes: (ym: string, memberId: string) => Expense[];
  getIndividualMembers: () => Member[];
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, expense: Expense) => void;
  removeExpense: (id: string) => void;
  addMember: (member: Member) => void;
  updateMember: (id: string, member: Partial<Member>) => void;
  removeMember: (id: string) => void;
  setActiveMember: (id: string) => void;
  setActiveMonth: (ym: string) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const [state, setStateRaw] = useState<AppState>(defaultState);
  const [loaded, setLoaded] = useState(false);

  // ── Load from Supabase ──
  useEffect(() => {
    async function loadData() {
      try {
        // Get user IDs I have access to (my own + shared with me)
        const { data: sharedWithMe } = await supabase.from('shares').select('owner_id').eq('shared_user_id', userId).eq('accepted', true);
        const accessIds = [userId, ...(sharedWithMe || []).map(s => s.owner_id)];

        const [membersRes, expensesRes, settingsRes] = await Promise.all([
          supabase.from('members').select('*').in('user_id', accessIds),
          supabase.from('expenses').select('*').in('user_id', accessIds),
          supabase.from('settings').select('*').in('user_id', accessIds).eq('id', 1).single(),
        ]);

        const dbMembers = (membersRes.data || []).map(rowToMember);
        const dbExpenses = (expensesRes.data || []).map(rowToExpense);
        const settings = settingsRes.data;

        setStateRaw(prev => ({
          ...prev,
          members: dbMembers,
          expenses: dbExpenses,
          customCats: settings?.custom_cats || [],
          customPayments: settings?.custom_payments || [],
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
      if (prev.customCats !== next.customCats || prev.customPayments !== next.customPayments) {
        supabase.from('settings').upsert({
          id: 1, user_id: userId, custom_cats: next.customCats, custom_payments: next.customPayments, active_month: next.activeMonth,
        });
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

  const getIndividualMembers = useCallback((): Member[] => {
    return state.members.filter(m => m.id !== 'all' && !m.isConjunta);
  }, [state.members]);

  const addExpense = useCallback((expense: Expense) => {
    setStateRaw(prev => ({ ...prev, expenses: [...prev.expenses, expense] }));
    supabase.from('expenses').insert(expenseToRow(expense, userId));
  }, [userId]);

  const updateExpense = useCallback((id: string, expense: Expense) => {
    setStateRaw(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => e.id === id ? { ...expense, createdAt: e.createdAt } : e),
    }));
    supabase.from('expenses').update(expenseToRow(expense, userId)).eq('id', id);
  }, [userId]);

  const removeExpense = useCallback((id: string) => {
    setStateRaw(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
    supabase.from('expenses').delete().eq('id', id);
  }, []);

  const addMember = useCallback((member: Member) => {
    setStateRaw(prev => ({ ...prev, members: [...prev.members, member] }));
    supabase.from('members').insert(memberToRow(member, userId));
  }, [userId]);

  const updateMember = useCallback((id: string, data: Partial<Member>) => {
    setStateRaw(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === id ? { ...m, ...data } : m),
    }));
    const member = state.members.find(m => m.id === id);
    if (member) {
      supabase.from('members').update(memberToRow({ ...member, ...data }, userId)).eq('id', id);
    }
  }, [state.members, userId]);

  const removeMember = useCallback((id: string) => {
    setStateRaw(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== id),
      expenses: prev.expenses.filter(e => e.memberId !== id),
      activeMember: prev.activeMember === id ? 'all' : prev.activeMember,
    }));
    supabase.from('members').delete().eq('id', id);
    supabase.from('expenses').delete().eq('member_id', id);
  }, []);

  const setActiveMember = useCallback((id: string) => {
    setStateRaw(prev => ({ ...prev, activeMember: id }));
  }, []);

  const setActiveMonth = useCallback((ym: string) => {
    setStateRaw(prev => ({ ...prev, activeMonth: ym }));
    supabase.from('settings').upsert({ id: 1, user_id: userId, active_month: ym });
  }, [userId]);

  if (!loaded) {
    return <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-slate-400">Carregando...</div>
    </div>;
  }

  return (
    <StoreContext.Provider value={{
      state, setState,
      getExpensesForMonth, getOutflows, getIncomes, getIndividualMembers,
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
