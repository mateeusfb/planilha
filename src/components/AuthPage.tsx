'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function AuthPage({ forceMode }: { forceMode?: 'reset' }) {
  const { signIn, clearRecovery } = useAuth();
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>(forceMode || 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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

    if (mode !== 'reset' && !email.includes('@')) {
      setError('Digite um email válido.'); setLoading(false); return;
    }

    if (mode === 'forgot') {
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
    if (msg.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    if (msg.includes('User not found')) return 'Nenhuma conta encontrada com este email.';
    return msg;
  }

  const titles = {
    login: 'Entrar',
    forgot: 'Recuperar senha',
    reset: 'Nova senha',
  };

  const buttons = {
    login: 'Entrar',
    forgot: 'Enviar email de recuperação',
    reset: 'Salvar nova senha',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-orange-500/8 via-orange-400/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-3 mb-10">
        <img src="/Ícone.svg" alt="Folga ícone" className="w-10 h-10 rounded-xl" />
        <img src="/Folga.svg" alt="Folga" className="h-7 object-contain brightness-0 invert" />
      </div>

      {/* Auth form card */}
      <div className="relative z-10 w-full max-w-sm mx-auto px-4">
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/20">
          <h2 className="text-xl font-bold text-white mb-6 text-center">{titles[mode]}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode !== 'reset' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" required autoComplete="email"
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all" />
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
                    className="w-full px-4 py-3 pr-12 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
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
              className="w-full py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20">
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
              <button onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                className="block w-full text-sm text-slate-600 hover:text-slate-300 transition-colors cursor-pointer">
                Esqueci minha senha
              </button>
            )}
            {mode === 'forgot' && (
              <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className="text-orange-400 font-semibold text-sm hover:text-orange-300 transition-colors cursor-pointer">
                Voltar ao login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
