import { useEffect, useState } from 'react';
import { ArrowRight, CreditCard, LoaderCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCoworking } from '../../context/CoworkingContext';

type Action = 'checkout_fiscal' | 'checkout_booking' | 'checkout_owner' | 'owner_portal' | 'connect_onboarding' | 'checkout_booking_plan' | 'booking_plan_portal';
type GatewayStatus = {
 checkout:boolean;fiscal:boolean;booking:boolean;owner:boolean;portal:boolean;connect:boolean;live:boolean;
 sandbox?:boolean;sandboxTester?:boolean;pixAvailable?:boolean;
};
const FEATURE:Record<Action,keyof Pick<GatewayStatus,'checkout'|'fiscal'|'booking'|'owner'|'portal'|'connect'>>={
 checkout_fiscal:'fiscal',checkout_booking:'booking',checkout_owner:'owner',
 owner_portal:'portal',connect_onboarding:'connect',checkout_booking_plan:'booking',booking_plan_portal:'portal'
};
export function StripeCheckoutAction({action,resourceId,planId,label,className=''}:{
 action:Action;resourceId?:string;planId?:string;label?:string;className?:string;
}){
 const {currentUser,setAuthModalOpen,setAuthModalTab}=useCoworking();
 const [status,setStatus]=useState<GatewayStatus|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [connected,setConnected]=useState(false);
 useEffect(()=>{
  let cancelled=false;
  void supabase.functions.invoke('mva-stripe-gateway',{body:{action:'status'}})
    .then(({data,error})=>{
      if(cancelled)return;
      if(error||!data||data.error){setStatus(null);return}
      setStatus(data as GatewayStatus);
    }).catch(()=>{if(!cancelled)setStatus(null)});
  return()=>{cancelled=true};
 },[action,currentUser?.id]);
 const enabled=!!status?.[FEATURE[action]];

 const trigger=async()=>{
  if(!currentUser){setAuthModalTab('login');setAuthModalOpen(true);return}
  if(!enabled||busy)return;
  setBusy(true);setError('');
  try{
   const payload:Record<string,unknown>={action};
   if(action==='checkout_fiscal')payload.applicationId=resourceId;
   if(action==='checkout_booking')payload.bookingId=resourceId;
   if(action==='checkout_owner'||action==='checkout_booking_plan')payload.planId=planId;
   const {data,error:invokeError}=await supabase.functions.invoke('mva-stripe-gateway',{body:payload});
   if(invokeError||data?.error){
     const ctx=invokeError?.context as Response|undefined;
     let message=typeof data?.error==='string'?data.error:'Não foi possível abrir o Stripe.';
     if(ctx){try{const reply=await ctx.json();if(typeof reply?.error==='string')message=reply.error}catch{}}
     throw new Error(message);
   }
   if(data?.connected===true){setConnected(true);return}
   if(typeof data?.url!=='string')throw new Error('Link de pagamento indisponível.');
   const target=new URL(data.url);
   if(target.protocol!=='https:'||!(target.hostname==='stripe.com'||target.hostname.endsWith('.stripe.com')))
     throw new Error('Destino do pagamento não reconhecido.');
   window.location.assign(target.href);
  }catch(e){setError(e instanceof Error?e.message:'O pagamento não pôde ser iniciado.')}
  finally{setBusy(false)}
 };
 const defaultLabels:Record<Action,string>={
  checkout_fiscal:'Pagar com Stripe',checkout_booking:'Pagar reserva com Stripe',
  checkout_owner:'Assinar este plano',owner_portal:'Gerenciar assinatura',
  connect_onboarding:'Conectar recebimentos Stripe',
  checkout_booking_plan:'Assinar plano de atendimento',booking_plan_portal:'Gerenciar meu plano de atendimento'
 };
 return <div className="min-w-0 space-y-2">
   {connected&&<p role="status" className="rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">A conta está preparada para receber pagamentos.</p>}
   <button type="button" onClick={()=>void trigger()} disabled={!enabled||busy||connected}
     className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition-colors ${enabled?'mva-payment-action bg-[#cf581f] text-white hover:bg-[#ad4210]':'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-600'} disabled:opacity-75 ${className}`}>
     {busy?<LoaderCircle className="h-4 w-4 animate-spin"/>:<CreditCard className="h-4 w-4"/>}
     {busy?'Conectando ao Stripe…':!enabled?(status?.sandbox?'Indisponível para esta conta (teste)':'Pagamento ainda indisponível'):(label||defaultLabels[action])+(status?.sandbox?' (teste)':'')}
     {enabled&&!busy&&<ArrowRight className="h-4 w-4"/>}
   </button>
   {enabled&&action==='checkout_fiscal'&&status?.pixAvailable&&<p role="status" className="flex items-start gap-1.5 text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-200">
     <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0"/>Pix e cartão disponíveis no Stripe. Se escolher Pix, aguarde a confirmação bancária antes de considerar o pagamento concluído.
   </p>}
   {enabled&&status?.sandbox&&<p role="status" className="flex items-start gap-1.5 text-[11px] leading-relaxed text-sky-800 dark:text-sky-200">
      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0"/>Sandbox Stripe para administradores: não há cobrança real.
   </p>}
   {!enabled&&<p role="status" className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
     <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0"/>
     {!status
       ? 'Não foi possível consultar o gateway Stripe. Atualize a página ou tente novamente.'
       : status.sandbox
       ? 'O Stripe está em modo de teste: somente contas administradoras autenticadas podem iniciar um pagamento simulado. Nenhuma cobrança real será feita.'
       : 'O pagamento ainda não foi liberado pela MVA. Nenhuma cobrança será realizada.'}
   </p>}
   {error&&<p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{error}</p>}
  </div>;
}
