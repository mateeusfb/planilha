'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (mode === 'signup') {
      if (!name.trim()) { setError('Digite seu nome.'); setLoading(false); return; }
      if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); setLoading(false); return; }
      const result = await signUp(email, password, name);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Conta criada! Verifique seu email para confirmar o cadastro.');
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
    if (msg.includes('already registered')) return 'Este email ja esta cadastrado. Tente fazer login.';
    return msg;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <span className="text-2xl">💰</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Financas Familia</h1>
          <p className="text-slate-400">Controle inteligente de gastos familiares</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6 text-center">
            {mode === 'login' ? 'Entrar na sua conta' : 'Criar sua conta'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={6}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
            </div>

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
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            {mode === 'login' ? (
              <p className="text-slate-400 text-sm">
                Nao tem uma conta?{' '}
                <button onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                  className="text-blue-400 font-semibold hover:text-blue-300 transition-colors cursor-pointer">
                  Criar conta gratis
                </button>
              </p>
            ) : (
              <p className="text-slate-400 text-sm">
                Ja tem uma conta?{' '}
                <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                  className="text-blue-400 font-semibold hover:text-blue-300 transition-colors cursor-pointer">
                  Fazer login
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-xl p-4">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-xs text-slate-400 font-medium">Dashboard completo</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-xl p-4">
            <div className="text-2xl mb-2">👨‍👩‍👧‍👦</div>
            <div className="text-xs text-slate-400 font-medium">Controle familiar</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/5 rounded-xl p-4">
            <div className="text-2xl mb-2">🧠</div>
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
