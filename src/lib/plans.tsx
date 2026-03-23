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

  const checkWorkspaceLimit = useCallback((currentCount: number): string | null => {
    if (currentCount >= limits.maxWorkspaces) {
      return `Seu plano ${PLAN_NAMES[plan]} permite até ${limits.maxWorkspaces} workspace${limits.maxWorkspaces > 1 ? 's' : ''}. Faça upgrade para criar mais.`;
    }
    return null;
  }, [plan, limits]);

  const checkExpenseLimit = useCallback((currentMonthCount: number): string | null => {
    if (limits.maxExpensesPerMonth !== Infinity && currentMonthCount >= limits.maxExpensesPerMonth) {
      return `Seu plano ${PLAN_NAMES[plan]} permite até ${limits.maxExpensesPerMonth} lançamentos por mês. Faça upgrade para lançamentos ilimitados.`;
    }
    return null;
  }, [plan, limits]);

  const checkGoalLimit = useCallback((currentCount: number): string | null => {
    if (limits.maxGoals === 0) {
      return `Metas e orçamentos não estão disponíveis no plano ${PLAN_NAMES[plan]}. Faça upgrade para o Pro.`;
    }
    if (limits.maxGoals !== Infinity && currentCount >= limits.maxGoals) {
      return `Seu plano ${PLAN_NAMES[plan]} permite até ${limits.maxGoals} metas. Faça upgrade para o Business para metas ilimitadas.`;
    }
    return null;
  }, [plan, limits]);

  const checkRecurringLimit = useCallback((currentCount: number): string | null => {
    if (limits.maxRecurring === 0) {
      return `Despesas recorrentes não estão disponíveis no plano ${PLAN_NAMES[plan]}. Faça upgrade para o Pro.`;
    }
    if (limits.maxRecurring !== Infinity && currentCount >= limits.maxRecurring) {
      return `Seu plano ${PLAN_NAMES[plan]} permite até ${limits.maxRecurring} despesas recorrentes. Faça upgrade para o Business para ilimitadas.`;
    }
    return null;
  }, [plan, limits]);

  const checkExportCSV = useCallback((): string | null => {
    if (!limits.canExportCSV) {
      return `Export CSV não está disponível no plano ${PLAN_NAMES[plan]}. Faça upgrade para o Pro.`;
    }
    return null;
  }, [plan, limits]);

  const checkExportPDF = useCallback((): string | null => {
    if (!limits.canExportPDF) {
      return `Export PDF não está disponível no plano ${PLAN_NAMES[plan]}. Faça upgrade para o Business.`;
    }
    return null;
  }, [plan, limits]);

  const checkAnalysis = useCallback((): string | null => {
    if (!limits.canUseAnalysis) {
      return `Análise de gastos não está disponível no plano ${PLAN_NAMES[plan]}. Faça upgrade para o Pro.`;
    }
    return null;
  }, [plan, limits]);

  const checkCustomCategories = useCallback((): string | null => {
    if (!limits.canCustomCategories) {
      return `Categorias personalizadas não estão disponíveis no plano ${PLAN_NAMES[plan]}. Faça upgrade para o Pro.`;
    }
    return null;
  }, [plan, limits]);

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
