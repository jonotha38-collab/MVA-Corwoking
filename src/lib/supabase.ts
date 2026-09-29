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
