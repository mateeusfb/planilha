'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { AppState, Member, Expense } from './types';
import { COLORS } from './constants';
import { getCurrentMonth } from './helpers';
import { supabase } from './supabase';

const defaultState: AppState = {
  members: [{ id: 'all', name: 'Familia (todos)', color: '#2563eb' }],
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

// ── Supabase helpers ──
function memberToRow(m: Member) {
  return { id: m.id, name: m.name, color: m.color, photo: m.photo || null, is_conjunta: !!m.isConjunta };
}
function rowToMember(r: Record<string, unknown>): Member {
  return { id: r.id as string, name: r.name as string, color: r.color as string, photo: r.photo as string | null, isConjunta: !!r.is_conjunta };
}
function expenseToRow(e: Expense) {
  return {
    id: e.id, type: e.type, description: e.desc, category: e.cat, value: e.value,
    month: e.month, payment: e.payment, installment: e.installment || 0,
    installment_current: e.installmentCurrent || 0, installment_group_id: e.installmentGroupId || null,
    member_id: e.memberId || 'all', note: e.note || null,
    conjunta_group_id: e.conjuntaGroupId || null, conjunta_name: e.conjuntaName || null,
    created_at: e.createdAt || Date.now(),
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<AppState>(defaultState);
  const [loaded, setLoaded] = useState(false);
  const skipSync = useRef(false);

  // ── Load from Supabase (fallback localStorage) ──
  useEffect(() => {
    async function loadFromSupabase() {
      try {
        const [membersRes, expensesRes, settingsRes] = await Promise.all([
          supabase.from('members').select('*'),
          supabase.from('expenses').select('*'),
          supabase.from('settings').select('*').eq('id', 1).single(),
        ]);

        if (membersRes.error || expensesRes.error) throw new Error('Supabase load failed');

        const dbMembers = (membersRes.data || []).map(rowToMember);
        const dbExpenses = (expensesRes.data || []).map(rowToExpense);
        const settings = settingsRes.data;

        // If DB is empty, try migrating from localStorage
        if (dbMembers.length === 0 && dbExpenses.length === 0) {
          const local = localStorage.getItem('fin_data');
          if (local) {
            const parsed = JSON.parse(local);
            if (parsed.members?.length > 1 || parsed.expenses?.length > 0) {
              await migrateLocalToSupabase(parsed);
              // Reload after migration
              const [m2, e2] = await Promise.all([
                supabase.from('members').select('*'),
                supabase.from('expenses').select('*'),
              ]);
              const migratedMembers = (m2.data || []).map(rowToMember);
              const migratedExpenses = (e2.data || []).map(rowToExpense);

              skipSync.current = true;
              setStateRaw(prev => ({
                ...prev,
                members: [defaultState.members[0], ...migratedMembers],
                expenses: migratedExpenses,
                customCats: parsed.customCats || [],
                customPayments: parsed.customPayments || [],
                activeMonth: parsed.activeMonth || getCurrentMonth(),
              }));
              setLoaded(true);
              return;
            }
          }
        }

        skipSync.current = true;
        setStateRaw(prev => ({
          ...prev,
          members: [defaultState.members[0], ...dbMembers],
          expenses: dbExpenses,
          customCats: settings?.custom_cats || [],
          customPayments: settings?.custom_payments || [],
          activeMonth: settings?.active_month || getCurrentMonth(),
        }));
      } catch {
        // Fallback to localStorage
        try {
          const d = localStorage.getItem('fin_data');
          if (d) {
            const parsed = JSON.parse(d);
            setStateRaw(prev => ({
              ...prev,
              ...parsed,
              members: parsed.members?.length ? parsed.members : defaultState.members,
              activeMonth: parsed.activeMonth || getCurrentMonth(),
            }));
          }
        } catch { /* ignore */ }
      }
      setLoaded(true);
    }

    loadFromSupabase();
  }, []);

  // ── Migrate localStorage data to Supabase ──
  async function migrateLocalToSupabase(parsed: Record<string, unknown>) {
    const members = (parsed.members as Member[] || []).filter(m => m.id !== 'all');
    const expenses = parsed.expenses as Expense[] || [];

    if (members.length > 0) {
      await supabase.from('members').upsert(members.map(memberToRow));
    }
    if (expenses.length > 0) {
      // Batch in chunks of 500
      for (let i = 0; i < expenses.length; i += 500) {
        const chunk = expenses.slice(i, i + 500);
        await supabase.from('expenses').upsert(chunk.map(expenseToRow));
      }
    }
    await supabase.from('settings').upsert({
      id: 1,
      custom_cats: parsed.customCats || [],
      custom_payments: parsed.customPayments || [],
      active_month: (parsed.activeMonth as string) || getCurrentMonth(),
    });
  }

  // ── Also keep localStorage as cache ──
  useEffect(() => {
    if (loaded) {
      localStorage.setItem('fin_data', JSON.stringify(state));
    }
  }, [state, loaded]);

  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateRaw(prev => {
      const next = updater(prev);
      // Sync settings to Supabase
      if (prev.customCats !== next.customCats || prev.customPayments !== next.customPayments) {
        supabase.from('settings').upsert({
          id: 1, custom_cats: next.customCats, custom_payments: next.customPayments, active_month: next.activeMonth,
        });
      }
      return next;
    });
  }, []);

  const getExpensesForMonth = useCallback((ym: string, memberId: string): Expense[] => {
    return state.expenses.filter(e => {
      if (e.month !== ym) return false;
      if (memberId === 'all') return true;
      return e.memberId === memberId;
    });
  }, [state.expenses]);

  const getOutflows = useCallback((ym: string, memberId: string): Expense[] => {
    return state.expenses.filter(e => {
      if (e.type === 'income' || e.month !== ym) return false;
      if (memberId === 'all') return true;
      return e.memberId === memberId;
    });
  }, [state.expenses]);

  const getIncomes = useCallback((ym: string, memberId: string): Expense[] => {
    return state.expenses.filter(e => {
      if (e.type !== 'income' || e.month !== ym) return false;
      if (memberId === 'all') return true;
      return e.memberId === memberId;
    });
  }, [state.expenses]);

  const getIndividualMembers = useCallback((): Member[] => {
    return state.members.filter(m => m.id !== 'all' && !m.isConjunta);
  }, [state.members]);

  const addExpense = useCallback((expense: Expense) => {
    setStateRaw(prev => ({ ...prev, expenses: [...prev.expenses, expense] }));
    supabase.from('expenses').insert(expenseToRow(expense));
  }, []);

  const updateExpense = useCallback((id: string, expense: Expense) => {
    setStateRaw(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => e.id === id ? { ...expense, createdAt: e.createdAt } : e),
    }));
    supabase.from('expenses').update(expenseToRow(expense)).eq('id', id);
  }, []);

  const removeExpense = useCallback((id: string) => {
    setStateRaw(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
    supabase.from('expenses').delete().eq('id', id);
  }, []);

  const addMember = useCallback((member: Member) => {
    setStateRaw(prev => ({ ...prev, members: [...prev.members, member] }));
    supabase.from('members').insert(memberToRow(member));
  }, []);

  const updateMember = useCallback((id: string, data: Partial<Member>) => {
    setStateRaw(prev => ({
      ...prev,
      members: prev.members.map(m => m.id === id ? { ...m, ...data } : m),
    }));
    const member = state.members.find(m => m.id === id);
    if (member) {
      supabase.from('members').update(memberToRow({ ...member, ...data })).eq('id', id);
    }
  }, [state.members]);

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
    supabase.from('settings').upsert({ id: 1, active_month: ym });
  }, []);

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
