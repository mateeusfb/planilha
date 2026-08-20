import 'server-only';
import { supabaseAdmin } from './supabaseAdmin';
import { ErroApp } from '@/lib/google/erros';

/**
 * A sessão do Folga vive no localStorage do navegador (o app não usa cookies
 * nem @supabase/ssr), então uma rota de API não consegue lê-la sozinha. O
 * cliente manda o access_token do Supabase no header Authorization e a
 * validação real acontece aqui — assinatura e expiração conferidas pelo
 * próprio Supabase.
 *
 * Ver `src/lib/apiFolga.ts`, que é quem monta esse header.
 */
export async function usuarioDaRequisicao(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const { data, error } = await supabaseAdmin().auth.getUser(header.slice(7));
  if (error || !data.user) return null;
  return data.user.id;
}

/** Versão que já lança o 401 — o padrão nas rotas. */
export async function exigirUsuario(req: Request): Promise<string> {
  const userId = await usuarioDaRequisicao(req);
  if (!userId) throw new ErroApp('NAO_AUTENTICADO');
  return userId;
}
