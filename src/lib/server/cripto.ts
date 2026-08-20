import 'server-only';

/**
 * AES-256-GCM para os tokens do Google antes de entrarem no banco.
 *
 * O Supabase já cifra o disco, então isto não protege contra roubo de máquina.
 * Protege contra o que pode acontecer de verdade: um dump que para num backup
 * local, um print do Table Editor, ou uma policy criada por engano no futuro.
 *
 * Formato guardado: `v1.<iv>.<ciphertext+tag>`, tudo em base64url. O prefixo de
 * versão deixa a porta aberta para trocar chave ou algoritmo depois.
 *
 * ⚠️ Se GOOGLE_TOKEN_ENC_KEY mudar, os tokens salvos viram ilegíveis e é só
 * reconectar a conta Google nas Configurações. Nenhum dado é perdido.
 */

const b64url = (b: Uint8Array) => Buffer.from(b).toString('base64url');
const deB64url = (s: string) => new Uint8Array(Buffer.from(s, 'base64url'));

let chaveMemo: Promise<CryptoKey> | null = null;

function chave(): Promise<CryptoKey> {
  if (!chaveMemo) {
    const bruta = process.env.GOOGLE_TOKEN_ENC_KEY;
    if (!bruta) throw new Error('GOOGLE_TOKEN_ENC_KEY não configurada');
    const bytes = deB64url(bruta);
    if (bytes.length !== 32) {
      throw new Error('GOOGLE_TOKEN_ENC_KEY precisa ter 32 bytes em base64url');
    }
    chaveMemo = crypto.subtle.importKey(
      'raw',
      bytes as unknown as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
  }
  return chaveMemo;
}

export async function cifrar(texto: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bits, o recomendado para GCM
  const cifrado = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await chave(),
    new TextEncoder().encode(texto),
  );
  return `v1.${b64url(iv)}.${b64url(new Uint8Array(cifrado))}`;
}

export async function decifrar(guardado: string): Promise<string> {
  const [versao, iv, dados] = guardado.split('.');
  if (versao !== 'v1' || !iv || !dados) {
    throw new Error('Formato de token cifrado desconhecido');
  }
  const claro = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: deB64url(iv) },
    await chave(),
    deB64url(dados) as unknown as ArrayBuffer,
  );
  return new TextDecoder().decode(claro);
}
