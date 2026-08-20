/**
 * Erros da integração com o Google, traduzidos para pt-BR.
 *
 * Arquivo puro de propósito (sem 'server-only', sem fetch): é ele que os testes
 * do Vitest cobrem. As rotas só transformam o resultado daqui em resposta HTTP.
 */

export type CodigoErro =
  | 'NAO_AUTENTICADO'
  | 'PARAMETROS_INVALIDOS'
  | 'GOOGLE_NAO_CONECTADO'
  | 'GOOGLE_REVOGADO'
  | 'NAO_SOU_CONVIDADO'
  | 'EVENTO_NAO_ENCONTRADO'
  | 'SEM_PERMISSAO'
  | 'LIMITE_GOOGLE'
  | 'ERRO_GOOGLE'
  | 'ERRO_INTERNO';

/** Mensagem padrão de cada código — já no tom do app, pronta para o toast. */
export const MENSAGENS: Record<CodigoErro, string> = {
  NAO_AUTENTICADO: 'Sua sessão expirou. Entre de novo.',
  PARAMETROS_INVALIDOS: 'Alguma informação do formulário está incompleta.',
  GOOGLE_NAO_CONECTADO: 'Conecte sua conta Google para usar a agenda.',
  GOOGLE_REVOGADO: 'A conexão com o Google expirou. Reconecte sua conta.',
  NAO_SOU_CONVIDADO: 'Você não é convidado desta reunião, então não há o que responder.',
  EVENTO_NAO_ENCONTRADO: 'Esse evento não existe mais no Google Agenda.',
  SEM_PERMISSAO: 'Só o organizador pode alterar esta reunião.',
  LIMITE_GOOGLE: 'O Google está limitando as requisições. Tente de novo em alguns segundos.',
  ERRO_GOOGLE: 'O Google Agenda está instável. Tente de novo.',
  ERRO_INTERNO: 'Algo deu errado por aqui. Tente de novo.',
};

/** Status HTTP que o Folga devolve para cada código. */
export const HTTP_DO_CODIGO: Record<CodigoErro, number> = {
  NAO_AUTENTICADO: 401,
  PARAMETROS_INVALIDOS: 400,
  GOOGLE_NAO_CONECTADO: 409,
  GOOGLE_REVOGADO: 409,
  NAO_SOU_CONVIDADO: 409,
  EVENTO_NAO_ENCONTRADO: 404,
  SEM_PERMISSAO: 403,
  LIMITE_GOOGLE: 429,
  ERRO_GOOGLE: 502,
  ERRO_INTERNO: 500,
};

/** Erro de negócio da integração. É o que as libs de servidor lançam. */
export class ErroApp extends Error {
  readonly codigo: CodigoErro;
  readonly http: number;

  constructor(codigo: CodigoErro, mensagem?: string) {
    super(mensagem ?? MENSAGENS[codigo]);
    this.name = 'ErroApp';
    this.codigo = codigo;
    this.http = HTTP_DO_CODIGO[codigo];
  }
}

/** Resposta de erro crua do Google, o suficiente para traduzir. */
export interface CorpoErroGoogle {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: { reason?: string; message?: string }[];
  };
}

export interface TraducaoErro {
  codigo: CodigoErro;
  mensagem: string;
  http: number;
  /** Vale tentar de novo? Só 5xx, 429 e os 403 de limite. */
  repetir: boolean;
}

function razao(corpo: CorpoErroGoogle | null): string {
  return corpo?.error?.errors?.[0]?.reason ?? corpo?.error?.status ?? '';
}

/**
 * Traduz o par (status, corpo) do Google para o vocabulário do Folga.
 *
 * O 410 ("já foi apagado") cai em EVENTO_NAO_ENCONTRADO. Quem cancela trata o
 * 410 como sucesso idempotente antes de chegar aqui — ver a rota DELETE.
 */
export function traduzirErroGoogle(
  status: number,
  corpo: CorpoErroGoogle | null,
): TraducaoErro {
  const motivo = razao(corpo);

  const traducao = (codigo: CodigoErro, repetir = false): TraducaoErro => ({
    codigo,
    mensagem: MENSAGENS[codigo],
    http: HTTP_DO_CODIGO[codigo],
    repetir,
  });

  if (status === 401) return traducao('GOOGLE_REVOGADO');

  if (status === 403) {
    if (motivo === 'rateLimitExceeded' || motivo === 'userRateLimitExceeded') {
      return traducao('LIMITE_GOOGLE', true);
    }
    if (motivo === 'quotaExceeded') {
      return {
        ...traducao('LIMITE_GOOGLE'),
        mensagem: 'Limite diário do Google atingido. Tente amanhã.',
      };
    }
    return traducao('SEM_PERMISSAO');
  }

  if (status === 404 || status === 410) return traducao('EVENTO_NAO_ENCONTRADO');

  if (status === 429) return traducao('LIMITE_GOOGLE', true);
  if (status >= 500) return traducao('ERRO_GOOGLE', true);

  return traducao('ERRO_GOOGLE');
}
