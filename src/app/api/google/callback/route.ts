import { NextResponse } from 'next/server';
import { contaDoToken, trocarCodigo, validarState } from '@/lib/server/googleOauth';
import { salvarConta } from '@/lib/server/googleContas';

// nodejs: a rota usa APIs do Node (node:crypto) que o runtime edge não tem.
// Desde o Next 15 handlers GET já são dinâmicos por padrão, então não há
// `dynamic = 'force-dynamic'` a declarar.
export const runtime = 'nodejs';

/**
 * Volta do consentimento do Google.
 *
 * Esta rota é uma navegação do navegador, não um fetch: não tem header de
 * autenticação e por isso sempre responde 302 para a tela de Configurações, com
 * o resultado no query param. Quem diz de quem é a conexão é o `state`
 * assinado — ver `src/lib/server/googleOauth.ts`.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const paraConfiguracoes = (params: string) =>
    NextResponse.redirect(new URL(`/configuracoes?${params}`, url.origin));

  const erroDoGoogle = url.searchParams.get('error');
  if (erroDoGoogle) {
    return paraConfiguracoes(
      erroDoGoogle === 'access_denied' ? 'google=cancelado' : 'google=erro&motivo=consentimento',
    );
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return paraConfiguracoes('google=erro&motivo=state');

  const userId = await validarState(state);
  if (!userId) return paraConfiguracoes('google=erro&motivo=state');

  try {
    const tokens = await trocarCodigo(code);
    const conta = await contaDoToken(tokens.access_token);
    await salvarConta(userId, tokens, conta);
    return paraConfiguracoes('google=conectado');
  } catch (e) {
    console.error('[google] callback falhou:', e instanceof Error ? e.message : e);
    return paraConfiguracoes('google=erro&motivo=token');
  }
}
