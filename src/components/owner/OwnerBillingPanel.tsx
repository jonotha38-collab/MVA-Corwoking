import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, CreditCard, Landmark, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCoworking } from '../../context/CoworkingContext';
import { StripeCheckoutAction } from '../payments/StripeCheckoutAction';

type Plan={id:string;label:string;monthly_cents:number;max_spaces:number;active:boolean;display_order:number};
type Subscription={plan_id:string;status:string;current_period_end:string|null;livemode:boolean;stripe_subscription_id:string|null;stripe_customer_id:string|null};
type ConnectedAccount={charges_enabled:boolean;payouts_enabled:boolean;details_submitted:boolean};
const price=(value:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100);
const descriptions:Record<string,string>={
 essencial:'Para quem está começando a anunciar salas.',
 profissional:'Mais espaço para operações em crescimento.',
 business:'Estrutura para coworkings com mais ambientes.'
};
export function OwnerBillingPanel(){
 const {currentUser}=useCoworking();
 const [plans,setPlans]=useState<Plan[]>([]);
 const [subscription,setSubscription]=useState<Subscription|null>(null);
 const [account,setAccount]=useState<ConnectedAccount|null>(null);
 const [loading,setLoading]=useState(true);
 const [sandboxCheckoutReady,setSandboxCheckoutReady]=useState(false);
 const load=useCallback(async()=>{
  if(!currentUser){setLoading(false);return}
  const [p,s,a,gateway]=await Promise.all([
   supabase.from('mva_owner_plans').select('id,label,monthly_cents,max_spaces,active,display_order').order('display_order'),
   supabase.from('mva_owner_subscriptions').select('plan_id,status,current_period_end,livemode,stripe_subscription_id,stripe_customer_id')
     .eq('owner_id',currentUser.id).maybeSingle(),
   supabase.from('mva_connected_accounts').select('charges_enabled,payouts_enabled,details_submitted')
     .eq('owner_id',currentUser.id).maybeSingle(),
   supabase.functions.invoke('mva-stripe-gateway',{body:{action:'status'}})
  ]);
  if(!p.error)setPlans((p.data||[]) as Plan[]);
  if(!s.error)setSubscription((s.data||null) as Subscription|null);
  if(!a.error)setAccount((a.data||null) as ConnectedAccount|null);
  if(!gateway.error)setSandboxCheckoutReady(gateway.data?.sandbox===true
    &&gateway.data?.sandboxTester===true&&gateway.data?.owner===true);
  setLoading(false);
 },[currentUser?.id]);
 useEffect(()=>{void load();const refresh=()=>{if(document.visibilityState==='visible')void load()};document.addEventListener('visibilitychange',refresh);return()=>document.removeEventListener('visibilitychange',refresh)},[load]);
 // Returning from Stripe onboarding does not prove the account is ready.
 // Recheck verified capability flags on the server before updating the display.
 useEffect(()=>{
  if(!currentUser||currentUser.accountType!=='coworking_owner')return;
  const marker=new URLSearchParams(window.location.search).get('stripe_checkout');
  if(marker!=='connect_return'&&marker!=='connect_retry')return;
  void supabase.functions.invoke('mva-stripe-gateway',{body:{action:'connect_status'}})
   .then(()=>load()).catch(()=>{/* The link can be resumed below. */});
 },[currentUser?.id,load]);
 if(!currentUser||currentUser.accountType!=='coworking_owner')return null;
 const active=subscription?.status==='active'||subscription?.status==='trialing';
 const connected=!!account?.charges_enabled&&!!account?.payouts_enabled;
 return <section className="space-y-5" aria-labelledby="owner-billing-heading">
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#192b40] sm:p-7">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div><span className="text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-300">MVA Parceiros</span>
     <h2 id="owner-billing-heading" className="mt-2 text-xl font-bold text-navy-900 dark:text-slate-100">Mensalidade do seu coworking</h2>
     <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-600 dark:text-slate-300">
      Planos mensais para anunciar e gerir espaços. Sem comissão da MVA por reserva; tarifas do processador de pagamento são separadas.</p></div>
    <button type="button" onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-navy-900 dark:border-slate-600 dark:text-slate-100"><RefreshCw className="h-4 w-4"/>Atualizar</button>
   </div>
   {sandboxCheckoutReady&&<p role="status" className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs font-semibold text-sky-900">Sandbox Stripe para administradores: cartões fictícios, nenhuma cobrança real ou liberação de recursos pagos.</p>}
   {subscription&&<div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-600 dark:bg-[#233850] dark:text-slate-100">
    <BadgeCheck className="h-4 w-4 text-orange-600 dark:text-orange-300"/>
    Plano {plans.find(p=>p.id===subscription.plan_id)?.label||subscription.plan_id} · <strong>{active?'Ativo':subscription.status}</strong>
    {subscription.current_period_end&&<span>· Vencimento {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}</span>}
    {!subscription.livemode&&<span>· Ambiente de teste</span>}
   </div>}
   {loading?<p className="mt-4 text-xs text-slate-500">Carregando os planos…</p>:<div className="mt-5 grid gap-4 md:grid-cols-3">
     {plans.map(p=><article key={p.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-600 dark:bg-[#233850]">
       <span className="text-[11px] font-bold uppercase tracking-widest text-orange-700 dark:text-orange-300">{p.label}</span>
       <p className="mt-3 text-2xl font-bold text-navy-900 dark:text-white">{price(p.monthly_cents)}<span className="ml-1 text-xs font-medium text-slate-500 dark:text-slate-300">/mês</span></p>
       <p className="mt-2 text-xs font-bold text-navy-900 dark:text-slate-100">Até {p.max_spaces} espaços</p>
       <p className="mt-2 flex-1 text-xs leading-6 text-slate-600 dark:text-slate-300">{descriptions[p.id]||'Gerenciamento profissional de espaços.'}</p>
       {active?<div className="mt-4 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{subscription?.plan_id===p.id?'Seu plano atual':'Alterações pelo portal de assinaturas'}</div>
       :<div className="mt-4">{p.active||sandboxCheckoutReady?<StripeCheckoutAction action="checkout_owner" planId={p.id} label={(sandboxCheckoutReady?'Testar assinatura ':'Assinar ')+p.label}/>:<p className="rounded-xl border border-slate-200 p-3 text-center text-xs font-semibold text-slate-500 dark:border-slate-600 dark:text-slate-300">Plano em preparação</p>}</div>}
       {!p.active&&<p className="mt-2 text-[11px] text-slate-500 dark:text-slate-300">Preço proposto; ainda não aprovado para cobrança real.</p>}
     </article>)}
   </div>}
   {subscription?.stripe_customer_id&&subscription?.stripe_subscription_id&&<div className="mt-4 max-w-sm"><StripeCheckoutAction action="owner_portal"/></div>}
   <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-300"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0"/>
    As assinaturas e seus limites só serão exigidos depois que a MVA publicar as condições, testar as cobranças e ativar essa regra. Anúncios atuais continuam preservados.</p>
  </div>
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#192b40] sm:p-7">
   <div className="flex items-start gap-3">
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"><Landmark className="h-5 w-5"/></span>
    <div><h3 className="text-base font-bold text-navy-900 dark:text-slate-100">Receber pagamentos das suas reservas</h3>
     <p className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">Cada coworking parceiro terá sua conta conectada ao Stripe para receber pagamentos diretamente, sem comissão da MVA. A própria Stripe realizará a verificação de identidade e dados bancários.</p></div>
   </div>
   <div className="mt-4 max-w-md space-y-2">
     {connected?<p className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300"><BadgeCheck className="h-4 w-4"/>Conta Stripe conectada e habilitada.</p>
      :<StripeCheckoutAction action="connect_onboarding" label="Conectar minha conta Stripe"/>}
   </div>
   <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-300"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/>
     Apenas uma conta habilitada para cobranças e repasses poderá receber pagamentos reais de reservas.</p>
  </div>
 </section>;
}
