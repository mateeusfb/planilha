import { supabase } from './supabase';

const MAX_SIZE = 200;
const QUALITY = 0.8;

/**
 * Redimensiona e comprime uma imagem via canvas,
 * faz upload ao Supabase Storage e retorna a URL pública.
 */
export async function uploadAvatar(file: File, userId: string, memberId: string): Promise<string> {
  const compressed = await compressImage(file, MAX_SIZE, QUALITY);
  const path = `${userId}/${memberId}.webp`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, compressed, {
      contentType: 'image/webp',
      upsert: true,
    });

  if (error) throw new Error('Erro ao fazer upload da foto: ' + error.message);

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Adiciona timestamp para cache busting
  return `${data.publicUrl}?t=${Date.now()}`;
}

/**
 * Remove o avatar do Storage.
 */
export async function deleteAvatar(userId: string, memberId: string): Promise<void> {
  await supabase.storage.from('avatars').remove([`${userId}/${memberId}.webp`]);
}

/**
 * Redimensiona imagem para maxSize x maxSize e comprime como WebP.
 */
function compressImage(file: File, maxSize: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > height) {
        if (width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize; }
      } else {
        if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize; }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Falha ao comprimir imagem'));
        },
        'image/webp',
        quality,
      );
    };
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = URL.createObjectURL(file);
  });
}
