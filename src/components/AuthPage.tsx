'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Wallet, BarChart3, Users, Brain, Eye, EyeOff } from 'lucide-react';

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

  // Check if we're in password reset mode (from email link)
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

    // Validate email format (skip for admin preview login)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <Wallet size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Finanças Família</h1>
          <p className="text-slate-400">Controle inteligente de gastos familiares</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6 text-center">{titles[mode]}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
              </div>
            )}

            {mode !== 'reset' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" required autoComplete="email"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
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
                    className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer p-1"
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
                  className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 accent-blue-600 cursor-pointer"
                />
                <span className="text-xs text-slate-400 leading-relaxed">
                  Ao criar sua conta, você concorda com nossa{' '}
                  <a href="/privacidade" target="_blank" className="text-blue-400 underline hover:text-blue-300">política de privacidade</a>.
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
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
              {loading ? 'Aguarde...' : buttons[mode]}
            </button>
          </form>

          {/* Links */}
          <div className="mt-5 space-y-2 text-center">
            {mode === 'login' && (
              <>
                <button onClick={() => switchMode('forgot')}
                  className="block w-full text-sm text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                  Esqueci minha senha
                </button>
                <p className="text-slate-400 text-sm">
                  Não tem uma conta?{' '}
                  <button onClick={() => switchMode('signup')}
                    className="text-blue-400 font-semibold hover:text-blue-300 transition-colors cursor-pointer">
                    Criar conta grátis
                  </button>
                </p>
              </>
            )}
            {mode === 'signup' && (
              <p className="text-slate-400 text-sm">
                Já tem uma conta?{' '}
                <button onClick={() => switchMode('login')}
                  className="text-blue-400 font-semibold hover:text-blue-300 transition-colors cursor-pointer">
                  Fazer login
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <button onClick={() => switchMode('login')}
                className="text-blue-400 font-semibold text-sm hover:text-blue-300 transition-colors cursor-pointer">
                Voltar ao login
              </button>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-xl p-4">
            <div className="mb-2 flex justify-center text-blue-400"><BarChart3 size={24} /></div>
            <div className="text-xs text-slate-400 font-medium">Dashboard completo</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-xl p-4">
            <div className="mb-2 flex justify-center text-blue-400"><Users size={24} /></div>
            <div className="text-xs text-slate-400 font-medium">Controle familiar</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-xl p-4">
            <div className="mb-2 flex justify-center text-blue-400"><Brain size={24} /></div>
            <div className="text-xs text-slate-400 font-medium">Dicas inteligentes</div>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          100% gratuito — seus dados ficam seguros na nuvem
        </p>
      </div>
    </div>
  );
}
