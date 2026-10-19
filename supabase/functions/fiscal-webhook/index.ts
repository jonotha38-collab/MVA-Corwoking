import Stripe from 'npm:stripe@18.5.0';
import { admin, env, stripe, syncOrder } from '../_shared/payment-server.ts';

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });
  let event: Stripe.Event;
  try { event = await stripe().webhooks.constructEventAsync(await req.text(), signature, env('STRIPE_WEBHOOK_SECRET'), undefined, Stripe.createSubtleCryptoProvider()); }
  catch { return new Response('Invalid signature', { status: 400 }); }
  try {
    let intentId: string | null = null;
    if (['payment_intent.succeeded', 'payment_intent.canceled', 'payment_intent.payment_failed'].includes(event.type)) intentId = (event.data.object as Stripe.PaymentIntent).id;
    if (event.type === 'charge.refunded') { const charge = event.data.object as Stripe.Charge; intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id || null; }
    if (event.type === 'charge.dispute.created') { const dispute = event.data.object as Stripe.Dispute; const charge = await stripe().charges.retrieve(typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id); intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id || null; }
    if (intentId) {
      const { data: order, error } = await admin().from('fiscal_payment_orders').select('*').eq('stripe_payment_intent', intentId).maybeSingle();
      if (error) throw error;
      // Unrelated Stripe payments must not be attached to an MVA contract.
      if (order) await syncOrder(order, event.id);
    }
    return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch { return new Response('Could not process event', { status: 500 }); }
});
