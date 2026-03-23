'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Wallet, BarChart3, Users, Brain, Eye, EyeOff, Shield, Zap, PiggyBank, ArrowRight, Check, X as XIcon, Star, Building2 } from 'lucide-react';

export default function AuthPage({ forceMode }: { forceMode?: 'reset' }) {
  const { signIn, signUp, clearRecovery } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>(forceMode || 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (mode !== 'reset' && window.location.hash.includes('type=recovery')) {
      setMode('reset');
    }
  }, [mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (mode !== 'reset' && email !== 'admin' && !email.includes('@')) {
      setError('Digite um email válido.'); setLoading(false); return;
    }

    if (mode === 'signup') {
      if (!name.trim()) { setError('Digite seu nome.'); setLoading(false); return; }
      if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); setLoading(false); return; }
      if (!consent) { setError('Você precisa concordar com a política de privacidade para criar sua conta.'); setLoading(false); return; }
      const result = await signUp(email, password, name);
      if (result.error) {
        setError(traduzirErro(result.error));
      } else {
        setSuccess('Conta criada com sucesso! Verifique seu email para confirmar o cadastro e depois faça login.');
        setTimeout(() => {
          switchMode('login');
          setEmail(email);
        }, 3000);
      }
    } else if (mode === 'forgot') {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (err) {
        setError(traduzirErro(err.message));
      } else {
        setSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.');
      }
    } else if (mode === 'reset') {
      if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); setLoading(false); return; }
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(traduzirErro(err.message));
      } else {
        setSuccess('Senha alterada com sucesso! Redirecionando...');
        clearRecovery();
        setTimeout(() => window.location.replace('/'), 1500);
      }
    } else {
      const result = await signIn(email, password);
      if (result.error) {
        setError(traduzirErro(result.error));
      }
    }
    setLoading(false);
  }

  function traduzirErro(msg: string): string {
    if (msg.includes('Invalid login')) return 'Email ou senha incorretos.';
    if (msg.includes('Email not confirmed')) return 'Confirme seu email antes de entrar. Verifique sua caixa de entrada.';
    if (msg.includes('already registered')) return 'Este email já está cadastrado. Tente fazer login.';
    if (msg.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    if (msg.includes('User not found')) return 'Nenhuma conta encontrada com este email.';
    return msg;
  }

  function switchMode(newMode: 'login' | 'signup' | 'forgot') {
    setMode(newMode);
    setError('');
    setSuccess('');
    setShowPassword(false);
    setTimeout(() => {
      document.getElementById('auth-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  const titles = {
    login: 'Entrar na sua conta',
    signup: 'Criar sua conta',
    forgot: 'Recuperar senha',
    reset: 'Nova senha',
  };

  const buttons = {
    login: 'Entrar',
    signup: 'Criar conta',
    forgot: 'Enviar email de recuperação',
    reset: 'Salvar nova senha',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-indigo-500/8 via-purple-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
      </div>

      {/* Top nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Wallet size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white">Folga</span>
        </div>
        <div className="flex items-center gap-3">
          {mode !== 'login' && (
            <button onClick={() => switchMode('login')}
              className="text-sm text-slate-400 hover:text-white transition-colors cursor-pointer">
              Login
            </button>
          )}
          {mode !== 'signup' && (
            <button onClick={() => switchMode('signup')}
              className="text-sm px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all cursor-pointer">
              Criar conta
            </button>
          )}
        </div>
      </nav>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">

          {/* Left: Hero / storytelling */}
          <div className="text-center lg:text-left animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
              <Zap size={12} /> Controle financeiro inteligente
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4">
              Sua vida financeira,{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                sem estresse.
              </span>
            </h1>

            <p className="text-base md:text-lg text-slate-400 mb-8 max-w-md mx-auto lg:mx-0 leading-relaxed">
              Organize receitas, despesas e investimentos da sua família em um só lugar. Com dicas inteligentes para ter mais folga no final do mês.
            </p>

            {/* Feature pills */}
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto lg:mx-0 mb-8">
              <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 animate-fade-in-up stagger-1">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 size={16} className="text-green-400" />
                </div>
                <span className="text-sm text-slate-300">Dashboard completo</span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 animate-fade-in-up stagger-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Users size={16} className="text-blue-400" />
                </div>
                <span className="text-sm text-slate-300">Múltiplos workspaces</span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 animate-fade-in-up stagger-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Brain size={16} className="text-purple-400" />
                </div>
                <span className="text-sm text-slate-300">Dicas inteligentes</span>
              </div>
              <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 animate-fade-in-up stagger-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Shield size={16} className="text-amber-400" />
                </div>
                <span className="text-sm text-slate-300">100% seguro</span>
              </div>
            </div>

            {/* Social proof */}
            <div className="hidden lg:flex items-center gap-3 text-sm text-slate-500">
              <div className="flex -space-x-2">
                {['#6366f1','#10b981','#f59e0b','#ef4444'].map((c, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-[#0a0a0f] flex items-center justify-center text-white text-[0.6rem] font-bold"
                    style={{ background: c }}>{String.fromCharCode(65 + i)}</div>
                ))}
              </div>
              <span>Usado por famílias que querem mais <span className="text-indigo-400 font-medium">folga</span></span>
            </div>
          </div>

          {/* Right: Auth form card */}
          <div className="w-full max-w-md mx-auto lg:mx-0 animate-fade-in-up stagger-2">
            <div id="auth-form" className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/20">
              <h2 className="text-xl font-bold text-white mb-6 text-center">{titles[mode]}</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                  </div>
                )}

                {mode !== 'reset' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com" required autoComplete="email"
                      className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                  </div>
                )}

                {mode !== 'forgot' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      {mode === 'reset' ? 'Nova senha' : 'Senha'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-4 py-3 pr-12 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer p-1"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'signup' && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={e => setConsent(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 accent-indigo-600 cursor-pointer"
                    />
                    <span className="text-xs text-slate-500 leading-relaxed">
                      Ao criar sua conta, você concorda com nossa{' '}
                      <a href="/privacidade" target="_blank" className="text-indigo-400 underline hover:text-indigo-300">política de privacidade</a>.
                      Seus dados financeiros são criptografados e armazenados com segurança. Você pode excluir sua conta e todos os dados a qualquer momento nas configurações.
                    </span>
                  </label>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-green-400 text-sm">
                    {success}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
                  {loading ? 'Aguarde...' : (
                    <>
                      {buttons[mode]}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Links */}
              <div className="mt-5 space-y-2 text-center">
                {mode === 'login' && (
                  <>
                    <button onClick={() => switchMode('forgot')}
                      className="block w-full text-sm text-slate-600 hover:text-slate-300 transition-colors cursor-pointer">
                      Esqueci minha senha
                    </button>
                    <p className="text-slate-500 text-sm">
                      Não tem uma conta?{' '}
                      <button onClick={() => switchMode('signup')}
                        className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors cursor-pointer">
                        Criar conta grátis
                      </button>
                    </p>
                  </>
                )}
                {mode === 'signup' && (
                  <p className="text-slate-500 text-sm">
                    Já tem uma conta?{' '}
                    <button onClick={() => switchMode('login')}
                      className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors cursor-pointer">
                      Fazer login
                    </button>
                  </p>
                )}
                {mode === 'forgot' && (
                  <button onClick={() => switchMode('login')}
                    className="text-indigo-400 font-semibold text-sm hover:text-indigo-300 transition-colors cursor-pointer">
                    Voltar ao login
                  </button>
                )}
              </div>
            </div>

            <p className="text-center text-slate-700 text-xs mt-5">
              Comece grátis — seus dados ficam seguros na nuvem
            </p>
          </div>
        </div>
      </div>

      {/* Pricing section */}
      <div className="relative z-10 px-4 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Planos que cabem no seu bolso</h2>
            <p className="text-slate-400 text-sm md:text-base">Comece grátis e evolua quando precisar</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Free */}
            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white shadow-md">
                  <Zap size={20} />
                </div>
                <h3 className="text-lg font-bold text-white">Grátis</h3>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-extrabold text-white">R$ 0</span>
                <span className="text-sm text-slate-400 ml-1">para sempre</span>
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                {[
                  { label: '1 workspace', ok: true },
                  { label: 'Até 50 lançamentos/mês', ok: true },
                  { label: 'Categorias padrão', ok: true },
                  { label: 'Análise de gastos', ok: false },
                  { label: 'Metas/orçamento', ok: false },
                  { label: 'Despesas recorrentes', ok: false },
                  { label: 'Export PDF/CSV', ok: false },
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    {f.ok ? <Check size={16} className="text-green-400 flex-shrink-0 mt-0.5" /> : <XIcon size={16} className="text-slate-600 flex-shrink-0 mt-0.5" />}
                    <span className={f.ok ? 'text-slate-300' : 'text-slate-600'}>{f.label}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => switchMode('signup')} className="w-full py-3 rounded-xl font-semibold text-sm bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.1] transition-all cursor-pointer">
                Criar conta grátis
              </button>
            </div>

            {/* Pro */}
            <div className="bg-white/[0.04] backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-6 flex flex-col relative shadow-lg shadow-indigo-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600">Mais popular</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                  <Star size={20} />
                </div>
                <h3 className="text-lg font-bold text-white">Pro</h3>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-extrabold text-white">R$ 9,99</span>
                <span className="text-sm text-slate-400 ml-1">/mês</span>
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                {[
                  { label: 'Até 3 workspaces', ok: true },
                  { label: 'Lançamentos ilimitados', ok: true },
                  { label: 'Categorias personalizadas', ok: true },
                  { label: 'Análise completa', ok: true },
                  { label: 'Até 5 metas/orçamento', ok: true },
                  { label: 'Até 10 despesas recorrentes', ok: true },
                  { label: 'Export CSV', ok: true },
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Check size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{f.label}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => switchMode('signup')} className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 transition-all cursor-pointer shadow-lg shadow-indigo-500/20">
                Começar agora
              </button>
            </div>

            {/* Business */}
            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600">Completo</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
                  <Building2 size={20} />
                </div>
                <h3 className="text-lg font-bold text-white">Business</h3>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-extrabold text-white">R$ 19,99</span>
                <span className="text-sm text-slate-400 ml-1">/mês</span>
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                {[
                  { label: 'Até 10 workspaces', ok: true },
                  { label: 'Tudo do Pro', ok: true },
                  { label: 'Metas/orçamento ilimitadas', ok: true },
                  { label: 'Despesas recorrentes ilimitadas', ok: true },
                  { label: 'Export PDF/CSV', ok: true },
                  { label: 'Planejamento com especialistas (em breve)', ok: true },
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Check size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{f.label}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => switchMode('signup')} className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500 transition-all cursor-pointer shadow-lg shadow-amber-500/20">
                Começar agora
              </button>
            </div>
          </div>

          <p className="text-center text-slate-600 text-xs mt-8">Cancele a qualquer momento. Sem multas ou taxas escondidas.</p>
        </div>
      </div>
    </div>
  );
}
