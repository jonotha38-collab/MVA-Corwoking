import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, CheckCircle2, FileCheck2, Info, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { useCoworking } from '../../context/CoworkingContext';
import { usePreferences } from '../../lib/preferences';
import { EXCELLENCE_ACCOUNTING_CONSULTATION, getPlan, quotePlan, money, type FiscalPlanId, type FiscalTermMonths } from '../../lib/fiscal-payment';
import { supabase } from '../../lib/supabase';
import { matchesFiscalApplication } from '../../lib/fiscal-application-flow';
import { MvaLogo } from '../common/MvaLogo';
import { Dialog } from '../ui/Dialog';
import { StripeCheckoutAction } from './StripeCheckoutAction';
import { FiscalApplicantForm, FiscalMissingDocuments, type CreatedFiscalApplication } from '../fiscal/FiscalApplicantForm';

type Application={
 id:string;company_name:string;plan_id:string;term_months:number;transfer_from:string;
 status:'submitted'|'under_review'|'approved'|'rejected';
 applicant_type:'legacy'|'pf'|'pj';intake_details:unknown;
};
export function FiscalCheckout({planId,initialTerm=12,transfer=false,applicationId,onClose}:{
 planId:FiscalPlanId;initialTerm?:FiscalTermMonths;transfer?:boolean;applicationId?:string;
 resumeOrderId?:string;onClose:()=>void;onPaid:()=>void;
}){
 const {currentUser,setAuthModalOpen,setAuthModalTab,setActiveTab}=useCoworking();
 const {language}=usePreferences();
 const plan=getPlan(planId);
 const quote=quotePlan(plan,initialTerm,transfer);
 const [applications,setApplications]=useState<Application[]>([]);
 const [loading,setLoading]=useState(true);
 const [paymentStatus,setPaymentStatus]=useState('');
 const [paymentIsLive,setPaymentIsLive]=useState(false);
 const matchesSelection=(a:Application)=>matchesFiscalApplication(a,{planId,termMonths:initialTerm,transfer,applicationId});
 useEffect(()=>{
  let live=true;
  if(!currentUser){setLoading(false);return}
  setPaymentStatus('');setPaymentIsLive(false);
  void supabase.from('fiscal_applications')
   .select('id,company_name,plan_id,term_months,transfer_from,status,applicant_type,intake_details')
   .eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(40)
   .then(async({data,error})=>{
    if(!live)return;
    if(error){setLoading(false);return}
    const rows=(data||[]) as Application[];
    setApplications(rows);
    const best=rows.find(a=>a.status==='approved'&&matchesSelection(a));
    if(best){
      const {data:order}=await supabase.from('mva_checkout_orders').select('status,livemode')
         .eq('kind','fiscal').eq('resource_id',best.id).maybeSingle();
      if(live&&order?.status){setPaymentStatus(order.status);setPaymentIsLive(order.livemode===true);}
    }
    if(live)setLoading(false);
   });
  return()=>{live=false};
 },[currentUser?.id,planId,initialTerm,transfer,applicationId]);
 const match=useMemo(()=>applications.find(a=>a.status==='approved'&&matchesSelection(a)),[applications,planId,initialTerm,transfer,applicationId]);
 const other=applications.find(matchesSelection);
 const contact='mailto:contato@mvacoworking.com.br?subject='+encodeURIComponent('Análise para contratação · '+plan.name)
   +'&body='+encodeURIComponent('Olá! Gostaria de solicitar análise para o '+plan.name+' ('+
   initialTerm+' meses'+(transfer?' com transferência de endereço':'')+').');
 const startLogin=()=>{setAuthModalTab('login');setAuthModalOpen(true)};
 return <Dialog titleId="mva-fiscal-checkout-title" onClose={onClose} className="checkout-wide">
  <header className="checkout-heading">
    <div className="checkout-brand"><MvaLogo label="MVA Coworking" className="h-auto w-[66px] md:w-[83px]" /><span>Contratação de endereço</span></div>
    <button type="button" aria-label="Fechar checkout" className="checkout-close" onClick={onClose}><X size={20}/></button>
  </header>
  <div className="checkout-layout">
   <aside className="checkout-summary">
     <span className="checkout-kicker">SEU PLANO MVA</span>
     <h2 id="mva-fiscal-checkout-title">Contratação com transparência.</h2>
     <p>Confira o valor do plano antes de avançar ao pagamento hospedado no Stripe.</p>
     <div className="checkout-product"><div className="checkout-product-icon"><Building2 size={22}/></div>
       <div><span>Plano selecionado</span><h3>{plan.name}</h3></div></div>
     <dl className="checkout-prices">
       <div><dt>Vigência</dt><dd>{initialTerm===12?'12 meses':'1 mês'}</dd></div>
       <div><dt>Valor normal</dt><dd>{money(quote.fullAmount,language)}</dd></div>
       {quote.discount>0&&<div><dt>{quote.freeMonths>0?'Campanha de transferência (4 meses)':'Desconto anual de 10%'}</dt><dd>− {money(quote.discount,language)}</dd></div>}
       <div className="checkout-total"><dt>Valor total</dt><dd>{money(quote.amount,language)}</dd></div>
     </dl>
     <p className="checkout-billing-note">Cobrança única para o período escolhido. Não é assinatura com renovação automática.</p>
     {plan.bonusHours>0&&<div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs leading-5 text-orange-950">
      <strong>MVA Excellence:</strong> 2 horas de bônus por mês em sala de atendimento para até 3 pessoas nos três primeiros meses após a formalização, durante a vigência do contrato. <strong>Não acumulativas:</strong> horas não utilizadas expiram ao fim de cada mês contratual.
     </div>}
     {plan.id==='mva_excellence'&&<p className="checkout-billing-note">{EXCELLENCE_ACCOUNTING_CONSULTATION}</p>}
     {plan.roomDiscountPercent>0&&<p className="checkout-billing-note">Durante a vigência do contrato, você tem {plan.roomDiscountPercent}% de desconto na reserva de salas de reunião próprias da MVA.</p>}
     <div className="checkout-security"><LockKeyhole size={16}/><span>O Stripe processa os dados de pagamento. A MVA não coleta números de cartão ou credenciais bancárias.</span></div>
   </aside>
   <section className="checkout-content">
    <div className="checkout-form space-y-5">
     <div className="checkout-section-title"><span className="checkout-icon"><ShieldCheck size={20}/></span>
       <div><h3>Pagamento e liberação</h3><p>Contratação de endereço fiscal sujeita à análise da empresa, assinatura do contrato e pagamento confirmado.</p></div></div>
     {loading&&<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600" role="status">Consultando a situação da contratação…</p>}
     {!currentUser&&<div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
       <p className="text-sm font-semibold text-navy-900">Entre para continuar.</p>
       <p className="text-xs leading-relaxed text-slate-600">A MVA utiliza sua conta para relacionar a contratação aos documentos e pagamentos da empresa.</p>
       <button onClick={startLogin} type="button" className="action-primary checkout-submit">Entrar na minha conta</button>
     </div>}
     {currentUser&&!loading&&!match&&<div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
       <div className="flex items-start gap-2"><Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"/>
        <div><p className="text-sm font-bold text-amber-900">Análise necessária antes de pagar</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-800">
          {other?.status==='submitted'||other?.status==='under_review'
           ? 'Já existe uma solicitação para este serviço. A equipe da MVA precisa concluir a avaliação.'
           : other?.status==='rejected'
           ? 'Há pendências na análise desta empresa. Consulte o parecer da equipe MVA.'
           : 'A contratação precisa de avaliação documental e de elegibilidade. Você não será cobrado enquanto essa etapa estiver pendente.'}
        </p></div></div>
       {(!other||other.status==='rejected')&&<FiscalApplicantForm
          key={planId+'-'+initialTerm+'-'+String(transfer)}
          account={{id:currentUser.id,name:currentUser.name||'',email:currentUser.email||''}}
          planId={planId} term={initialTerm} transfer={transfer}
          onSubmitted={app=>setApplications(prev=>[app as Application,...prev])}/>}
       {other?.applicant_type==='pj'&&(other.status==='submitted'||other.status==='under_review')&&
          <FiscalMissingDocuments application={other as unknown as CreatedFiscalApplication} accountId={currentUser.id}/>}
       {(other?.status==='submitted'||other?.status==='under_review'||other?.status==='rejected')&&<a href={contact} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-xs font-bold text-navy-900">Falar com a equipe MVA</a>}
       <button type="button" onClick={()=>{onClose();setActiveTab('fiscal-status')}}
        className="ml-3 text-xs font-semibold text-amber-900 underline underline-offset-2">Ver minhas solicitações</button>
     </div>}
     {currentUser&&!loading&&match&&<div className="space-y-4">
       <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
         <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"/>
         <div><strong className="text-sm text-emerald-900">Contratante elegível para a contratação</strong>
           <p className="mt-1 text-xs leading-relaxed text-emerald-800">{match.company_name}. Os documentos finais dependem do contrato e da confirmação financeira.</p></div>
       </div>
       <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-700">
        <strong>Formas de pagamento:</strong> o Stripe apresenta as opções habilitadas para sua compra. Pix, quando disponível, gera QR Code ou código copia e cola. Pagar ou visualizar o QR Code não libera o endereço: o pagamento precisa ser confirmado e a documentação aprovada pela MVA.
       </div>
       {paymentStatus==='paid'?<div role="status" className="flex items-start gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          <CheckCircle2 className="h-5 w-5 shrink-0"/>{paymentIsLive?'Pagamento real confirmado. A MVA concluirá a formalização antes de autorizar o endereço.':'Pagamento de teste confirmado: nenhuma cobrança real ou liberação de endereço foi realizada.'}
        </div>:<StripeCheckoutAction action="checkout_fiscal" resourceId={match.id} label="Continuar para pagamento seguro"/>}
     </div>}
     <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
      <ShieldCheck className="h-4 w-4 shrink-0"/>A escolha do plano não autoriza o uso do endereço e a compra não garante alvará ou inscrição estadual.</p>
     <button type="button" className="checkout-link inline-flex items-center gap-2" onClick={onClose}><ArrowLeft size={16}/>Voltar aos planos</button>
    </div>
   </section>
  </div>
 </Dialog>;
}
