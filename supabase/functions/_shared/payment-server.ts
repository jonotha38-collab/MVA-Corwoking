import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import Stripe from 'npm:stripe@18.5.0';
export const env = (name: string) => { const value = Deno.env.get(name); if (!value) throw new Error(`Missing server configuration: ${name}`); return value; };
export const admin = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
export const stripe = () => new Stripe(env('STRIPE_SECRET_KEY'), { httpClient: Stripe.createFetchHttpClient() });
export function headers(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowed = env('PAYMENT_ALLOWED_ORIGINS').split(',').map(s => s.trim());
  if (origin && !allowed.includes(origin)) throw new Error('Origin not allowed');
  return { 'Access-Control-Allow-Origin': origin || allowed[0], 'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin', 'Cache-Control': 'no-store' };
}
export function json(req: Request, body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...headers(req), 'Content-Type': 'application/json' } }); }
export async function user(req: Request) {
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('Entre na sua conta para continuar.');
  const { data, error } = await admin().auth.getUser(authorization.slice(7));
  if (error || !data.user) throw new Error('Entre na sua conta para continuar.');
  return data.user;
}
export async function body(req: Request) {
  const raw = await req.text();
  if (raw.length > 16000) throw new Error('Solicitação inválida.');
  return JSON.parse(raw);
}
export const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function publicOrder(o: Record<string, unknown>) {
  return { id: o.id, status: o.status, amount: o.amount, currency: o.currency, plan_id: o.plan_id, contract_id: o.contract_id, livemode: o.livemode, transfer: o.transfer, term_months: o.term_months };
}
export function endpoint(handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      headers(req);
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(req) });
      if (req.method !== 'POST') return json(req, { error: 'Método não permitido.' }, 405);
      return await handler(req);
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      const safe = ['Escolha um período de 1 ou 12 meses.','Entre na sua conta para continuar.','Plano inválido.','Confira os dados da empresa.','Informe os dados da empresa.','Confira a razão social, o CNPJ, o e-mail e o telefone.','Pedido não encontrado.','Esta declaração ainda não está disponível.','Confira os dados e aceite as condições para continuar.','Uma tentativa anterior já usa este pedido. Reabra o checkout.'];
      try { return json(req, { error: safe.includes(message) ? message : 'Não foi possível concluir esta etapa. Tente novamente.' }, message.startsWith('Entre na sua conta') ? 401 : safe.includes(message) ? 400 : 503); }
      catch { return new Response('Not available', { status: 403 }); }
    }
  };
}
/** Confirm through Stripe's API as a fallback when webhook delivery is delayed.
 * Never trust the return URL or a client-provided payment status. */
export async function syncOrder(order: any, eventId?: string) {
  if (!order.stripe_payment_intent) return { order, intent: null };
  const intent = await stripe().paymentIntents.retrieve(order.stripe_payment_intent, { expand: ['latest_charge'] });
  if (intent.metadata.order_id !== order.id || intent.amount !== order.amount || intent.currency !== order.currency || intent.livemode !== order.livemode) throw new Error('Payment mismatch');
  const charge = typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
  const state = charge?.disputed ? 'disputed' : charge && charge.amount_refunded > 0 ? 'refunded' : intent.status === 'succeeded' && intent.amount_received === order.amount ? 'paid' : intent.status === 'canceled' ? 'canceled' : null;
  if (state) {
    const { error } = await admin().rpc('settle_fiscal_payment', { p_order_id: order.id, p_event_id: eventId || `verified:${intent.id}:${state}`, p_intent_id: intent.id, p_amount: intent.amount, p_currency: intent.currency, p_livemode: intent.livemode, p_state: state });
    if (error) throw new Error('Could not settle payment');
  }
  const { data: fresh, error } = await admin().from('fiscal_payment_orders').select('*').eq('id', order.id).single();
  if (error) throw new Error('Could not reload payment');
  return { order: fresh, intent };
}
