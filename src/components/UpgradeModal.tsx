'use client';

import { X, Crown } from 'lucide-react';
import { PLAN_NAMES, type PlanId } from '@/lib/plans';

interface UpgradeModalProps {
  message: string;
  requiredPlan: PlanId;
  onClose: () => void;
  onGoToPlans: () => void;
}

export default function UpgradeModal({ message, requiredPlan, onClose, onGoToPlans }: UpgradeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="t-card border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md">
              <Crown size={20} />
            </div>
            <h3 className="text-lg font-bold t-text">Upgrade necessário</h3>
          </div>
          <button onClick={onClose} className="t-text-muted hover:t-text transition-colors cursor-pointer p-1">
            <X size={18} />
          </button>
        </div>

        <p className="t-text-muted text-sm mb-6 leading-relaxed">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium t-card border t-border t-text hover:opacity-80 transition-all cursor-pointer"
          >
            Voltar
          </button>
          <button
            onClick={() => { onClose(); onGoToPlans(); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-500 hover:to-orange-600 transition-all cursor-pointer shadow-lg shadow-orange-500/20"
          >
            Ver plano {PLAN_NAMES[requiredPlan]}
          </button>
        </div>
      </div>
    </div>
  );
}
