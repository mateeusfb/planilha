'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { genId } from '@/lib/helpers';
import { INCOME_CATS, EXPENSE_CATS } from '@/lib/constants';
import type { Expense } from '@/lib/types';

export interface ExpenseFormState {
  formType: 'expense' | 'income';
  editingId: string | null;
  desc: string;
  cat: string;
  value: string;
  month: string;
  payment: string;
  isInstallment: boolean;
  installmentN: number;
  installmentCurrent: number;
  memberId: string;
  note: string;
  purchaseDate: string;
  bank: string;
  saving: boolean;
  isRecurring: boolean;
  recurringDay: number;
}

export interface ExpenseFormActions {
  setFormType: (t: 'expense' | 'income') => void;
  setDesc: (v: string) => void;
  setCat: (v: string) => void;
  setValue: (v: string) => void;
  setMonth: (v: string) => void;
  setPayment: (v: string) => void;
  setIsInstallment: (v: boolean) => void;
  setInstallmentN: (v: number) => void;
  setInstallmentCurrent: (v: number) => void;
  setMemberId: (v: string) => void;
  setNote: (v: string) => void;
  setPurchaseDate: (v: string) => void;
  setBank: (v: string) => void;
  setIsRecurring: (v: boolean) => void;
  setRecurringDay: (v: number) => void;
  switchType: (type: 'expense' | 'income') => void;
  clearForm: () => void;
  startEdit: (e: Expense) => void;
  handleSave: (opts?: { onSuccess?: () => void; skipConjunta?: boolean }) => void;
}

export function useExpenseForm(): ExpenseFormState & ExpenseFormActions {
  const { state, setState, addExpense, updateExpense, getIndividualMembers, addRecurring } = useStore();
  const { activeMonth, members } = state;
  const individuals = getIndividualMembers();

  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState(EXPENSE_CATS[0]);
  const [value, setValue] = useState('');
  const [month, setMonth] = useState(activeMonth);
  const [payment, setPayment] = useState('Credito');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentN, setInstallmentN] = useState(2);
  const [installmentCurrent, setInstallmentCurrent] = useState(1);
  const [memberId, setMemberId] = useState('all');
  const [note, setNote] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [bank, setBank] = useState('');
  const [saving, setSaving] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState(1);

  function switchType(type: 'expense' | 'income') {
    setFormType(type);
    setCat(type === 'income' ? INCOME_CATS[0] : EXPENSE_CATS[0]);
    if (type === 'income' && memberId === 'all' && individuals.length > 0) {
      setMemberId(individuals[0].id);
    }
  }

  function clearForm() {
    setDesc(''); setValue(''); setNote(''); setBank('');
    setPayment('Credito'); setIsInstallment(false);
    setInstallmentN(2); setInstallmentCurrent(1);
    setMonth(activeMonth); setMemberId('all');
    setFormType('expense'); setCat(EXPENSE_CATS[0]);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setEditingId(null);
    setIsRecurring(false); setRecurringDay(1);
  }

  function startEdit(e: Expense) {
    setEditingId(e.id);
    switchType(e.type);
    setDesc(e.desc); setCat(e.cat); setValue(String(e.value));
    setMonth(e.month); setPayment(e.payment);
    setIsInstallment(e.installment > 0);
    setInstallmentN(e.installment || 2);
    setInstallmentCurrent(e.installmentCurrent || 1);
    setMemberId(e.memberId || 'all');
    setNote(e.note || '');
    setBank(e.bank || '');
    setPurchaseDate(e.purchaseDate || new Date().toISOString().split('T')[0]);
  }

  async function handleSave(opts?: { onSuccess?: () => void; skipConjunta?: boolean }) {
    const val = parseFloat(value);

    const selectedMember = members.find(m => m.id === memberId);
    const isConjunta = !opts?.skipConjunta && selectedMember?.isConjunta && formType === 'expense';

    if (isConjunta) {
      if (individuals.length === 0) return;
      const splitValue = val / individuals.length;
      const groupId = editingId || genId();
      if (editingId) {
        setState(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.conjuntaGroupId !== groupId) }));
      }
      setSaving(true);
      individuals.forEach(m => {
        addExpense({
          id: genId(), type: 'expense', desc: desc.trim(), cat, value: Math.round(splitValue * 100) / 100,
          month, payment, installment: 0, memberId: m.id,
          note: `Conjunta${note ? ': ' + note : ''}`, purchaseDate, bank: bank || undefined,
          conjuntaGroupId: groupId, conjuntaName: selectedMember?.name,
          createdAt: Date.now(),
        });
      });
      setSaving(false);
      opts?.onSuccess?.();
      return;
    }

    if (isInstallment && !editingId && formType === 'expense') {
      const groupId = genId();
      const [baseY, baseM] = month.split('-').map(Number);
      for (let i = installmentCurrent; i <= installmentN; i++) {
        const d = new Date(baseY, baseM - 1 + (i - installmentCurrent), 1);
        const entryMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        addExpense({
          id: genId(), type: 'expense', desc: desc.trim(), cat, value: val,
          month: entryMonth, payment, installment: installmentN, installmentCurrent: i,
          installmentGroupId: groupId, memberId, note, purchaseDate, bank: bank || undefined, createdAt: Date.now(),
        });
      }
      opts?.onSuccess?.();
      return;
    }

    const expense: Expense = {
      id: editingId || genId(), type: formType, desc: desc.trim(), cat, value: val,
      month, payment: formType === 'income' ? '-' : payment,
      installment: isInstallment ? installmentN : 0,
      installmentCurrent: isInstallment ? installmentCurrent : 0,
      memberId, note, purchaseDate, bank: bank || undefined, createdAt: Date.now(),
    };

    setSaving(true);
    if (editingId) {
      updateExpense(editingId, expense);
    } else {
      addExpense(expense);
      // Create recurring rule if toggled
      if (isRecurring && formType === 'expense') {
        await addRecurring({
          description: desc.trim(),
          category: cat,
          value: val,
          payment,
          bank: bank || undefined,
          memberId,
          dayOfMonth: recurringDay,
        });
      }
    }
    setSaving(false);
    opts?.onSuccess?.();
  }

  return {
    formType, editingId, desc, cat, value, month, payment,
    isInstallment, installmentN, installmentCurrent, memberId,
    note, purchaseDate, bank, saving, isRecurring, recurringDay,
    setFormType, setDesc, setCat, setValue, setMonth, setPayment,
    setIsInstallment, setInstallmentN, setInstallmentCurrent,
    setMemberId, setNote, setPurchaseDate, setBank,
    setIsRecurring, setRecurringDay,
    switchType, clearForm, startEdit, handleSave,
  };
}
