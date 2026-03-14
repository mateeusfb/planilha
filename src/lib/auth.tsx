'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isRecovery: boolean;
  clearRecovery: () => void;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function clearRecovery() {
    setIsRecovery(false);
  }

  async function signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return { error: error.message };

    if (data.user) {
      await migrateOrphanData(data.user.id);
    }

    return {};
  }

  async function signIn(email: string, password: string) {
    // Admin preview login (only on non-production environments)
    const isPreview = process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production';
    if (isPreview && email === 'admin' && password === 'admin') {
      setUser({
        id: 'preview-admin',
        email: 'admin@preview.local',
        user_metadata: { name: 'Admin Preview' },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as User);
      return {};
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, isRecovery, clearRecovery, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

async function migrateOrphanData(userId: string) {
  try {
    await supabase.rpc('migrate_orphan_data', { target_user_id: userId });
  } catch {
    await supabase.from('members').update({ user_id: userId }).is('user_id', null);
    await supabase.from('expenses').update({ user_id: userId }).is('user_id', null);
    await supabase.from('settings').update({ user_id: userId }).is('user_id', null);
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
