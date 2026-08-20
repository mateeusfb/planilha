// @vitest-environment node
// Precisa do Node: o jsdom não expõe crypto.subtle de forma confiável.

import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';

const CHAVE = Buffer.from(new Uint8Array(32).fill(7)).toString('base64url');
const SEGREDO_STATE = 'segredo-de-teste-com-tamanho-suficiente';

let cifrar: (t: string) => Promise<string>;
let decifrar: (t: string) => Promise<string>;
let assinarState: (uid: string) => Promise<string>;
let validarState: (s: string) => Promise<string | null>;

beforeAll(async () => {
  process.env.GOOGLE_TOKEN_ENC_KEY = CHAVE;
  process.env.GOOGLE_OAUTH_STATE_SECRET = SEGREDO_STATE;

  ({ cifrar, decifrar } = await import('@/lib/server/cripto'));
  ({ assinarState, validarState } = await import('@/lib/server/googleOauth'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('cifrar / decifrar', () => {
  it('faz o caminho de ida e volta', async () => {
    const segredo = '1//0abcdefgh-refresh-token';
    expect(await decifrar(await cifrar(segredo))).toBe(segredo);
  });

  it('gera saídas diferentes para o mesmo texto (IV aleatório)', async () => {
    const a = await cifrar('mesmo texto');
    const b = await cifrar('mesmo texto');
    expect(a).not.toBe(b);
    expect(await decifrar(a)).toBe(await decifrar(b));
  });

  it('guarda no formato versionado v1.<iv>.<dados>, sem o texto em claro', async () => {
    const guardado = await cifrar('refresh-token-em-claro');
    expect(guardado.startsWith('v1.')).toBe(true);
    expect(guardado.split('.')).toHaveLength(3);
    expect(guardado).not.toContain('refresh-token-em-claro');
  });

  it('recusa conteúdo adulterado (tag do GCM)', async () => {
    const guardado = await cifrar('token importante');
    const [v, iv, dados] = guardado.split('.');
    const trocado = dados[0] === 'A' ? 'B' : 'A';
    await expect(decifrar(`${v}.${iv}.${trocado}${dados.slice(1)}`)).rejects.toThrow();
  });

  it('recusa formato de outra versão', async () => {
    await expect(decifrar('v2.abc.def')).rejects.toThrow(/desconhecido/i);
  });
});

describe('state do OAuth', () => {
  it('devolve o mesmo usuário que assinou', async () => {
    expect(await validarState(await assinarState('uid-1'))).toBe('uid-1');
  });

  it('gera states diferentes para o mesmo usuário', async () => {
    expect(await assinarState('uid-1')).not.toBe(await assinarState('uid-1'));
  });

  it('recusa assinatura trocada', async () => {
    const [corpo] = (await assinarState('uid-1')).split('.');
    const outro = await assinarState('uid-2');
    expect(await validarState(`${corpo}.${outro.split('.')[1]}`)).toBeNull();
  });

  it('recusa payload alterado sem reassinar', async () => {
    const [, sig] = (await assinarState('uid-1')).split('.');
    const forjado = Buffer.from(
      JSON.stringify({ uid: 'invasor', exp: Date.now() + 60_000, n: 'x' }),
    ).toString('base64url');
    expect(await validarState(`${forjado}.${sig}`)).toBeNull();
  });

  it('recusa state fora do formato', async () => {
    expect(await validarState('sem-ponto')).toBeNull();
    expect(await validarState('')).toBeNull();
  });

  it('expira depois de 10 minutos', async () => {
    const state = await assinarState('uid-1');
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 11 * 60_000);
    expect(await validarState(state)).toBeNull();
  });
});
