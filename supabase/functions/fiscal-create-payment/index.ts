import { admin, body, endpoint, env, json, publicOrder, stripe, syncOrder, user, uuid } from '../_shared/payment-server.ts';
import { getPlan, quotePlan, validateCompany } from '../_shared/fiscal-plans.ts';

Deno.serve(endpoint(async req => {
  const account = await user(req);
  const input = await body(req);
  const plan = getPlan(input.planId);
  const company = validateCompany(input.company);
  const transfer = input.transfer === true;
  const previousAddress = typeof input.previousAddress === 'string' ? input.previousAddress.trim() : '';
  if (!uuid(input.requestKey) || input.termsAccepted !== true || previousAddress.length > 240 || transfer && previousAddress.length < 3) throw new Error('Confira os dados e aceite as condições para continuar.');
  const quote = quotePlan(plan, transfer);
  const key = env('STRIPE_SECRET_KEY');
  if (!/^sk_(test|live)_/.test(key)) throw new Error('Stripe secret key missing');
  const live = key.startsWith('sk_live_');
  const db = admin();
  const { data: existing, error: findError } = await db.from('fiscal_payment_orders').select('*').eq('user_id', account.id).eq('request_key', input.requestKey).maybeSingle();
  if (findError) throw new Error('Could not find order');
  if (existing && (existing.plan_id !== plan.id || existing.transfer !== transfer || JSON.stringify(existing.company, Object.keys(existing.company).sort()) !== JSON.stringify(company, Object.keys(company).sort()) || existing.previous_address !== previousAddress || existing.livemode !== live)) throw new Error('Uma tentativa anterior já usa este pedido. Reabra o checkout.');
  let order = existing;
  if (!order) {
    const { data, error } = await db.from('fiscal_payment_orders').upsert({ user_id: account.id, request_key: input.requestKey, plan_id: plan.id, plan_name: plan.name, monthly_cents: plan.monthlyCents, amount: quote.amount, currency: quote.currency, company, transfer, previous_address: previousAddress, livemode: live }, { onConflict: 'user_id,request_key', ignoreDuplicates: true }).select('*').maybeSingle();
    if (error) throw new Error('Could not create order');
    if (data) order = data;
    else { const { data: raced, error: raceError } = await db.from('fiscal_payment_orders').select('*').eq('user_id', account.id).eq('request_key', input.requestKey).single(); if (raceError) throw new Error('Could not find order'); order = raced; }
  }
  if (order.plan_id !== plan.id || order.transfer !== transfer || order.previous_address !== previousAddress || order.livemode !== live || JSON.stringify(order.company, Object.keys(order.company).sort()) !== JSON.stringify(company, Object.keys(company).sort())) throw new Error('Uma tentativa anterior já usa este pedido. Reabra o checkout.');
  if (order.status !== 'pending' && order.status !== 'paid') throw new Error('Pedido não encontrado.');
  const client = stripe();
  const intent = order.stripe_payment_intent ? await client.paymentIntents.retrieve(order.stripe_payment_intent) : await client.paymentIntents.create({ amount: order.amount, currency: 'brl', payment_method_types: ['card'], receipt_email: order.company.contactEmail, description: `MVA · ${order.plan_name} · plano anual`, metadata: { order_id: order.id, user_id: account.id } }, { idempotencyKey: `mva-fiscal-${order.id}` });
  if (intent.livemode !== live) throw new Error('Stripe environment mismatch');
  if (!order.stripe_payment_intent) {
    const { error } = await db.from('fiscal_payment_orders').update({ stripe_payment_intent: intent.id }).eq('id', order.id);
    if (error) throw new Error('Could not link payment');
    order.stripe_payment_intent = intent.id;
  }
  const fresh = await syncOrder(order);
  return json(req, { clientSecret: intent.client_secret, order: publicOrder(fresh.order) });
}));
