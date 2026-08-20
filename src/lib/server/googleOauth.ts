import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import type { TokensGoogle } from '@/lib/google/tipos';
import { ErroApp } from '@/lib/google/erros';

/**
 * OAuth 2.0 do Google, em `fetch` puro.
 *
 * Escopos: `calendar.events` cobre tudo do escopo atual (listar, criar com
 * convidados, gerar Meet, editar, cancelar e responder convite) no calendário
 * primário. `openid email` é só para saber qual conta foi conectada e mostrar
 * na tela. Nada de `calendar` ou `calendar.readonly`: seriam permissões maiores
 * sem ganho nenhum.
 */
export const ESCOPOS = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

const AUTORIZACAO = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = 'https://oauth2.googleapis.com/token';
const REVOGACAO = 'https://oauth2.googleapis.com/revoke';
const USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo';

const VALIDADE_STATE_MS = 10 * 60_000;

function config() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new ErroApp('ERRO_INTERNO', 'A integração com o Google não está configurada no servidor.');
  }
  return { clientId, clientSecret, redirectUri };
}

// ── state assinado ──────────────────────────────────────────────────────────
// O callback do Google chega como navegação do navegador: sem header, sem
// sessão. Quem carrega "de quem é essa conexão" na ida e na volta é o `state`,
// assinado com HMAC para ninguém conseguir forjar o id de outra pessoa. Isso
// também é a proteção de CSRF do fluxo.

const b64url = (b: Uint8Array) => Buffer.from(b).toString('base64url');

async function chaveState(): Promise<CryptoKey> {
  const segredo = process.env.GOOGLE_OAUTH_STATE_SECRET;
  if (!segredo) throw new ErroApp('ERRO_INTERNO', 'A integração com o Google não está configurada no servidor.');
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function assinar(corpo: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await chaveState(), new TextEncoder().encode(corpo));
  return b64url(new Uint8Array(sig));
}

export async function assinarState(userId: string): Promise<string> {
  const corpo = b64url(
    new TextEncoder().encode(
      JSON.stringify({ uid: userId, exp: Date.now() + VALIDADE_STATE_MS, n: crypto.randomUUID() }),
    ),
  );
  return `${corpo}.${await assinar(corpo)}`;
}

/** Devolve o user_id se o state for autêntico e estiver no prazo; senão null. */
export async function validarState(state: string): Promise<string | null> {
  const [corpo, sig] = state.split('.');
  if (!corpo || !sig) return null;

  const esperado = await assinar(corpo);
  if (sig.length !== esperado.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(esperado))) return null;

  try {
    const { uid, exp } = JSON.parse(Buffer.from(corpo, 'base64url').toString());
    if (typeof uid !== 'string' || typeof exp !== 'number' || Date.now() > exp) return null;
    return uid;
  } catch {
    return null;
  }
}

// ── fluxo ───────────────────────────────────────────────────────────────────

export function urlDeAutorizacao(state: string): string {
  const { clientId, redirectUri } = config();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: ESCOPOS,
    // Sem access_type=offline NÃO vem refresh token.
    access_type: 'offline',
    // Sem prompt=consent, uma reconexão volta só com access token e a conexão
    // nasceria quebrada.
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${AUTORIZACAO}?${params}`;
}

/** Erro cru do endpoint de token — o `error` é o que distingue invalid_grant. */
export class ErroOAuth extends Error {
  readonly error: string;
  constructor(error: string, descricao?: string) {
    super(descricao ? `${error}: ${descricao}` : error);
    this.name = 'ErroOAuth';
    this.error = error;
  }
}

async function pedirToken(corpo: Record<string, string>): Promise<TokensGoogle> {
  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(corpo),
    signal: AbortSignal.timeout(10_000),
  });
  const dados = await res.json().catch(() => null);
  if (!res.ok) {
    // Nunca logar o corpo inteiro: ele carrega tokens.
    throw new ErroOAuth(dados?.error ?? `http_${res.status}`, dados?.error_description);
  }
  return dados as TokensGoogle;
}

export async function trocarCodigo(code: string): Promise<TokensGoogle> {
  const { clientId, clientSecret, redirectUri } = config();
  return pedirToken({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
}

export async function renovarToken(refreshToken: string): Promise<TokensGoogle> {
  const { clientId, clientSecret } = config();
  return pedirToken({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  });
}

export async function revogar(token: string): Promise<void> {
  await fetch(`${REVOGACAO}?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {
    // Best-effort: se o Google já tinha revogado, seguimos e apagamos a linha.
  });
}

/** Quem é a conta que acabou de autorizar. */
export async function contaDoToken(accessToken: string): Promise<{ sub: string; email: string }> {
  const res = await fetch(USERINFO, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new ErroApp('ERRO_GOOGLE');
  const dados = await res.json();
  return { sub: String(dados.sub ?? ''), email: String(dados.email ?? '') };
}
