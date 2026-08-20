import { exigirUsuario } from '@/lib/server/auth';
import { apagarConta } from '@/lib/server/googleContas';
import { ok, respostaDeErro } from '@/lib/server/respostas';

// nodejs: a rota usa APIs do Node (node:crypto) que o runtime edge não tem.
// Desde o Next 15 handlers GET já são dinâmicos por padrão, então não há
// `dynamic = 'force-dynamic'` a declarar.
export const runtime = 'nodejs';

/** Revoga o acesso no Google e apaga a conexão daqui. */
export async function POST(req: Request) {
  try {
    const userId = await exigirUsuario(req);
    await apagarConta(userId);
    return ok({ ok: true });
  } catch (e) {
    return respostaDeErro(e);
  }
}
