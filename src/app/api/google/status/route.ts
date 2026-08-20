import { exigirUsuario } from '@/lib/server/auth';
import { lerConta } from '@/lib/server/googleContas';
import { ok, respostaDeErro } from '@/lib/server/respostas';
import type { StatusConexaoGoogle } from '@/lib/types';

// nodejs: a rota usa APIs do Node (node:crypto) que o runtime edge não tem.
// Desde o Next 15 handlers GET já são dinâmicos por padrão, então não há
// `dynamic = 'force-dynamic'` a declarar.
export const runtime = 'nodejs';

/**
 * Status da conexão. É por aqui que o cliente descobre se há conta conectada —
 * a tabela `google_accounts` é invisível para a anon key de propósito.
 * Nunca devolve token nenhum.
 */
export async function GET(req: Request) {
  try {
    const userId = await exigirUsuario(req);
    const conta = await lerConta(userId);

    if (!conta) return ok<StatusConexaoGoogle>({ conectado: false });

    return ok<StatusConexaoGoogle>({
      conectado: conta.status === 'ativa',
      email: conta.email,
      conectadaEm: conta.conectada_em,
      status: conta.status,
      fuso: conta.fuso,
    });
  } catch (e) {
    return respostaDeErro(e);
  }
}
