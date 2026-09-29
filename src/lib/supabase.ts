import { createClient } from '@supabase/supabase-js';

// Valores públicos (URL do projeto e chave "publishable"): podem ficar no front-end.
// No Vercel você pode sobrescrever com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://yealdaokedpfpdgvslzj.supabase.co';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_P8yYUS8JUwuU16xshQcOeQ_GL8-077w';

export const supabase = createClient(supabaseUrl, supabaseKey);
