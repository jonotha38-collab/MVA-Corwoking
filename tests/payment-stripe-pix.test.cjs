const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const gateway = fs.readFileSync(path.join(__dirname, '../supabase/functions/mva-stripe-gateway/index.ts'), 'utf8');
const webhook = fs.readFileSync(path.join(__dirname, '../supabase/functions/mva-stripe-webhook/index.ts'), 'utf8');
const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261109160000_mva_pix_async_failure.sql'), 'utf8');
const customerCheckout = gateway.split('async function customerCheckout(')[1]?.split('Deno.serve(')[0] || '';

test('one-time Stripe Checkout uses dynamic payment methods for card and eligible Pix',()=>{
 assert.match(customerCheckout,/mode:'payment'/);
 assert.doesNotMatch(customerCheckout,/allowed_payment_method_types/);
 assert.match(customerCheckout,/mva_dynamic_methods:'v1'/);
 assert.match(gateway,/stripe\.paymentMethodConfigurations\.list/);
});

test('legacy open card-only sessions are retired before replacing, never completed sessions',()=>{
 assert.match(customerCheckout,/previous\.status==='complete'&&order\.status==='pending'/);
 assert.match(customerCheckout,/stripe\.checkout\.sessions\.expire\(previous\.id/);
 assert.match(customerCheckout,/\.eq\('stripe_checkout_session_id',previous\.id\)/);
 assert.match(customerCheckout,/mva_claim_checkout_order/);
});

test('Pix success requires signed webhook and actual payment_status paid',()=>{
 assert.match(webhook,/stripe\.webhooks\.constructEventAsync/);
 assert.match(webhook,/checkout\.session\.async_payment_succeeded/);
 assert.match(webhook,/mva_apply_verified_stripe_event/);
 assert.match(migration,/p_obj->>'payment_status'='paid'/);
});

test('failed asynchronous payments are recorded without granting fiscal authorization',()=>{
 assert.match(webhook,/checkout\.session\.async_payment_failed/);
 assert.match(migration,/p_type='checkout\.session\.async_payment_failed'/);
 assert.match(migration,/set status='failed'/);
 assert.match(migration,/status='pending'/);
});

test('recurring room-hour memberships are unchanged and remain card only',()=>{
 assert.match(gateway,/mode:'subscription',allowed_payment_method_types:\['card'\]/);
});
