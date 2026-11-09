// MVA | Verified Stripe webhooks for the three payment flows.
// No account or contract is activated from a browser redirect.
// Configure a platform webhook plus a Connect webhook (two different signing secrets).
import Stripe from 'npm:stripe@^22';
import { createClient } from 'npm:@supabase/supabase-js@^2';
const admin = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{
 auth:{persistSession:false,autoRefreshToken:false}
});
const json=(body:unknown,status:number)=>new Response(JSON.stringify(body),{
 status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}
});
Deno.serve(async req=>{
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const platformSecret=Deno.env.get('STRIPE_WEBHOOK_SECRET')||Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET');
 const connectedSecret=Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET');
 if(!platformSecret&&!connectedSecret)return json({error:'Webhook not configured'},503);
 const signature=req.headers.get('stripe-signature');
 if(!signature)return json({error:'Missing signature'},400);
 const raw=await req.text();
 const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')||'sk_test_webhook_signature_only');
 const cryptoProvider=Stripe.createSubtleCryptoProvider();
 let event:Stripe.Event|undefined;
 let origin:'platform'|'connect'|null=null;
 for(const [type,secret] of [['platform',platformSecret],['connect',connectedSecret]] as const){
  if(!secret)continue;
  try{
   const result=await stripe.webhooks.constructEventAsync(raw,signature,secret,undefined,cryptoProvider);
   event=result;origin=type;break;
  }catch{/* try the other configured endpoint secret */}
 }
 if(!event||!origin)return json({error:'Bad signature'},400);
 // A mismatched but correctly signed event is acknowledged, never fulfilled.
 const configuredMode=Deno.env.get('STRIPE_BILLING_MODE');
 if((configuredMode==='test'&&event.livemode===true)
    ||(configuredMode==='live'&&event.livemode!==true))
    return json({received:true,ignored:true,reason:'different_stripe_mode'},200);
 if(origin==='connect'&&!event.account)return json({error:'Connected account event expected'},400);
 if(origin==='platform'&&event.account)return json({error:'Platform event expected'},400);
 // Strictly handle only the events subscribed for this integration.
 const supported=new Set([
   'checkout.session.completed','checkout.session.async_payment_succeeded',
   'checkout.session.expired','customer.subscription.created',
   'customer.subscription.updated','customer.subscription.deleted',
   'invoice.paid','invoice.payment_failed','account.updated',
   'charge.refunded','charge.dispute.created'
 ]);
 if(!supported.has(event.type))return json({received:true,ignored:true},200);
 try{
  // Membership credit updates run only after Stripe signature verification.
  // When invoices arrive, retrieve the canonical subscription metadata and price.
  if(origin==='platform'&&[
    'checkout.session.completed','customer.subscription.created',
    'customer.subscription.updated','customer.subscription.deleted',
    'invoice.paid','invoice.payment_failed'
  ].includes(event.type)){
   const object=event.data.object as unknown as Record<string,any>;
   let subSummary:Record<string,unknown>|null=null;
   let applicable=object?.metadata?.mva_kind==='booking_membership';
   if((event.type==='invoice.paid'||event.type==='invoice.payment_failed')&&
      event.livemode===true){
    const rawSubscription=object?.subscription||object?.parent?.subscription_details?.subscription||
       object?.lines?.data?.[0]?.parent?.subscription_item_details?.subscription;
    const subId=typeof rawSubscription==='string'?rawSubscription:rawSubscription?.id;
    if(typeof subId==='string'&&subId.startsWith('sub_')){
     const subscription=await stripe.subscriptions.retrieve(subId);
     if(subscription.metadata?.mva_kind==='booking_membership'){
      applicable=true;
      subSummary={
       id:subscription.id,metadata:subscription.metadata,
       customer:typeof subscription.customer==='string'?subscription.customer:subscription.customer?.id,
       items:{data:subscription.items?.data?.slice(0,1).map(x=>({price:{id:x.price.id}}))||[]}
      };
     }
    }
   }
   if(applicable){
    const {error:planError}=await admin.rpc('mva_apply_booking_plan_event',{
     p_id:event.id,p_type:event.type,p_obj:object,p_live:event.livemode===true,p_sub:subSummary
    });
    if(planError)throw planError;
   }
  }
  const {data,error}=await admin.rpc('mva_apply_verified_stripe_event',{
   p_id:event.id,p_type:event.type,
   p_obj:event.data.object,
   p_account:event.account||null,p_livemode:event.livemode===true
  });
  if(error)throw error;
  return json({received:true,duplicate:data?.duplicate===true},200);
 }catch(err){
  // Non-2xx allows Stripe to retry; the database transaction rolls back on failure.
  console.error('MVA Stripe webhook persistence failed',err instanceof Error?err.message:'Unknown error');
  return json({error:'Processing failed; retry later'},500);
 }
});
