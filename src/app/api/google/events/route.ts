import { exigirUsuario } from '@/lib/server/auth';
import { fusoDaConta } from '@/lib/server/googleContas';
import { criarEvento, listarEventos } from '@/lib/server/googleCalendar';
import { ok, respostaDeErro } from '@/lib/server/respostas';
import { ErroApp } from '@/lib/google/erros';
import { janelaDeIntervalo, janelaDoMes } from '@/lib/google/tempo';
import { validarEntradaEvento } from '@/lib/google/mapear';
import type { EntradaEvento } from '@/lib/types';

// nodejs: a rota usa APIs do Node (node:crypto) que o runtime edge não tem.
// Desde o Next 15 handlers GET já são dinâmicos por padrão, então não há
// `dynamic = 'force-dynamic'` a declarar.
export const runtime = 'nodejs';

const MES_RE = /^\d{4}-\d{2}$/;
const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DIAS = 400;

/**
 * Eventos de uma janela.
 *   ?mes=2026-08                     → o mês inteiro
 *   ?inicio=2026-08-01&fim=2026-08-31 → intervalo, com `fim` inclusivo
 */
export async function GET(req: Request) {
  try {
    const userId = await exigirUsuario(req);
    const params = new URL(req.url).searchParams;
    const fuso = params.get('fuso') || (await fusoDaConta(userId));

    const mes = params.get('mes');
    const inicio = params.get('inicio');
    const fim = params.get('fim');

    let janela;
    if (mes) {
      if (!MES_RE.test(mes)) throw new ErroApp('PARAMETROS_INVALIDOS', 'Mês inválido.');
      janela = janelaDoMes(mes, fuso);
    } else if (inicio && fim) {
      if (!DIA_RE.test(inicio) || !DIA_RE.test(fim)) {
        throw new ErroApp('PARAMETROS_INVALIDOS', 'Datas inválidas.');
      }
      if (fim < inicio) throw new ErroApp('PARAMETROS_INVALIDOS', 'O fim não pode ser antes do início.');
      const dias = (Date.parse(`${fim}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86_400_000;
      if (dias > MAX_DIAS) throw new ErroApp('PARAMETROS_INVALIDOS', 'Escolha um período menor.');
      janela = janelaDeIntervalo(inicio, fim, fuso);
    } else {
      throw new ErroApp('PARAMETROS_INVALIDOS', 'Informe o mês ou o período.');
    }

    const eventos = await listarEventos(userId, janela.timeMin, janela.timeMax);
    return ok({ eventos, fuso });
  } catch (e) {
    return respostaDeErro(e);
  }
}

/** Cria a reunião. Com `notificarConvidados`, o Google dispara os convites. */
export async function POST(req: Request) {
  try {
    const userId = await exigirUsuario(req);
    const entrada = (await req.json().catch(() => null)) as EntradaEvento | null;
    if (!entrada) throw new ErroApp('PARAMETROS_INVALIDOS');

    if (!entrada.fuso) entrada.fuso = await fusoDaConta(userId);

    const problema = validarEntradaEvento(entrada);
    if (problema) throw new ErroApp('PARAMETROS_INVALIDOS', problema);

    const evento = await criarEvento(userId, entrada);
    return ok({ evento }, 201);
  } catch (e) {
    return respostaDeErro(e);
  }
}
