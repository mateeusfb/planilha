'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return { error: error.message };

    // If user was created and auto-confirmed, migrate orphan data
    if (data.user) {
      await migrateOrphanData(data.user.id);
    }

    return {};
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Migrate existing data (user_id = null) to the first user who signs up
async function migrateOrphanData(userId: string) {
  try {
    await supabase.rpc('migrate_orphan_data', { target_user_id: userId });
  } catch {
    // If RPC doesn't exist, do it manually via REST
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
