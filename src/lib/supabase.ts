import { createClient } from '@supabase/supabase-js';

// URL do projeto e chave "publishable": são públicas e podem ficar no site.
// No Vercel (ou num arquivo .env local) você pode definir:
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_PUBLISHABLE_KEY
// Se não definir, usa os valores abaixo.
const supabaseUrl: string =
  import.meta.env.VITE_SUPABASE_URL || 'https://yealdaokedpfpdgvslzj.supabase.co';

const supabaseKey: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_P8yYUS8JUwuU16xshQcOeQ_GL8-077w';

export const supabase = createClient(supabaseUrl, supabaseKey);

/** Comprime a foto e envia para o Storage. Retorna o link público. */
export async function uploadSpacePhoto(file: File, userId: string): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Envie apenas imagens.');
  const blob = await new Promise<Blob>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => (b ? resolve(b) : reject(new Error('Falha ao processar a imagem.'))), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem.')); };
    img.src = url;
  });
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from('space-photos').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) throw new Error('Não foi possível enviar a foto. Tente novamente.');
  return supabase.storage.from('space-photos').getPublicUrl(path).data.publicUrl;
}
