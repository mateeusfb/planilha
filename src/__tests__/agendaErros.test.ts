import { describe, it, expect } from 'vitest';
import { ErroApp, traduzirErroGoogle } from '@/lib/google/erros';

const comRazao = (reason: string) => ({ error: { errors: [{ reason }] } });

describe('traduzirErroGoogle', () => {
  it('401 vira conexão revogada', () => {
    expect(traduzirErroGoogle(401, null).codigo).toBe('GOOGLE_REVOGADO');
  });

  it('403 de rate limit vira 429 e pede nova tentativa', () => {
    const t = traduzirErroGoogle(403, comRazao('rateLimitExceeded'));
    expect(t.codigo).toBe('LIMITE_GOOGLE');
    expect(t.http).toBe(429);
    expect(t.repetir).toBe(true);
  });

  it('403 de cota diária não pede nova tentativa', () => {
    const t = traduzirErroGoogle(403, comRazao('quotaExceeded'));
    expect(t.repetir).toBe(false);
    expect(t.mensagem).toMatch(/amanhã/i);
  });

  it('403 de não-organizador vira sem permissão', () => {
    const t = traduzirErroGoogle(403, comRazao('forbiddenForNonOrganizer'));
    expect(t.codigo).toBe('SEM_PERMISSAO');
    expect(t.http).toBe(403);
  });

  it('404 e 410 caem em evento não encontrado', () => {
    expect(traduzirErroGoogle(404, null).codigo).toBe('EVENTO_NAO_ENCONTRADO');
    expect(traduzirErroGoogle(410, comRazao('deleted')).codigo).toBe('EVENTO_NAO_ENCONTRADO');
  });

  it('429 pede nova tentativa', () => {
    expect(traduzirErroGoogle(429, null).repetir).toBe(true);
  });

  it('5xx pede nova tentativa', () => {
    expect(traduzirErroGoogle(500, null).repetir).toBe(true);
    expect(traduzirErroGoogle(503, null).codigo).toBe('ERRO_GOOGLE');
  });

  it('4xx desconhecido não repete', () => {
    expect(traduzirErroGoogle(400, null).repetir).toBe(false);
  });

  it('todas as mensagens estão em português e sem jargão', () => {
    const casos = [401, 403, 404, 429, 500].map(s => traduzirErroGoogle(s, null).mensagem);
    for (const m of casos) {
      expect(m.length).toBeGreaterThan(10);
      expect(m).not.toMatch(/error|invalid|forbidden/i);
    }
  });
});

describe('ErroApp', () => {
  it('usa a mensagem padrão do código', () => {
    const e = new ErroApp('GOOGLE_NAO_CONECTADO');
    expect(e.http).toBe(409);
    expect(e.message).toMatch(/Conecte sua conta Google/i);
  });

  it('aceita mensagem específica sem perder o status', () => {
    const e = new ErroApp('PARAMETROS_INVALIDOS', 'Escolha o dia da reunião.');
    expect(e.http).toBe(400);
    expect(e.message).toBe('Escolha o dia da reunião.');
  });
});
