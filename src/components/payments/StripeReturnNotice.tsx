import { useEffect, useState } from 'react';
import { useCoworking } from '../../context/CoworkingContext';
import { supabase } from '../../lib/supabase';
import { StatusNotice } from '../common/StatusNotice';
import type { StatusKind } from '../common/StatusBadge';

type State='checking'|'paid'|'test'|'pending'|'canceled'|'connect';
export function StripeReturnNotice(){
 const {currentUser,activeTab}=useCoworking();
 const [params]=useState(()=>{
  const search=new URLSearchParams(window.location.search);
  return {returnType:search.get('stripe_checkout'),order:search.get('stripe_order'),membership:search.get('stripe_membership')==='1'};
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
   }else if(params.membership){
    const {data}=await supabase.from('mva_booking_memberships').select('status,livemode,paid_period_end')
      .eq('user_id',currentUser.id).maybeSingle();
    const paid=data?.livemode===true&&data.status==='active'&&
      data.paid_period_end&&new Date(data.paid_period_end).getTime()>Date.now();
    if(mounted)setState(paid?'paid':'pending');
   }else if(activeTab==='owner-dashboard'){
    const {data}=await supabase.from('mva_owner_subscriptions').select('status,livemode')
     .eq('owner_id',currentUser.id).maybeSingle();
    if(mounted)setState(data?.status==='active'?(data?.livemode===true?'paid':'test'):'pending');
   }else if(mounted)setState('pending');
  };
  void check();
  let attempts=0;
  const timer=window.setInterval(()=>{
   attempts++;
   if(attempts>10){window.clearInterval(timer);return}
   void check();
  },2000);
  return()=>{mounted=false;window.clearInterval(timer)};
 },[params.returnType,params.order,params.membership,currentUser?.id,activeTab]);
 const dismiss=()=>{
  setVisible(false);
  const url=new URL(window.location.href);
  url.searchParams.delete('stripe_checkout');
  url.searchParams.delete('stripe_order');
  url.searchParams.delete('stripe_membership');
  window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
 };
 if(!visible)return null;
 const tones:Record<State,StatusKind>={
  checking:'waiting',paid:'approved',test:'info',pending:'waiting',canceled:'canceled',connect:'analysis'
 };
 const messages:Record<State,[string,string]>={
  checking:['Consultando pagamento','Estamos verificando a situação no banco de dados da MVA.'],
  paid:['Pagamento real confirmado pelo Stripe','O pagamento consta como confirmado. A prestação do serviço continua sujeita às condições e aprovações aplicáveis.'],
  test:['Pagamento de teste confirmado','Nenhum dinheiro real foi cobrado e nenhum serviço foi liberado por este pagamento de teste.'],
  pending:['Pagamento ainda não confirmado','O retorno à página não comprova a cobrança. Atualize o painel para consultar a confirmação enviada pelo Stripe.'],
  canceled:['Checkout interrompido','Você voltou da tela do Stripe. Nenhum pagamento novo foi confirmado nesta etapa.'],
  connect:['Cadastro Stripe em avaliação','Confira no painel do proprietário quando a conta estiver habilitada para cobranças e repasses.']
 };
 const [title,description]=messages[state];
 return <StatusNotice status={tones[state]} title={title} className="mb-6"
   onDismiss={dismiss} dismissLabel="Dispensar aviso do Stripe">{description}</StatusNotice>;
}
