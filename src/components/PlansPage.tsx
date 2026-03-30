'use client';

import { Check, Star, Zap, Building2, Clock } from 'lucide-react';

const plans = [
  {
    id: 'free',
    name: 'Grátis',
    icon: <Zap size={20} />,
    color: 'from-slate-500 to-slate-600',
    badge: null,
    features: [
      '1 workspace',
      'Até 50 lançamentos/mês',
      'Categorias padrão',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: <Star size={20} />,
    color: 'from-orange-500 to-orange-600',
    badge: 'Mais popular',
    features: [
      'Até 3 workspaces',
      'Lançamentos ilimitados',
      'Categorias personalizadas',
      'Análise completa',
      'Metas e orçamento',
      'Despesas recorrentes',
      'Export CSV',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    icon: <Building2 size={20} />,
    color: 'from-amber-500 to-orange-600',
    badge: 'Completo',
    features: [
      'Até 10 workspaces',
      'Tudo do Pro',
      'Metas ilimitadas',
      'Despesas recorrentes ilimitadas',
      'Export PDF/CSV',
      'Planejamento com especialistas',
    ],
  },
];

export default function PlansPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold t-text mb-2">Planos</h2>
        <p className="t-text-muted text-sm">Conheça o que estamos preparando para você</p>
      </div>

      {/* Banner EM BREVE */}
      <div className="mb-8 p-4 rounded-2xl border-2 border-dashed border-orange-400/50 bg-orange-500/5 flex items-center justify-center gap-3">
        <Clock size={24} className="text-orange-500" />
        <div>
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">EM BREVE</p>
          <p className="text-sm t-text-muted">Estamos finalizando os planos. Por enquanto, todas as funcionalidades estão liberadas!</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`t-card rounded-2xl border p-6 flex flex-col relative transition-shadow hover:shadow-lg opacity-75 ${
              plan.id === 'pro' ? 'border-orange-500/50 shadow-md shadow-orange-500/10' : ''
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${plan.color}`}>
                  {plan.badge}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-white shadow-md`}>
                {plan.icon}
              </div>
              <h3 className="text-lg font-bold t-text">{plan.name}</h3>
            </div>

            <div className="mb-6">
              <span className="text-xl font-semibold t-text-muted">Em breve</span>
            </div>

            <ul className="space-y-3 flex-1 mb-6">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="t-text">{f}</span>
                </li>
              ))}
            </ul>

            <button
              disabled
              className="w-full py-3 rounded-xl font-semibold text-sm t-card border t-border t-text-muted cursor-not-allowed opacity-60"
            >
              Em breve
            </button>
          </div>
        ))}
      </div>

      <div className="text-center mt-6">
        <p className="text-xs t-text-muted">
          Enquanto os planos não são lançados, aproveite todas as funcionalidades gratuitamente.
        </p>
      </div>
    </div>
  );
}
