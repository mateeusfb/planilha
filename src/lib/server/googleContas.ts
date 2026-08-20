import 'server-only';
import { supabaseAdmin } from './supabaseAdmin';
import { cifrar, decifrar } from './cripto';
import { ErroOAuth, renovarToken, revogar } from './googleOauth';
import { ErroApp } from '@/lib/google/erros';
import { FUSO_PADRAO } from '@/lib/google/tempo';
import type { TokensGoogle } from '@/lib/google/tipos';

/**
 * A única porta de entrada da tabela `google_accounts`.
 *
 * A tabela tem RLS ligada e zero policies de propósito: nem a anon key nem o
 * usuário logado enxergam nada dela. Todo acesso passa por aqui, com a
 * service_role, dentro das rotas de API.
 */

const TABELA = 'google_accounts';
/** Renova o access token 1 min antes de expirar, para não correr risco na borda. */
const MARGEM_MS = 60_000;

export interface ContaGoogle {
  user_id: string;
  google_sub: string;
  email: string;
  refresh_token_cifrado: string;
  access_token_cifrado: string | null;
  access_token_expira_em: string | null;
  escopos: string;
  calendario_id: string;
  fuso: string;
  status: 'ativa' | 'revogada';
  conectada_em: string;
}

export async function lerConta(userId: string): Promise<ContaGoogle | null> {
  const { data, error } = await supabaseAdmin()
    .from(TABELA)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[google] erro ao ler a conta:', error.message);
    throw new ErroApp('ERRO_INTERNO');
  }
  return (data as ContaGoogle) ?? null;
}

/**
 * Grava a conexão. Se o Google não devolveu refresh token (acontece quando o
 * usuário já tinha autorizado antes), preserva o que já estava salvo em vez de
 * apagar — sem ele a conexão morre na primeira renovação.
 */
export async function salvarConta(
  userId: string,
  tokens: TokensGoogle,
  conta: { sub: string; email: string },
): Promise<void> {
  const anterior = await lerConta(userId);
  const refresh = tokens.refresh_token
    ? await cifrar(tokens.refresh_token)
    : anterior?.refresh_token_cifrado;

  if (!refresh) throw new ErroApp('ERRO_INTERNO', 'O Google não devolveu a autorização de longo prazo.');

  const { error } = await supabaseAdmin().from(TABELA).upsert(
    {
      user_id: userId,
      google_sub: conta.sub,
      email: conta.email,
      refresh_token_cifrado: refresh,
      access_token_cifrado: await cifrar(tokens.access_token),
      access_token_expira_em: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      escopos: tokens.scope ?? '',
      fuso: anterior?.fuso ?? FUSO_PADRAO,
      status: 'ativa',
      atualizada_em: new Date().toISOString(),
      ...(anterior ? {} : { conectada_em: new Date().toISOString() }),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    console.error('[google] erro ao salvar a conta:', error.message);
    throw new ErroApp('ERRO_INTERNO');
  }
}

async function salvarAccessToken(userId: string, tokens: TokensGoogle): Promise<void> {
  const { error } = await supabaseAdmin()
    .from(TABELA)
    .update({
      access_token_cifrado: await cifrar(tokens.access_token),
      access_token_expira_em: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      atualizada_em: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) console.error('[google] erro ao guardar o access token:', error.message);
}

/**
 * Marca a conexão como revogada sem apagar a linha: guardar o e-mail deixa a
 * UI dizer "a conexão com fulano@gmail.com expirou" em vez de um genérico
 * "não conectado".
 */
export async function marcarRevogada(userId: string): Promise<void> {
  await supabaseAdmin()
    .from(TABELA)
    .update({
      status: 'revogada',
      access_token_cifrado: null,
      access_token_expira_em: null,
      atualizada_em: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

export async function apagarConta(userId: string): Promise<void> {
  const conta = await lerConta(userId);
  if (conta?.refresh_token_cifrado) {
    try {
      await revogar(await decifrar(conta.refresh_token_cifrado));
    } catch {
      // Chave trocada ou token já revogado: seguimos e apagamos a linha.
    }
  }
  await supabaseAdmin().from(TABELA).delete().eq('user_id', userId);
}

/**
 * Access token válido, renovando sob demanda.
 *
 * A fonte da verdade é o banco, não um cache de módulo: em serverless cada
 * instância teria o seu, e um token revogado ficaria "válido" numa delas.
 * Duas requisições paralelas podem renovar ao mesmo tempo — o Google não
 * rotaciona o refresh token no fluxo web, então o pior caso é uma renovação
 * desperdiçada. Não vale um lock.
 */
export async function accessTokenValido(userId: string): Promise<string> {
  const conta = await lerConta(userId);
  if (!conta) throw new ErroApp('GOOGLE_NAO_CONECTADO');
  if (conta.status === 'revogada') throw new ErroApp('GOOGLE_REVOGADO');

  if (
    conta.access_token_cifrado &&
    conta.access_token_expira_em &&
    new Date(conta.access_token_expira_em).getTime() - Date.now() > MARGEM_MS
  ) {
    return decifrar(conta.access_token_cifrado);
  }

  const refresh = await decifrar(conta.refresh_token_cifrado);
  try {
    const novos = await renovarToken(refresh);
    await salvarAccessToken(userId, novos);
    return novos.access_token;
  } catch (e) {
    // invalid_grant = acesso revogado, senha trocada, app em modo Teste passando
    // dos 7 dias, ou token parado por 6 meses. Em todos, é reconectar.
    if (e instanceof ErroOAuth && e.error === 'invalid_grant') {
      await marcarRevogada(userId);
      throw new ErroApp('GOOGLE_REVOGADO');
    }
    console.error('[google] falha ao renovar o token:', e instanceof Error ? e.message : e);
    throw new ErroApp('ERRO_GOOGLE');
  }
}

export async function fusoDaConta(userId: string): Promise<string> {
  const conta = await lerConta(userId);
  return conta?.fuso || FUSO_PADRAO;
}
