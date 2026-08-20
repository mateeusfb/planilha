import { exigirUsuario } from '@/lib/server/auth';
import { assinarState, urlDeAutorizacao } from '@/lib/server/googleOauth';
import { ok, respostaDeErro } from '@/lib/server/respostas';

// nodejs: a rota usa APIs do Node (node:crypto) que o runtime edge não tem.
// Desde o Next 15 handlers GET já são dinâmicos por padrão, então não há
// `dynamic = 'force-dynamic'` a declarar.
export const runtime = 'nodejs';

/**
 * Começa a conexão com o Google.
 *
 * Devolve a URL em vez de responder 302: esta chamada é um `fetch` com header
 * de autenticação, e um redirect aí dentro seria seguido pelo fetch, não pela
 * aba do navegador. Quem navega é o cliente.
 */
export async function GET(req: Request) {
  try {
    const userId = await exigirUsuario(req);
    const state = await assinarState(userId);
    return ok({ urlAutorizacao: urlDeAutorizacao(state) });
  } catch (e) {
    return respostaDeErro(e);
  }
}
