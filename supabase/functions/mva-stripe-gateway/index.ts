// MVA Coworking | Three Stripe revenue flows.
// This function is intentionally fail-closed until admins enable the DB gates,
// set STRIPE_BILLING_MODE=test and configure a fresh test key in Supabase Secrets.
// Never embed Stripe private keys in the frontend, GitHub, or responses.
import Stripe from 'npm:stripe@^22';
import { createClient } from 'npm:@supabase/supabase-js@^2';

const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
const SITE = Deno.env.get('MVA_SITE_URL') || 'https://mvacoworking.com.br';
const origins = new Set([new URL(SITE).origin,'https://mvacoworking.com.br','https://www.mvacoworking.com.br','http://localhost:5173',...(Deno.env.get('MVA_ALLOWED_ORIGINS')||'').split(',').map(x=>x.trim()).filter(Boolean)]);
type Body = Record<string,unknown>;
const response = (data:unknown,status=200,origin=SITE)=>new Response(JSON.stringify(data),{
 status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',
 'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 'Access-Control-Allow-Methods':'POST, OPTIONS'}
});
const string = (value:unknown)=>typeof value==='string'?value.trim():'';
const validUuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
function stripeClient(){
 const privateKey=Deno.env.get('STRIPE_SECRET_KEY')||'';
 const mode=Deno.env.get('STRIPE_BILLING_MODE');
 const keyIsTest=/^(sk|rk)_test_/.test(privateKey);
 const keyIsLive=/^(sk|rk)_live_/.test(privateKey);
 if (mode==='test'&&!keyIsTest)throw new Error('Configure uma chave Stripe de TESTE válida no Supabase.');
 if (mode==='live'&&(!keyIsLive||Deno.env.get('STRIPE_LIVE_LAUNCH_APPROVED')!=='true'))throw new Error('Produção Stripe bloqueada até aprovação explícita.');
 if(mode!=='test'&&mode!=='live')throw new Error('Gateway Stripe em preparação.');
 return new Stripe(privateKey);
}
// Do not allow checkout to charge a different Stripe merchant.
const EXPECTED_PLATFORM_ACCOUNT = 'acct_1UTlB031eJ9Ivl6i';
let accountCheck: { mode: string; ok: boolean; validUntil: number } | null = null;
let accountIdentity: 'principal'|'secundaria'|'outra'|'indisponivel' = 'indisponivel';
async function verifyPrimaryStripeAccount(): Promise<boolean> {
 const mode = Deno.env.get('STRIPE_BILLING_MODE') || '';
 if(accountCheck && accountCheck.mode === mode && accountCheck.validUntil > Date.now())return accountCheck.ok;
 let ok=false;
 try{
  const stripe=stripeClient();
  const account=await stripe.accounts.retrieve();
  accountIdentity=account.id===EXPECTED_PLATFORM_ACCOUNT?'principal':account.id==='acct_1UTYI1KLztD0qXfd'?'secundaria':'outra';
  ok=accountIdentity==='principal'&&account.charges_enabled===true;
 }catch(err){
  console.error('MVA merchant verification failed',err instanceof Error?err.message:'unknown');
 }
 accountCheck={mode,ok,validUntil:Date.now()+(ok?120000:15000)};
 return ok;
}
async function settings(){
 const {data,error}=await admin.from('mva_billing_settings').select('*').eq('id',1).single();
 if(error)throw error;return data;
}
const credentialsReady=()=>{
 const mode=Deno.env.get('STRIPE_BILLING_MODE');
 const secret=Deno.env.get('STRIPE_SECRET_KEY')||'';
 return mode==='test'?/^(sk|rk)_test_/.test(secret):
   mode==='live'&&Deno.env.get('STRIPE_LIVE_LAUNCH_APPROVED')==='true'
     &&/^(sk|rk)_live_/.test(secret);
};
const platformWebhookReady=()=>/^whsec_[A-Za-z0-9]+$/.test(Deno.env.get('STRIPE_WEBHOOK_SECRET')||'');
const connectedWebhookReady=()=>/^whsec_[A-Za-z0-9]+$/.test(Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET')||'');
// In test mode, only administrators can enter Stripe's sandbox Checkout.
// Live charges always require both the billing secret and explicit live approval.
const sandboxTester=(isAdmin:boolean)=>Deno.env.get('STRIPE_BILLING_MODE')==='test'&&isAdmin;
const flagsReady=(s:Body,isAdmin=false)=>Boolean(s.checkout_enabled)
  &&credentialsReady()&&platformWebhookReady()
  &&(sandboxTester(isAdmin) || (Deno.env.get('STRIPE_BILLING_MODE')==='live'
      &&Deno.env.get('STRIPE_BILLING_ENABLED')==='true'));
const checkoutUrl=(page:string,status:string,order?:string)=>{
 const u=new URL(SITE);
 u.searchParams.set('page',page);u.searchParams.set('stripe_checkout',status);
 if(order)u.searchParams.set('stripe_order',order);
 return u.href;
};
async function auth(req:Request){
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!token || token.length<30)throw new Error('Entre na sua conta para pagar.');
 const {data,error}=await admin.auth.getUser(token);
 if(error||!data.user)throw new Error('Sessão expirada. Entre novamente.');
 return data.user;
}
async function profile(userId:string){
 const {data,error}=await admin.from('profiles').select('id,name,email,account_type,is_admin').eq('id',userId).single();
 if(error||!data)throw new Error('Perfil do usuário não encontrado.');
 return data;
}
async function priceOfOwner(planId:string,allowInactiveTest=false){
 if(!['essencial','profissional','business'].includes(planId))throw new Error('Plano inválido.');
 let query=admin.from('mva_owner_plans').select('id,label,monthly_cents,max_spaces').eq('id',planId);
 if(!allowInactiveTest)query=query.eq('active',true);
 const {data,error}=await query.maybeSingle();
 if(error)throw error;if(!data)throw new Error('Este plano ainda não foi ativado pela MVA.');
 return data;
}
function successInfo(session:Stripe.Checkout.Session,orderId?:string){
 if(!session.url)throw new Error('O Stripe não retornou uma página de pagamento.');
 return {url:session.url,sessionId:session.id,orderId,livemode:session.livemode};
}
async function customerCheckout(input:{
 kind:'fiscal'|'booking',resourceId:string,userId:string,amountCents:number,title:string,
 email:string,accountId:string|null,meta:Record<string,string>,page:string,
},stripe:Stripe){
 const {kind,resourceId,userId,amountCents,title,email,accountId,meta,page}=input;
 let {data:order,error:lookupError}=await admin.from('mva_checkout_orders').select('*')
   .eq('kind',kind).eq('resource_id',resourceId).maybeSingle();
 if(lookupError)throw lookupError;
 if(order&&order.user_id!==userId)throw new Error('Este pedido pertence a outra conta.');
 // A test checkout must never be reused after switching to live (or the reverse).
 // Separate checkout environments require separate approved applications/bookings.
 const expectedLive=Deno.env.get('STRIPE_BILLING_MODE')==='live';
 if(order&&order.livemode!==expectedLive)
   throw new Error('Esta contratação foi iniciada em outro ambiente Stripe (teste/produção). Para pagar com segurança, solicite à MVA uma nova solicitação ou reserva para o ambiente atual. Nenhuma cobrança foi realizada.');
 if(order&&['paid','refunded','disputed'].includes(order.status))
   throw new Error('Este pedido já possui pagamento registrado. Consulte o histórico.');
 if(order&&(order.stripe_account_id!==accountId || order.amount_cents!==amountCents))
   throw new Error('O valor ou recebedor mudou. Peça revisão à MVA antes de pagar.');
 if(order&&order.stripe_checkout_url&&order.session_expires_at
    &&new Date(order.session_expires_at).getTime()>Date.now()+60000)
   return {url:order.stripe_checkout_url,sessionId:order.stripe_checkout_session_id,orderId:order.id,livemode:order.livemode};
 if(!order){
  const {data:newOrder,error}=await admin.from('mva_checkout_orders').insert({
   kind,user_id:userId,resource_id:resourceId,amount_cents:amountCents,
   stripe_account_id:accountId,currency:'brl',status:'pending',livemode:Deno.env.get('STRIPE_BILLING_MODE')==='live',
   plan_id:meta.planId||null,term_months:meta.termMonths?Number(meta.termMonths):null
  }).select('*').single();
  if(error){
   const again=await admin.from('mva_checkout_orders').select('*').eq('kind',kind).eq('resource_id',resourceId).maybeSingle();
   if(again.data?.user_id===userId)throw new Error('O checkout já está sendo preparado. Tente novamente em alguns segundos.');
   throw error;
  }
  order=newOrder;
 }
 const {data:claimed,error:claimError}=await admin.rpc('mva_claim_checkout_order',{p_order:order.id});
 if(claimError)throw claimError;
 if(!claimed)throw new Error('Há uma tentativa de pagamento em andamento. Aguarde e tente novamente.');
 let created:Stripe.Checkout.Session|null=null;
 try{
  created=await stripe.checkout.sessions.create({
   mode:'payment',allowed_payment_method_types:['card'],
   customer_email:email,
   client_reference_id:order.id,
   line_items:[{price_data:{currency:'brl',unit_amount:amountCents,
     product_data:{name:title}},quantity:1}],
   metadata:{mva_kind:kind,mva_order_id:order.id,mva_resource_id:resourceId,...meta},
   payment_intent_data:{metadata:{mva_kind:kind,mva_order_id:order.id}},
   success_url:checkoutUrl(page,'success',order.id),
   cancel_url:checkoutUrl(page,'canceled',order.id),
  },accountId?{stripeAccount:accountId,idempotencyKey:'mva-'+order.id+'-'+(order.stripe_checkout_session_id||'first')}:{idempotencyKey:'mva-'+order.id+'-'+(order.stripe_checkout_session_id||'first')});
  const {error:saveError}=await admin.from('mva_checkout_orders').update({
   status:'pending',stripe_checkout_session_id:created.id,
   stripe_checkout_url:created.url,session_expires_at:new Date((created.expires_at||0)*1000).toISOString(),
   livemode:created.livemode,checkout_lock_until:null,updated_at:new Date().toISOString(),
  }).eq('id',order.id);
  if(saveError)throw saveError;
  return successInfo(created,order.id);
 }catch(e){
  if(created)try{await stripe.checkout.sessions.expire(created.id,{},accountId?{stripeAccount:accountId}:{})}catch{/* manual reconciliation */}
  await admin.from('mva_checkout_orders').update({checkout_lock_until:null}).eq('id',order.id);
  throw e;
 }
}
Deno.serve(async req=>{
 const requestOrigin=req.headers.get('origin');
 if(requestOrigin&&!origins.has(requestOrigin))return response({error:'Origem não autorizada.'},403,SITE);
 const origin=requestOrigin||SITE;
 if(req.method==='OPTIONS')return response({},200,origin);
 if(req.method!=='POST')return response({error:'Método inválido.'},405,origin);
 try{
  const body=await req.json() as Body;
  const action=string(body.action);
  const cfg=await settings();
  if(action==='status'){
   // Anonymous and ordinary users cannot initiate simulated payments on the public site.
   let testAdmin=false;
   if(Deno.env.get('STRIPE_BILLING_MODE')==='test'){
    try{const signed=await auth(req);testAdmin=(await profile(signed.id)).is_admin===true}catch{/* anonymous visitor */}
   }
   const stripeAccountVerified=credentialsReady() && await verifyPrimaryStripeAccount();
  const gateway=flagsReady(cfg,testAdmin)&&stripeAccountVerified;
   return response({mode:'hosted_checkout',checkout:gateway,
     sandbox:Deno.env.get('STRIPE_BILLING_MODE')==='test',
     sandboxTester:sandboxTester(testAdmin),
     fiscal:gateway,booking:gateway,
     owner:gateway&&cfg.owner_subscriptions_enabled,
     portal:credentialsReady(),
     connect:gateway&&cfg.connect_enabled&&connectedWebhookReady(),
     live:Deno.env.get('STRIPE_BILLING_MODE')==='live',
     integrationChecks:{
       testKeyConfigured:Deno.env.get('STRIPE_BILLING_MODE')==='test'&&credentialsReady(),
       primaryStripeAccountVerified:stripeAccountVerified,
       stripeKeyAccount:accountIdentity,
       platformWebhookConfigured:platformWebhookReady(),
       connectWebhookConfigured:connectedWebhookReady(),
       billingSecretEnabled:Deno.env.get('STRIPE_BILLING_ENABLED')==='true',
       administratorSandboxEnabled:sandboxTester(testAdmin)&&gateway,
       platformCheckoutEnabled:cfg.checkout_enabled===true,
       ownerSubscriptionsEnabled:cfg.owner_subscriptions_enabled===true,
       connectEnabled:cfg.connect_enabled===true,
     },
     note:'Identidade da conta consultada na API Stripe; o segredo do webhook e a conclusão de um checkout ainda precisam ser confirmados.'},200,origin);
  }
  const user=await auth(req);
  const me=await profile(user.id);
  if(action!=='owner_portal'&&!flagsReady(cfg,me.is_admin===true))return response({error:'Pagamentos ainda não foram ativados pela MVA. Nenhuma cobrança foi realizada.'},503,origin);
  if(!(await verifyPrimaryStripeAccount()))return response({error:'A conta Stripe principal da MVA não foi validada. Nenhuma cobrança foi realizada.'},503,origin);
  const stripe=stripeClient();

  if(action==='checkout_fiscal'){
   const id=string(body.applicationId);if(!validUuid(id))throw new Error('Solicitação fiscal inválida.');
   const {data:app,error:appError}=await admin.from('fiscal_applications').select('*').eq('id',id).eq('user_id',user.id).single();
   if(appError||!app||app.status!=='approved')throw new Error('A contratação exige análise cadastral aprovada.');
   // Never charge a fiscal service that cannot be formally linked to an approved, active unit.
   const unitQuery=admin.from('fiscal_units').select('id,active').eq('active',true);
   const {data:verifiedUnit,error:unitError}=app.unit_id
     ? await unitQuery.eq('id',app.unit_id).maybeSingle()
     : await unitQuery.eq('name','MVA Coworking — Sede').maybeSingle();
   if(unitError)throw unitError;
   if(!verifiedUnit)throw new Error('A unidade fiscal selecionada está indisponível para contratação. A MVA precisa regularizar a unidade antes de cobrar.');
   let priceQuery=admin.from('mva_fiscal_prices').select('*').eq('id',app.plan_id);
   if(!sandboxTester(me.is_admin===true))priceQuery=priceQuery.eq('active',true);
   const {data:p,error:priceErr}=await priceQuery.maybeSingle();
   if(priceErr)throw priceErr;if(!p)throw new Error('Este plano ainda não está habilitado para cobrança.');
   const months=app.term_months;
   if(months!==1&&months!==12)throw new Error('Vigência fiscal inválida.');
   const transfer=months===12&&app.transfer_from.trim().length>=3;
   // Fiscal amounts are calculated only on the server using the active DB catalog.
   // The existing transfer campaign (4 free months) replaces the regular annual 10% discount.
   const discountPercent=Number(p.annual_discount_percent)||0;
   const amount=months===12
     ?(transfer?p.monthly_cents*8:Math.round(p.monthly_cents*12*(100-discountPercent)/100))
     :p.monthly_cents;
   if(!Number.isSafeInteger(amount)||amount<100)throw new Error('Valor do plano inválido.');
   const result=await customerCheckout({kind:'fiscal',resourceId:id,userId:user.id,amountCents:amount,
     title:p.name+' · '+months+' meses',email:app.contact_email,
     accountId:null,meta:{planId:p.id,termMonths:String(months),transfer:String(transfer)},
     page:'fiscal'},stripe);
   return response(result,200,origin);
  }
  if(action==='checkout_booking'){
   const id=string(body.bookingId);if(!validUuid(id))throw new Error('Reserva inválida.');
   const {data:b,error:bError}=await admin.from('bookings').select('*').eq('id',id).eq('user_id',user.id).single();
   if(bError||!b||b.status!=='confirmada')throw new Error('Reserva indisponível para pagamento.');
   const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Maceio',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   if(b.booking_date<today)throw new Error('Não é possível pagar uma reserva que já passou.');
   const {data:s,error:sError}=await admin.from('spaces').select('id,owner_id,is_mva_headquarters,approval,status')
      .eq('id',b.space_id).single();
   if(sError||!s||s.approval!=='aprovado'||s.status!=='available')throw new Error('Espaço não está disponível para novos pagamentos.');
   let connected:string|null=null;
   if(!s.is_mva_headquarters){
    if(!cfg.connect_enabled||!connectedWebhookReady())throw new Error('Repasses a coworkings ainda não habilitados ou sem webhook Connect verificado.');
    const {data:account}=await admin.from('mva_connected_accounts').select('*').eq('owner_id',s.owner_id).maybeSingle();
    if(!account?.charges_enabled||!account?.payouts_enabled||!account.stripe_account_id)
       throw new Error('Este coworking ainda não concluiu a conexão de recebimentos com Stripe.');
    connected=account.stripe_account_id;
   }
   const amount=Math.round(Number(b.total_price)*100);
   if(!Number.isSafeInteger(amount)||amount<100)throw new Error('Valor da reserva inválido.');
   return response(await customerCheckout({kind:'booking',resourceId:id,userId:user.id,amountCents:amount,
    title:'Reserva · '+b.space_name+' · '+b.booking_date,email:b.responsible_email,
    accountId:connected,meta:{bookingId:id},page:'client-dashboard'},stripe),200,origin);
  }
  // Monthly room-hour membership: credits are granted only by signed invoice.paid events.
  if(action==='booking_plan_status'){
   const {data:plans,error:plansError}=await admin.from('mva_booking_plans')
     .select('id,label,monthly_cents,included_minutes,active,display_order')
     .eq('active',true).order('display_order');
   if(plansError)throw plansError;
   const {count:eligibleRooms,error:roomError}=await admin.from('spaces').select('id',{count:'exact',head:true})
      .eq('is_mva_headquarters',true).eq('category','atendimento')
      .eq('approval','aprovado').eq('status','available');
   if(roomError)throw roomError;
   const {data:membership,error:memberError}=await admin.from('mva_booking_memberships')
      .select('*').eq('user_id',user.id).maybeSingle();
   if(memberError)throw memberError;
   let usedMinutes=0;
   if(membership?.paid_period_start){
    const {data:reds,error:redsError}=await admin.from('mva_booking_redemptions')
      .select('minutes').eq('user_id',user.id).eq('period_start',membership.paid_period_start).eq('status','applied');
    if(redsError)throw redsError;
    usedMinutes=(reds||[]).reduce((sum,item)=>sum+Number(item.minutes),0);
   }
   const plan=(plans||[]).find(x=>x.id===membership?.plan_id);
   const active=membership?.status==='active'&&membership.livemode===true&&
      membership.paid_period_start&&membership.paid_period_end&&
      new Date(membership.paid_period_start).getTime()<=Date.now()&&
      new Date(membership.paid_period_end).getTime()>Date.now();
   return response({plans,eligibleRooms:eligibleRooms||0,member:membership?{
     planId:membership.plan_id,status:membership.status,livemode:membership.livemode,
     periodStart:membership.paid_period_start,periodEnd:membership.paid_period_end,
     cancelAtPeriodEnd:membership.cancel_at_period_end,
     active:!!active,usedMinutes,remainingMinutes:active&&plan?Math.max(0,plan.included_minutes-usedMinutes):0,
     hasStripeCustomer:!!membership.stripe_customer_id
   }:null},200,origin);
  }
  if(action==='redeem_booking_hours'){
   const bookingId=string(body.bookingId);
   if(!validUuid(bookingId))throw new Error('Reserva inválida.');
   // Do not combine fiscal discounts/free hours with a separate booking-hour subscription.
   const {data:fiscalBooking,error:fiscalError}=await admin.from('bookings')
    .select('fiscal_bonus_hours,fiscal_discount_percent').eq('id',bookingId).eq('user_id',user.id).maybeSingle();
   if(fiscalError||!fiscalBooking)throw new Error('Reserva não encontrada.');
   if(Number(fiscalBooking.fiscal_bonus_hours)>0||Number(fiscalBooking.fiscal_discount_percent)>0)
    throw new Error('Esta reserva já recebeu um benefício de endereço fiscal da MVA e não pode acumular créditos de outro plano.');
   const {data,error}=await admin.rpc('mva_redeem_booking_credit',{p_user:user.id,p_booking:bookingId});
   if(error)throw error;
   return response(data,200,origin);
  }
  if(action==='checkout_booking_plan'){
   if(Deno.env.get('STRIPE_BILLING_MODE')!=='live')
    throw new Error('Os planos de atendimento estão disponíveis somente no ambiente real.');
   const planId=string(body.planId);
   const {data:plan,error:planError}=await admin.from('mva_booking_plans')
    .select('*').eq('id',planId).eq('active',true).maybeSingle();
   if(planError)throw planError;
   if(!plan)throw new Error('Plano de atendimento indisponível.');
   const {count:eligibleRooms,error:roomError}=await admin.from('spaces')
    .select('id',{count:'exact',head:true}).eq('is_mva_headquarters',true)
    .eq('category','atendimento').eq('approval','aprovado').eq('status','available');
   if(roomError)throw roomError;
   if(!eligibleRooms)throw new Error('A MVA ainda não habilitou sala própria de atendimento. Nenhuma assinatura foi cobrada.');
   // Serializable, per-customer checkout claim blocks concurrent plan choices and double subscriptions.
   const {data:claimed,error:claimError}=await admin.rpc('mva_claim_booking_plan_checkout',
     {p_user:user.id,p_plan:plan.id});
   if(claimError)throw claimError;
   if(claimed!==true)throw new Error('Uma assinatura ou checkout está em andamento. Aguarde a conclusão e tente novamente.');
   try{
    const {data:existing,error:existingError}=await admin.from('mva_booking_memberships')
     .select('*').eq('user_id',user.id).single();
    if(existingError||!existing)throw existingError||new Error('Plano não encontrado.');
    if(existing.stripe_subscription_id&&!['canceled','incomplete_expired'].includes(existing.status))
     throw new Error('Você já possui uma assinatura. Use Gerenciar meu plano.');
    // A canceled checkout must not strand a customer or lock them into another tier.
    if(existing.stripe_checkout_session_id&&!existing.stripe_subscription_id){
     const prior=await stripe.checkout.sessions.retrieve(existing.stripe_checkout_session_id);
     if(prior.status==='open'){
      if(existing.plan_id===plan.id&&prior.url)return response(successInfo(prior),200,origin);
      // Expire the old tier before creating a replacement, so there is only one payable session.
      await stripe.checkout.sessions.expire(prior.id);
     }else if(prior.status==='complete'){
      throw new Error('Seu último pagamento está sendo confirmado. Atualize o painel antes de tentar novamente.');
     }
    }
    const session=await stripe.checkout.sessions.create({
     mode:'subscription',allowed_payment_method_types:['card'],
     customer_email:user.email||me.email,
     client_reference_id:user.id,
     line_items:[{price:plan.stripe_live_price_id,quantity:1}],
     metadata:{mva_kind:'booking_membership',mva_user_id:user.id,mva_booking_plan:plan.id},
     subscription_data:{metadata:{mva_kind:'booking_membership',mva_user_id:user.id,mva_booking_plan:plan.id}},
     success_url:checkoutUrl('client-dashboard','success')+'&stripe_membership=1',
     cancel_url:checkoutUrl('client-dashboard','canceled')+'&stripe_membership=1'
    },{idempotencyKey:'mva-booking-plan-'+user.id+'-'+crypto.randomUUID()});
    const {error:saveError}=await admin.from('mva_booking_memberships').upsert({
     user_id:user.id,plan_id:plan.id,stripe_checkout_session_id:session.id,
     stripe_subscription_id:null,stripe_customer_id:null,
     status:'incomplete',livemode:true,paid_period_start:null,paid_period_end:null,
     last_paid_invoice_id:null,updated_at:new Date().toISOString()
    },{onConflict:'user_id'});
    if(saveError){try{await stripe.checkout.sessions.expire(session.id)}catch{};throw saveError}
    return response(successInfo(session),200,origin);
   }finally{
    const {error:unlockError}=await admin.from('mva_booking_memberships')
     .update({checkout_lock_until:null}).eq('user_id',user.id);
    if(unlockError)console.error('Unable to unlock booking membership checkout',unlockError.message);
   }
  }
  if(action==='booking_plan_portal'){
   const {data:membership,error}=await admin.from('mva_booking_memberships')
     .select('stripe_customer_id').eq('user_id',user.id).maybeSingle();
   if(error)throw error;
   if(!membership?.stripe_customer_id)throw new Error('Assinatura ainda não disponível para gerenciamento.');
   const portal=await stripe.billingPortal.sessions.create({
     customer:membership.stripe_customer_id,return_url:checkoutUrl('client-dashboard','return')
   });
   return response({url:portal.url},200,origin);
  }
  if(action==='checkout_owner'){
   if(!cfg.owner_subscriptions_enabled)throw new Error('Mensalidades dos parceiros ainda não habilitadas.');
   if(me.account_type!=='coworking_owner'&&!me.is_admin)throw new Error('Conta de proprietário necessária.');
   const plan=await priceOfOwner(string(body.planId),sandboxTester(me.is_admin===true));
   const {data:existing,error:subError}=await admin.from('mva_owner_subscriptions').select('*').eq('owner_id',user.id).maybeSingle();
   if(subError)throw subError;
   if(existing?.stripe_subscription_id&&['active','trialing','past_due','unpaid','paused'].includes(existing.status))
    throw new Error('Você já possui assinatura. Use Gerenciar assinatura para alterações.');
   if(existing?.stripe_checkout_session_id&&!existing.stripe_subscription_id){
    const prev=await stripe.checkout.sessions.retrieve(existing.stripe_checkout_session_id).catch(()=>null);
    if(prev?.status==='open'&&prev.url)return response(successInfo(prev),200,origin);
   }
   // Deterministic key for safe Stripe request retries (no personal ID in the header).
   const checkoutSeed=user.id+'|'+plan.id+'|'+(existing?.stripe_checkout_session_id||'first');
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(checkoutSeed));
   const checkoutKey='mva-owner-'+Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join('');
   const session=await stripe.checkout.sessions.create({
    mode:'subscription',allowed_payment_method_types:['card'],
    customer:existing?.stripe_customer_id||undefined,
    customer_email:existing?.stripe_customer_id?undefined:(user.email||me.email),
    client_reference_id:user.id,
    line_items:[{price_data:{currency:'brl',unit_amount:plan.monthly_cents,
      recurring:{interval:'month'},product_data:{name:'MVA Parceiros · '+plan.label}},quantity:1}],
    metadata:{mva_kind:'owner',mva_owner_id:user.id,mva_plan_id:plan.id},
    subscription_data:{metadata:{mva_owner_id:user.id,mva_plan_id:plan.id}},
    success_url:checkoutUrl('owner-dashboard','success'),
    cancel_url:checkoutUrl('owner-dashboard','canceled')
   },{idempotencyKey:checkoutKey});
   const {error:saveError}=await admin.from('mva_owner_subscriptions').upsert({
    owner_id:user.id,plan_id:plan.id,stripe_checkout_session_id:session.id,
    stripe_customer_id:existing?.stripe_customer_id||null,
    stripe_subscription_id:null,status:'incomplete',
    livemode:session.livemode,updated_at:new Date().toISOString()
   },{onConflict:'owner_id'});
   if(saveError){try{await stripe.checkout.sessions.expire(session.id)}catch{};throw saveError}
   return response(successInfo(session),200,origin);
  }
  if(action==='owner_portal'){
   const {data:sub}=await admin.from('mva_owner_subscriptions').select('stripe_customer_id')
     .eq('owner_id',user.id).maybeSingle();
   if(!sub?.stripe_customer_id)throw new Error('Nenhuma assinatura Stripe para gerenciar.');
   const portal=await stripe.billingPortal.sessions.create({
    customer:sub.stripe_customer_id,return_url:checkoutUrl('owner-dashboard','return')
   });
   return response({url:portal.url},200,origin);
  }
  if(action==='connect_status'){
   if(me.account_type!=='coworking_owner'&&!me.is_admin)throw new Error('Conta de proprietário necessária.');
   const {data:account,error:lookupError}=await admin.from('mva_connected_accounts')
    .select('stripe_account_id').eq('owner_id',user.id).maybeSingle();
   if(lookupError)throw lookupError;
   if(!account)return response({linked:false,connected:false},200,origin);
   const current=await stripe.accounts.retrieve(account.stripe_account_id);
   const charges=current.charges_enabled===true,payouts=current.payouts_enabled===true;
   const {error:updateError}=await admin.from('mva_connected_accounts').update({
    charges_enabled:charges,payouts_enabled:payouts,
    details_submitted:current.details_submitted===true,updated_at:new Date().toISOString()
   }).eq('owner_id',user.id);
   if(updateError)throw updateError;
   return response({linked:true,connected:charges&&payouts,chargesEnabled:charges,
    payoutsEnabled:payouts,detailsSubmitted:current.details_submitted===true},200,origin);
  }
  if(action==='connect_onboarding'){
   if(!cfg.connect_enabled||!connectedWebhookReady())throw new Error('Conexão dos parceiros não habilitada ou sem webhook Connect verificado.');
   if(me.account_type!=='coworking_owner')throw new Error('Cadastre uma conta de proprietário.');
   let {data:account,error:accountError}=await admin.from('mva_connected_accounts')
       .select('*').eq('owner_id',user.id).maybeSingle();
   if(accountError)throw accountError;
   if(!account){
    // Accounts v2 avoids Stripe's legacy /v1/accounts creation restriction.
    // Full Dashboard: connected merchants directly pay Stripe fees; MVA adds no transaction fee.
    const created=await stripe.v2.core.accounts.create({
     contact_email:user.email||me.email,
     display_name:me.name||'Coworking parceiro MVA',
     identity:{country:'BR',entity_type:'company'},
     dashboard:'full',
     defaults:{responsibilities:{fees_collector:'stripe',losses_collector:'stripe'}},
     configuration:{merchant:{capabilities:{card_payments:{requested:true}}}},
     metadata:{mva_owner_id:user.id}
    },{idempotencyKey:'mva-connect-v2-'+user.id});
    const {data:inserted,error}=await admin.from('mva_connected_accounts').insert({
     owner_id:user.id,stripe_account_id:created.id
    }).select('*').single();
    if(error)throw error;
    account=inserted;
   }
   const latest=await stripe.accounts.retrieve(account.stripe_account_id);
   await admin.from('mva_connected_accounts').update({
    charges_enabled:latest.charges_enabled===true,
    payouts_enabled:latest.payouts_enabled===true,
    details_submitted:latest.details_submitted===true,updated_at:new Date().toISOString()
   }).eq('owner_id',user.id);
   if(latest.charges_enabled&&latest.payouts_enabled)return response({connected:true},200,origin);
   const link=await stripe.v2.core.accountLinks.create({
     account:account.stripe_account_id,
     use_case:{
      type:'account_onboarding',
      account_onboarding:{
       configurations:['merchant'],
       refresh_url:checkoutUrl('owner-dashboard','connect_retry'),
       return_url:checkoutUrl('owner-dashboard','connect_return')
      }
     }
   });
   return response({url:link.url},200,origin);
  }
  return response({error:'Operação de pagamento desconhecida.'},400,origin);
 }catch(e){
  const msg=e instanceof Error?e.message:'Não foi possível continuar.';
  console.error('mva-stripe-gateway:',msg);
  return response({error:msg.startsWith('Stripe')?'Serviço financeiro indisponível. Tente mais tarde.':msg},400,origin);
 }
});
