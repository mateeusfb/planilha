'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { genId } from '@/lib/helpers';
import { COLORS } from '@/lib/constants';
import { useToast } from './Toast';

interface Props {
  onComplete: () => void;
  onAddMember: () => void;
}

export default function Onboarding({ onComplete, onAddMember }: Props) {
  const { state, addMember } = useStore();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [quickName, setQuickName] = useState('');

  const members = state.members.filter(m => m.id !== 'all');
  const hasMembers = members.length > 0;
  const hasExpenses = state.expenses.length > 0;

  const steps = [
    {
      icon: '👋',
      title: 'Bem-vindo ao Finanças Família!',
      subtitle: 'Vamos configurar sua planilha em poucos passos',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FeatureCard icon="👥" title="Membros" desc="Adicione quem faz parte da família" />
            <FeatureCard icon="💳" title="Lançamentos" desc="Registre receitas e despesas" />
            <FeatureCard icon="📊" title="Análises" desc="Acompanhe para onde vai seu dinheiro" />
          </div>
          <p className="text-sm t-text-dim text-center mt-4">
            Seus dados ficam seguros e privados. Apenas você tem acesso.
          </p>
        </div>
      ),
    },
    {
      icon: '👤',
      title: 'Adicione seu primeiro membro',
      subtitle: 'Quem faz parte das finanças da família?',
      content: (
        <div className="space-y-4">
          {!hasMembers ? (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickName}
                  onChange={e => setQuickName(e.target.value)}
                  placeholder="Digite seu nome..."
                  className="flex-1 px-4 py-3 border rounded-xl text-sm t-input focus:outline-none focus:ring-2 focus:ring-blue-100"
                  onKeyDown={e => { if (e.key === 'Enter' && quickName.trim()) handleQuickAdd(); }}
                />
                <button
                  onClick={handleQuickAdd}
                  disabled={!quickName.trim()}
                  className="px-5 py-3 t-accent-bg text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                >
                  Adicionar
                </button>
              </div>
              <div className="text-center">
                <button onClick={onAddMember} className="text-sm t-accent cursor-pointer hover:underline">
                  Quero personalizar com foto e cor
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 t-card border rounded-xl">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: m.color }}>
                      {m.name[0].toUpperCase()}
                    </span>
                    <span className="text-sm font-medium t-text">{m.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-center">
                <button onClick={onAddMember} className="text-sm t-accent cursor-pointer hover:underline">
                  + Adicionar outro membro
                </button>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      icon: '💰',
      title: 'Pronto para começar!',
      subtitle: 'Sua planilha está configurada',
      content: (
        <div className="space-y-4">
          <div className="t-card border rounded-xl p-5">
            <h4 className="text-sm font-bold mb-3 t-text">Próximos passos:</h4>
            <div className="space-y-3">
              <StepHint
                number={1}
                title="Adicione suas receitas"
                desc="Salário, renda extra, investimentos..."
                done={hasExpenses}
              />
              <StepHint
                number={2}
                title="Registre suas despesas"
                desc="Mercado, aluguel, assinaturas..."
                done={false}
              />
              <StepHint
                number={3}
                title="Acompanhe no Dashboard"
                desc="Gráficos, dicas e resumo financeiro"
                done={false}
              />
            </div>
          </div>
          <p className="text-xs t-text-dim text-center">
            Você pode acessar as configurações a qualquer momento pelo menu do perfil.
          </p>
        </div>
      ),
    },
  ];

  function handleQuickAdd() {
    if (!quickName.trim()) return;
    const colorIndex = members.length % COLORS.length;
    addMember({ id: genId(), name: quickName.trim(), color: COLORS[colorIndex], photo: null, isConjunta: false });
    toast(`${quickName.trim()} adicionado!`, 'success');
    setQuickName('');
  }

  function handleNext() {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  }

  function handleSkip() {
    onComplete();
  }

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const canAdvance = step === 0 || (step === 1 && hasMembers) || step === 2;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex gap-2 mb-6 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? 'w-10 t-accent-bg' : 'w-6 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="t-card rounded-2xl border shadow-sm p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">{current.icon}</div>
            <h2 className="text-xl font-bold t-text mb-1">{current.title}</h2>
            <p className="text-sm t-text-dim">{current.subtitle}</p>
          </div>

          {/* Content */}
          <div className="mb-6">
            {current.content}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-sm t-text-dim hover:t-text cursor-pointer"
            >
              {isLast ? '' : 'Pular'}
            </button>

            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-5 py-2.5 border t-border rounded-xl text-sm font-semibold t-text cursor-pointer hover:opacity-80"
                >
                  Voltar
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!canAdvance}
                className="px-6 py-2.5 t-accent-bg text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 transition-all"
              >
                {isLast ? 'Começar a usar' : 'Próximo'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="t-card border rounded-xl p-4 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-bold t-text mb-0.5">{title}</div>
      <div className="text-xs t-text-dim">{desc}</div>
    </div>
  );
}

function StepHint({ number, title, desc, done }: { number: number; title: string; desc: string; done: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        done ? 'bg-green-100 text-green-700' : 't-accent-light t-accent'
      }`}>
        {done ? '✓' : number}
      </span>
      <div>
        <div className="text-sm font-semibold t-text">{title}</div>
        <div className="text-xs t-text-dim">{desc}</div>
      </div>
    </div>
  );
}
