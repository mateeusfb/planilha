'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

// ── Plan limits ──
export type PlanId = 'free' | 'pro' | 'business';

export interface PlanLimits {
  maxWorkspaces: number;
  maxExpensesPerMonth: number;
  maxMembers: number;
  maxGoals: number;
  maxRecurring: number;
  maxInvestments: number;
  maxCustomCategories: number;
  maxCustomPayments: number;
  maxCustomBanks: number;
  canExportCSV: boolean;
  canExportPDF: boolean;
  canUseAnalysis: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxWorkspaces: 2,
    maxExpensesPerMonth: 100,
    maxMembers: 5,
    maxGoals: 10,
    maxRecurring: 50,
    maxInvestments: 10,
    maxCustomCategories: 10,
    maxCustomPayments: 5,
    maxCustomBanks: 5,
    canExportCSV: false,
    canExportPDF: false,
    canUseAnalysis: false,
  },
  pro: {
    maxWorkspaces: 3,
    maxExpensesPerMonth: Infinity,
    maxMembers: 15,
    maxGoals: 30,
    maxRecurring: 20,
    maxInvestments: 50,
    maxCustomCategories: 30,
    maxCustomPayments: 15,
    maxCustomBanks: 15,
    canExportCSV: true,
    canExportPDF: false,
    canUseAnalysis: true,
  },
  business: {
    maxWorkspaces: 10,
    maxExpensesPerMonth: Infinity,
    maxMembers: Infinity,
    maxGoals: Infinity,
    maxRecurring: Infinity,
    maxInvestments: Infinity,
    maxCustomCategories: Infinity,
    maxCustomPayments: Infinity,
    maxCustomBanks: Infinity,
    canExportCSV: true,
    canExportPDF: true,
    canUseAnalysis: true,
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
  checkMemberLimit: (currentCount: number) => string | null;
  checkGoalLimit: (currentCount: number) => string | null;
  checkRecurringLimit: (currentCount: number) => string | null;
  checkInvestmentLimit: (currentCount: number) => string | null;
  checkCustomCategoryLimit: (currentCount: number) => string | null;
  checkCustomPaymentLimit: (currentCount: number) => string | null;
  checkCustomBankLimit: (currentCount: number) => string | null;
  checkExportCSV: () => string | null;
  checkExportPDF: () => string | null;
  checkAnalysis: () => string | null;
  /** @deprecated Use specific check functions instead */
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
      return `Você atingiu o limite de ${limits.maxWorkspaces} workspace${limits.maxWorkspaces > 1 ? 's' : ''} do plano ${PLAN_NAMES[plan]}.`;
    }
    return null;
  }, [limits, plan]);

  const checkExpenseLimit = useCallback((currentMonthCount: number): string | null => {
    if (currentMonthCount >= limits.maxExpensesPerMonth) {
      return `Você atingiu o limite de ${limits.maxExpensesPerMonth} lançamentos por mês do plano ${PLAN_NAMES[plan]}.`;
    }
    return null;
  }, [limits, plan]);

  const checkMemberLimit = useCallback((currentCount: number): string | null => {
    if (currentCount >= limits.maxMembers) {
      return `Você atingiu o limite de ${limits.maxMembers} membro${limits.maxMembers > 1 ? 's' : ''} do plano ${PLAN_NAMES[plan]}.`;
    }
    return null;
  }, [limits, plan]);

  const checkGoalLimit = useCallback((currentCount: number): string | null => {
    if (currentCount >= limits.maxGoals) {
      return `Você atingiu o limite de ${limits.maxGoals} meta${limits.maxGoals > 1 ? 's' : ''} do plano ${PLAN_NAMES[plan]}.`;
    }
    return null;
  }, [limits, plan]);

  const checkRecurringLimit = useCallback((currentCount: number): string | null => {
    if (currentCount >= limits.maxRecurring) {
      return `Você atingiu o limite de ${limits.maxRecurring} despesa${limits.maxRecurring > 1 ? 's' : ''} recorrente${limits.maxRecurring > 1 ? 's' : ''} do plano ${PLAN_NAMES[plan]}.`;
    }
    return null;
  }, [limits, plan]);

  const checkInvestmentLimit = useCallback((currentCount: number): string | null => {
    if (currentCount >= limits.maxInvestments) {
      return `Você atingiu o limite de ${limits.maxInvestments} investimento${limits.maxInvestments > 1 ? 's' : ''} do plano ${PLAN_NAMES[plan]}.`;
    }
    return null;
  }, [limits, plan]);

  const checkCustomCategoryLimit = useCallback((currentCount: number): string | null => {
    if (currentCount >= limits.maxCustomCategories) {
      return `Você atingiu o limite de ${limits.maxCustomCategories} categoria${limits.maxCustomCategories > 1 ? 's' : ''} personalizada${limits.maxCustomCategories > 1 ? 's' : ''} do plano ${PLAN_NAMES[plan]}.`;
    }
    return null;
  }, [limits, plan]);

  const checkCustomPaymentLimit = useCallback((currentCount: number): string | null => {
    if (currentCount >= limits.maxCustomPayments) {
      return `Você atingiu o limite de ${limits.maxCustomPayments} forma${limits.maxCustomPayments > 1 ? 's' : ''} de pagamento do plano ${PLAN_NAMES[plan]}.`;
    }
    return null;
  }, [limits, plan]);

  const checkCustomBankLimit = useCallback((currentCount: number): string | null => {
    if (currentCount >= limits.maxCustomBanks) {
      return `Você atingiu o limite de ${limits.maxCustomBanks} instituição${limits.maxCustomBanks > 1 ? 'ões' : ''} bancária${limits.maxCustomBanks > 1 ? 's' : ''} do plano ${PLAN_NAMES[plan]}.`;
    }
    return null;
  }, [limits, plan]);

  const checkExportCSV = useCallback((): string | null => {
    if (!limits.canExportCSV) {
      return `Exportar CSV está disponível a partir do plano Pro.`;
    }
    return null;
  }, [limits]);

  const checkExportPDF = useCallback((): string | null => {
    if (!limits.canExportPDF) {
      return `Exportar PDF está disponível a partir do plano Business.`;
    }
    return null;
  }, [limits]);

  const checkAnalysis = useCallback((): string | null => {
    if (!limits.canUseAnalysis) {
      return `A análise de gastos está disponível a partir do plano Pro.`;
    }
    return null;
  }, [limits]);

  // Legacy: kept for existing components that use boolean check
  const checkCustomCategories = useCallback((): string | null => {
    return null; // Now handled by specific limit checks
  }, []);

  const requiredPlanFor = useCallback((feature: string): PlanId => {
    const featureMap: Record<string, PlanId> = {
      workspace: 'pro',
      analysis: 'pro',
      goals: 'pro',
      recurring: 'pro',
      investments: 'pro',
      members: 'pro',
      exportCSV: 'pro',
      customCategories: 'pro',
      customPayments: 'pro',
      customBanks: 'pro',
      exportPDF: 'business',
    };
    return featureMap[feature] || 'pro';
  }, []);

  return (
    <PlanContext.Provider value={{
      plan, limits, loading,
      checkWorkspaceLimit, checkExpenseLimit, checkMemberLimit,
      checkGoalLimit, checkRecurringLimit, checkInvestmentLimit,
      checkCustomCategoryLimit, checkCustomPaymentLimit, checkCustomBankLimit,
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
