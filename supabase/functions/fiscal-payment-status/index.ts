import { admin, body, endpoint, json, publicOrder, syncOrder, user, uuid } from '../_shared/payment-server.ts';
Deno.serve(endpoint(async req => {
  const account = await user(req);
  const input = await body(req);
  if (!uuid(input.orderId)) throw new Error('Pedido não encontrado.');
  const { data: order, error } = await admin().from('fiscal_payment_orders').select('*').eq('id', input.orderId).eq('user_id', account.id).maybeSingle();
  if (error || !order) throw new Error('Pedido não encontrado.');
  const fresh = await syncOrder(order);
  return json(req, { order: publicOrder(fresh.order), providerStatus: fresh.intent?.status, clientSecret: fresh.order.status === 'pending' ? fresh.intent?.client_secret : null, company: fresh.order.company, previousAddress: fresh.order.previous_address });
}));
