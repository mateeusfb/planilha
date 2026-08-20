import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ErroApp } from '@/lib/google/erros';

/**
 * Client do Supabase com a service_role — ignora RLS por completo.
 *
 * Existe por um motivo só: a tabela `google_accounts` tem RLS ligada e ZERO
 * policies (ver a migration 20260819), então nem a anon key nem o usuário
 * logado conseguem tocá-la. Só este client, dentro das rotas em
 * `src/app/api/**`, lê e escreve os tokens do Google.
 *
 * O `import 'server-only'` no topo é a trava: se alguém importar este arquivo
 * de um componente 'use client', o build quebra em vez de vazar a chave no
 * bundle do navegador.
 *
 * É criado na primeira chamada, não na importação: assim o app continua
 * buildando e rodando sem as variáveis do Google — só a Agenda fica fora do ar,
 * com um erro claro em vez de derrubar o build inteiro.
 */
let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !chave) {
      throw new ErroApp('ERRO_INTERNO', 'A integração com o Google não está configurada no servidor.');
    }
    client = createClient(url, chave, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
