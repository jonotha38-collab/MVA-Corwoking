import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || https://yealdaokedpfpdgvslzj.supabase.co;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || sb_publishable_P8yYUS8JUwuU16xshQcOeQ_GL8-077w;

export const supabase = createClient(supabaseUrl, supabaseKey);
