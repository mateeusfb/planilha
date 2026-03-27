'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

// ── Plan limits ──
export type PlanId = 'free' | 'pro' | 'business';

export interface PlanLimits {
  maxWorkspaces: number;
  maxExpensesPerMonth: number;
  maxGoals: number;
  maxRecurring: number;
  canExportCSV: boolean;
  canExportPDF: boolean;
  canUseAnalysis: boolean;
  canCustomCategories: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxWorkspaces: 1,
    maxExpensesPerMonth: 50,
    maxGoals: 0,
    maxRecurring: 0,
    canExportCSV: false,
    canExportPDF: false,
    canUseAnalysis: false,
    canCustomCategories: false,
  },
  pro: {
    maxWorkspaces: 3,
    maxExpensesPerMonth: Infinity,
    maxGoals: 5,
    maxRecurring: 10,
    canExportCSV: true,
    canExportPDF: false,
    canUseAnalysis: true,
    canCustomCategories: true,
  },
  business: {
    maxWorkspaces: 10,
    maxExpensesPerMonth: Infinity,
    maxGoals: Infinity,
    maxRecurring: Infinity,
    canExportCSV: true,
    canExportPDF: true,
    canUseAnalysis: true,
    canCustomCategories: true,
  },
};

export const PLAN_NAMES: Record<PlanId, string> = {
  free: 'Grátis',
  pro: 'Pro',
  business: 'Business',
};

// ── Context ──
interface PlanContextType {
  plan: PlanId;
  limits: PlanLimits;
  loading: boolean;
  /** Returns null if allowed, or a message string if blocked */
  checkWorkspaceLimit: (currentCount: number) => string | null;
  checkExpenseLimit: (currentMonthCount: number) => string | null;
  checkGoalLimit: (currentCount: number) => string | null;
  checkRecurringLimit: (currentCount: number) => string | null;
  checkExportCSV: () => string | null;
  checkExportPDF: () => string | null;
  checkAnalysis: () => string | null;
  checkCustomCategories: () => string | null;
  /** Which plan is needed to unlock a feature */
  requiredPlanFor: (feature: string) => PlanId;
}

const PlanContext = createContext<PlanContextType | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanId>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPlan() {
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('user_subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .single();

      if (!cancelled) {
        if (data?.plan && ['free', 'pro', 'business'].includes(data.plan)) {
          setPlan(data.plan as PlanId);
        }
        setLoading(false);
      }
    }
    loadPlan();
    return () => { cancelled = true; };
  }, [user]);

  const limits = PLAN_LIMITS[plan];

  // ── Planos desativados: tudo liberado até o lançamento ──
  const checkWorkspaceLimit = useCallback((_currentCount: number): string | null => {
    return null;
  }, []);

  const checkExpenseLimit = useCallback((_currentMonthCount: number): string | null => {
    return null;
  }, []);

  const checkGoalLimit = useCallback((_currentCount: number): string | null => {
    return null;
  }, []);

  const checkRecurringLimit = useCallback((_currentCount: number): string | null => {
    return null;
  }, []);

  const checkExportCSV = useCallback((): string | null => {
    return null;
  }, []);

  const checkExportPDF = useCallback((): string | null => {
    return null;
  }, []);

  const checkAnalysis = useCallback((): string | null => {
    return null;
  }, []);

  const checkCustomCategories = useCallback((): string | null => {
    return null;
  }, []);

  const requiredPlanFor = useCallback((feature: string): PlanId => {
    const featureMap: Record<string, PlanId> = {
      workspace: 'pro',
      analysis: 'pro',
      goals: 'pro',
      recurring: 'pro',
      exportCSV: 'pro',
      customCategories: 'pro',
      exportPDF: 'business',
    };
    return featureMap[feature] || 'pro';
  }, []);

  return (
    <PlanContext.Provider value={{
      plan, limits, loading,
      checkWorkspaceLimit, checkExpenseLimit, checkGoalLimit, checkRecurringLimit,
      checkExportCSV, checkExportPDF, checkAnalysis, checkCustomCategories,
      requiredPlanFor,
    }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
}
