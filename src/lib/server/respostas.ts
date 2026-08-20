import 'server-only';
import { NextResponse } from 'next/server';
import { ErroApp, MENSAGENS, type CodigoErro } from '@/lib/google/erros';

/**
 * Envelope único das rotas de API. Sucesso devolve os dados direto; erro
 * devolve `{ erro: { codigo, mensagem } }` com a mensagem já em pt-BR, pronta
 * para virar toast no cliente sem tradução no meio do caminho.
 */

export function ok<T>(dados: T, status = 200) {
  return NextResponse.json(dados, { status });
}

export function erro(codigo: CodigoErro, mensagem?: string, status?: number) {
  const e = new ErroApp(codigo, mensagem);
  return NextResponse.json(
    { erro: { codigo, mensagem: e.message } },
    { status: status ?? e.http },
  );
}

/**
 * Rede de segurança do `catch` de toda rota: ErroApp vira a resposta certa,
 * qualquer outra coisa vira 500 genérico — e só o servidor vê o detalhe.
 */
export function respostaDeErro(e: unknown) {
  if (e instanceof ErroApp) {
    return NextResponse.json(
      { erro: { codigo: e.codigo, mensagem: e.message } },
      { status: e.http },
    );
  }
  console.error('[api] erro não tratado:', e instanceof Error ? e.message : e);
  return NextResponse.json(
    { erro: { codigo: 'ERRO_INTERNO', mensagem: MENSAGENS.ERRO_INTERNO } },
    { status: 500 },
  );
}
