import { exigirUsuario } from '@/lib/server/auth';
import { responderConvite } from '@/lib/server/googleCalendar';
import { ok, respostaDeErro } from '@/lib/server/respostas';
import { ErroApp } from '@/lib/google/erros';
import type { RespostaConvite } from '@/lib/types';

// nodejs: a rota usa APIs do Node (node:crypto) que o runtime edge não tem.
// Desde o Next 15 handlers GET já são dinâmicos por padrão, então não há
// `dynamic = 'force-dynamic'` a declarar.
export const runtime = 'nodejs';

const VALIDAS: RespostaConvite[] = ['accepted', 'declined', 'tentative'];

/** Responde a um convite. O organizador é notificado da resposta. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await exigirUsuario(req);
    const { id } = await params;

    const corpo = (await req.json().catch(() => null)) as {
      resposta?: string;
      comentario?: string;
      notificar?: boolean;
    } | null;

    if (!corpo || !VALIDAS.includes(corpo.resposta as RespostaConvite)) {
      throw new ErroApp('PARAMETROS_INVALIDOS', 'Resposta inválida.');
    }

    const evento = await responderConvite(
      userId,
      id,
      corpo.resposta as RespostaConvite,
      corpo.comentario,
      corpo.notificar !== false,
    );
    return ok({ evento });
  } catch (e) {
    return respostaDeErro(e);
  }
}
