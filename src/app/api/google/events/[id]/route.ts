import { exigirUsuario } from '@/lib/server/auth';
import { fusoDaConta } from '@/lib/server/googleContas';
import { atualizarEvento, cancelarEvento } from '@/lib/server/googleCalendar';
import { ok, respostaDeErro } from '@/lib/server/respostas';
import { ErroApp } from '@/lib/google/erros';
import { validarEntradaEvento } from '@/lib/google/mapear';
import type { EntradaEvento } from '@/lib/types';

// nodejs: a rota usa APIs do Node (node:crypto) que o runtime edge não tem.
// Desde o Next 15 handlers GET já são dinâmicos por padrão, então não há
// `dynamic = 'force-dynamic'` a declarar.
export const runtime = 'nodejs';

type Contexto = { params: Promise<{ id: string }> };

/**
 * Edita ou remarca — é a mesma operação, muda só quais campos vêm.
 * Numa ocorrência de evento recorrente, altera apenas aquela ocorrência.
 */
export async function PATCH(req: Request, { params }: Contexto) {
  try {
    const userId = await exigirUsuario(req);
    const { id } = await params;
    const entrada = (await req.json().catch(() => null)) as Partial<EntradaEvento> | null;
    if (!entrada) throw new ErroApp('PARAMETROS_INVALIDOS');

    // Valida só quando o período veio no corpo — num PATCH de título não há o
    // que conferir de horário.
    const mexeNoPeriodo = entrada.inicio || entrada.fim || entrada.data;
    if (mexeNoPeriodo) {
      if (!entrada.fuso) entrada.fuso = await fusoDaConta(userId);
      const problema = validarEntradaEvento({
        titulo: entrada.titulo ?? 'x',
        ...entrada,
      } as EntradaEvento);
      if (problema) throw new ErroApp('PARAMETROS_INVALIDOS', problema);
    }

    const evento = await atualizarEvento(userId, id, entrada);
    return ok({ evento });
  } catch (e) {
    return respostaDeErro(e);
  }
}

/** Cancela. Os convidados são avisados, a menos que `?notificar=false`. */
export async function DELETE(req: Request, { params }: Contexto) {
  try {
    const userId = await exigirUsuario(req);
    const { id } = await params;
    const avisar = new URL(req.url).searchParams.get('notificar') !== 'false';

    await cancelarEvento(userId, id, avisar);
    return ok({ ok: true });
  } catch (e) {
    return respostaDeErro(e);
  }
}
