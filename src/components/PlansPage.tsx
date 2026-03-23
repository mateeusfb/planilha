'use client';

import { useState } from 'react';
import { Check, X, Star, Zap, Building2 } from 'lucide-react';

const plans = [
  {
    id: 'free',
    name: 'Grátis',
    price: 0,
    icon: <Zap size={20} />,
    color: 'from-slate-500 to-slate-600',
    badge: null,
    features: [
      { label: '1 workspace', included: true },
      { label: 'Até 50 lançamentos/mês', included: true },
      { label: 'Categorias padrão', included: true },
      { label: 'Análise de gastos', included: false },
      { label: 'Metas/orçamento', included: false },
      { label: 'Despesas recorrentes', included: false },
      { label: 'Export PDF/CSV', included: false },
      { label: 'Planejamento com especialistas', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    icon: <Star size={20} />,
    color: 'from-indigo-500 to-purple-600',
    badge: 'Mais popular',
    features: [
      { label: 'Até 3 workspaces', included: true },
      { label: 'Lançamentos ilimitados', included: true },
      { label: 'Categorias personalizadas', included: true },
      { label: 'Análise completa', included: true },
      { label: 'Até 5 metas/orçamento', included: true },
      { label: 'Até 10 despesas recorrentes', included: true },
      { label: 'Export CSV', included: true },
      { label: 'Planejamento com especialistas', included: false },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 19.99,
    icon: <Building2 size={20} />,
    color: 'from-amber-500 to-orange-600',
    badge: 'Completo',
    features: [
      { label: 'Até 10 workspaces', included: true },
      { label: 'Lançamentos ilimitados', included: true },
      { label: 'Categorias personalizadas', included: true },
      { label: 'Análise completa', included: true },
      { label: 'Metas/orçamento ilimitadas', included: true },
      { label: 'Despesas recorrentes ilimitadas', included: true },
      { label: 'Export PDF/CSV', included: true },
      { label: 'Planejamento com especialistas (em breve)', included: true },
    ],
  },
];

export default function PlansPage() {
  const [annual, setAnnual] = useState(false);

  function getPrice(price: number) {
    if (price === 0) return 'Grátis';
    const p = annual ? Math.round(price * 12 * 0.83 * 100) / 100 : price;
    return `R$ ${p.toFixed(2).replace('.', ',')}`;
  }

  function getPeriod(price: number) {
    if (price === 0) return 'para sempre';
    return annual ? '/ano' : '/mês';
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold t-text mb-2">Escolha seu plano</h2>
        <p className="t-text-muted text-sm">Comece grátis e evolua quando precisar</p>

        <div className="inline-flex items-center gap-4 mt-6 px-5 py-2.5 rounded-full t-card border">
          <span className={`text-sm font-medium ${!annual ? 't-text' : 't-text-muted'}`}>Mensal</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${annual ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${annual ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? 't-text' : 't-text-muted'}`}>
            Anual <span className="text-xs text-green-600 font-semibold ml-1">-17%</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`t-card rounded-2xl border p-6 flex flex-col relative transition-shadow hover:shadow-lg ${
              plan.id === 'pro' ? 'border-indigo-500/50 shadow-md shadow-indigo-500/10' : ''
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
              <span className="text-3xl font-extrabold t-text">{getPrice(plan.price)}</span>
              <span className="text-sm t-text-muted ml-1">{getPeriod(plan.price)}</span>
            </div>

            <ul className="space-y-3 flex-1 mb-6">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  {f.included ? (
                    <Check size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <X size={16} className="text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5" />
                  )}
                  <span className={f.included ? 't-text' : 't-text-muted'}>{f.label}</span>
                </li>
              ))}
            </ul>

            <button
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                plan.id === 'pro'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/20'
                  : plan.id === 'business'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500 shadow-lg shadow-amber-500/20'
                  : 't-card border t-border t-text hover:opacity-80'
              }`}
            >
              {plan.price === 0 ? 'Plano atual' : 'Assinar agora'}
            </button>
          </div>
        ))}
      </div>

      <div className="text-center mt-6">
        <p className="text-xs t-text-muted">
          Cancele a qualquer momento. Sem multas ou taxas escondidas.
        </p>
      </div>
    </div>
  );
}
