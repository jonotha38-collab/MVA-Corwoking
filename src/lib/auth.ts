import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { UserAccount } from '../types';

export const isAdmin = (u: UserAccount | null) => !!u?.isAdmin;

export const avatarFor = (name: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0a192f`;

type ProfileRow = {
  id: string; name: string; email: string; avatar: string; account_type: 'coworking_owner' | 'client';
  coworking_brand_name: string | null; provider: string; is_admin: boolean;
};

export function profileToUser(row: ProfileRow | null, auth: User): UserAccount {
  const meta = (auth.user_metadata || {}) as Record<string, string>;
  const name = row?.name || meta.name || meta.full_name || (auth.email || '').split('@')[0];
  return {
    id: auth.id,
    name,
    email: row?.email || auth.email || '',
    avatar: row?.avatar || meta.avatar_url || meta.picture || avatarFor(name),
    accountType: row?.account_type || 'client',
    coworkingBrandName: row?.coworking_brand_name || undefined,
    provider: (row?.provider || auth.app_metadata?.provider) === 'google' ? 'google' : 'email',
    isAdmin: !!row?.is_admin,
  };
}

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (m.includes('already registered')) return 'Este e-mail já tem conta. Entre para continuar.';
  if (m.includes('password should be')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão com o servidor. Verifique sua internet.';
  return 'Não foi possível concluir. Tente novamente.';
}

export async function signUpEmail(p: { name: string; email: string; password: string; accountType: UserAccount['accountType']; brand?: string; lgpdConsentAt?: string }) {
  const { data, error } = await supabase.auth.signUp({
    email: p.email.trim(),
    password: p.password,
    options: { data: { name: p.name.trim(), account_type: p.accountType, brand: p.brand?.trim() || '', lgpd_consent_at: p.lgpdConsentAt || new Date().toISOString() }, emailRedirectTo: window.location.origin },
  });
  if (error) throw new Error(friendly(error.message));
  // Com confirmação de e-mail ativa, e-mail repetido volta sem erro e sem identidades.
  if (data.user && data.user.identities && data.user.identities.length === 0) throw new Error('Este e-mail já tem conta. Entre para continuar.');
  return { needsConfirmation: !data.session };
}

export async function signInEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(friendly(error.message));
}

export async function signInGoogle(accountType: UserAccount['accountType']) {
  try { localStorage.setItem('mva:pending-type', accountType); } catch { /* ignore */ }
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  if (error) throw new Error('Login com Google indisponível. Verifique a configuração no Supabase.');
}

export async function signOut() {
  await supabase.auth.signOut();
}
