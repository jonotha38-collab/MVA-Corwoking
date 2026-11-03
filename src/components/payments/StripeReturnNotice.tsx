import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, X } from 'lucide-react';
import { useCoworking } from '../../context/CoworkingContext';
import { supabase } from '../../lib/supabase';

type State='checking'|'paid'|'test'|'pending'|'canceled'|'connect';
export function StripeReturnNotice(){
 const {currentUser,activeTab}=useCoworking();
 const [params]=useState(()=>{
  const search=new URLSearchParams(window.location.search);
  return {returnType:search.get('stripe_checkout'),order:search.get('stripe_order')};
 });
 const [visible,setVisible]=useState(Boolean(params.returnType));
 const [state,setState]=useState<State>(params.returnType==='canceled'?'canceled'
   :params.returnType?.startsWith('connect')?'connect':'checking');
 useEffect(()=>{
  if(!params.returnType||params.returnType==='canceled'||params.returnType.startsWith('connect'))return;
  if(!currentUser){setState('pending');return}
  let mounted=true;
  const check=async()=>{
   if(params.order&&/^[0-9a-f-]{36}$/i.test(params.order)){
    const {data}=await supabase.from('mva_checkout_orders').select('status,livemode')
      .eq('id',params.order).eq('user_id',currentUser.id).maybeSingle();
    if(mounted)setState(data?.status==='paid'?(data?.livemode===true?'paid':'test'):'pending');
   }else if(activeTab==='owner-dashboard'){
    const {data}=await supabase.from('mva_owner_subscriptions').select('status,livemode')
     .eq('owner_id',currentUser.id).maybeSingle();
    if(mounted)setState(data?.status==='active'?(data?.livemode===true?'paid':'test'):'pending');
   }else if(mounted)setState('pending');
  };
  void check();
  return()=>{mounted=false};
 },[params.returnType,params.order,currentUser?.id,activeTab]);
 const dismiss=()=>{
  setVisible(false);
  const url=new URL(window.location.href);
  url.searchParams.delete('stripe_checkout');
  url.searchParams.delete('stripe_order');
  window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
 };
 if(!visible)return null;
 const success=state==='paid';
 const messages:Record<State,[string,string]>={
  checking:['Consultando pagamento','Estamos verificando a situação no banco de dados da MVA.'],
  paid:['Pagamento real confirmado pelo Stripe','O pagamento consta como confirmado. A prestação do serviço continua sujeita às condições e aprovações aplicáveis.'],
  test:['Pagamento de teste confirmado','Nenhum dinheiro real foi cobrado e nenhum serviço foi liberado por este pagamento de teste.'],
  pending:['Pagamento ainda não confirmado','O retorno à página não comprova a cobrança. Atualize o painel para consultar a confirmação enviada pelo Stripe.'],
  canceled:['Checkout interrompido','Você voltou da tela do Stripe. Nenhum pagamento novo foi confirmado nesta etapa.'],
  connect:['Cadastro Stripe em avaliação','Confira no painel do proprietário quando a conta estiver habilitada para cobranças e repasses.']
 };
 const [title,description]=messages[state];
 return <div role="status" className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 shadow-sm sm:p-5 ${success?'border-emerald-200 bg-emerald-50':'border-amber-200 bg-amber-50'}`}>
  {success?<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"/>:
    state==='checking'?<Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-800"/>:
    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-800"/>}
  <div className="min-w-0 flex-1"><p className={`text-sm font-bold ${success?'text-emerald-900':'text-amber-900'}`}>{title}</p>
    <p className={`mt-1 text-xs leading-relaxed ${success?'text-emerald-800':'text-amber-800'}`}>{description}</p></div>
  <button type="button" onClick={dismiss} aria-label="Dispensar aviso do Stripe" className="shrink-0 rounded-lg p-2 text-slate-600 hover:bg-black/5"><X className="h-4 w-4"/></button>
 </div>;
}
