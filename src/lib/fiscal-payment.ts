import { supabase } from './supabase';
export { FISCAL_PLANS, HEADQUARTERS, getPlan, quotePlan, validCnpj, validateCompany } from '../../supabase/functions/_shared/fiscal-plans';
export type { FiscalPlanId, FiscalPlan, FiscalCompanyInput } from '../../supabase/functions/_shared/fiscal-plans';
export { canIssueCertificate } from './fiscal-eligibility';
export interface PaymentOrder { id: string; status: 'pending' | 'paid' | 'refunded' | 'disputed' | 'canceled'; amount: number; currency: string; plan_id: string; contract_id: string | null; livemode: boolean; transfer: boolean; }
export interface PaymentSession { clientSecret: string; order: PaymentOrder; }
export const paymentConfigured = /^pk_(test|live)_/.test(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
export async function callPayment<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = 'Não foi possível concluir esta etapa. Tente novamente.';
    if (error.context instanceof Response) { try { const result = await error.context.json(); if (typeof result.error === 'string') message = result.error; } catch { /* transport failure */ } }
    throw new Error(message);
  }
  if (!data || data.error) throw new Error(data?.error || 'Resposta inválida do pagamento.');
  return data as T;
}
export function rememberOrder(userId: string, orderId: string | null) { try { if (orderId) localStorage.setItem(`mva-fiscal-order:${userId}`, orderId); else localStorage.removeItem(`mva-fiscal-order:${userId}`); } catch { /* session remains usable */ } }
export function restoreOrder(userId: string) { try { return localStorage.getItem(`mva-fiscal-order:${userId}`); } catch { return null; } }
export const money = (cents: number, language = 'pt') => new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : language === 'es' ? 'es' : 'en', { style: 'currency', currency: 'BRL' }).format(cents / 100);
