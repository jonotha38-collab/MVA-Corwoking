import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Building2, CalendarDays, Check, CheckCircle2, ClipboardList, Clock3, FileClock, FileText, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { useCoworking } from '../../context/CoworkingContext';
import { supabase } from '../../lib/supabase';
import { FISCAL_PLANS, type FiscalPlanId } from '../../lib/fiscal-payment';
import { requiredBusinessDocuments, type BusinessDetails, type FiscalDocumentKind } from '../../lib/fiscal-intake';
import { FiscalCheckout } from '../payments/FiscalCheckout';
import { StripeCheckoutAction } from '../payments/StripeCheckoutAction';
import { fiscalSteps, type FiscalMilestone } from '../../lib/fiscal-progress';

type Status='submitted'|'under_review'|'approved'|'rejected';
type Application={
 id:string;company_name:string;cnpj:string;plan_id:FiscalPlanId;term_months:1|12;transfer_from:string;
 status:Status;review_notes:string;created_at:string;reviewed_at:string|null;
 applicant_type:'legacy'|'pf'|'pj';intake_details:unknown;
};
type Order={resource_id:string;status:string;livemode:boolean;paid_at:string|null};
type Contract={id:string;application_id:string|null;status:string;payment_status:string;payment_is_live:boolean;formalized_at:string|null;renewal_date:string};
type Doc={request_id:string|null;document_kind:FiscalDocumentKind|null;signer_index:number|null};
const readableDate=(s:string)=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:'America/Maceio'}).format(new Date(s));
const nowDate=()=>{
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Maceio',day:'2-digit',month:'2-digit',year:'numeric'})
  .formatToParts(new Date()).reduce<Record<string,string>>((acc,p)=>({...acc,[p.type]:p.value}),{});
 return parts.year+'-'+parts.month+'-'+parts.day;
};
function Stage({stage,index}:{stage:FiscalMilestone;index:number}){
 const Icon=stage.state==='done'?Check:stage.state==='problem'?XCircle:stage.state==='current'?Clock3:FileClock;
 const style=stage.state==='done'?'border-emerald-300 bg-emerald-50 text-emerald-800':stage.state==='problem'?'border-rose-300 bg-rose-50 text-rose-800':stage.state==='current'?'border-orange-400 bg-orange-50 text-orange-900':'border-slate-200 bg-slate-50 text-slate-500';
 return <li className="relative flex gap-4 pb-5 last:pb-0">
  {index<4&&<span aria-hidden className="absolute left-[21px] top-10 bottom-0 w-px bg-slate-200"/>}
  <div className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${style}`}>
   <Icon className="h-5 w-5" aria-hidden/>
  </div>
  <div className="min-w-0 flex-1 pt-0.5">
   <div className="flex flex-wrap items-start justify-between gap-2">
    <h3 className="text-sm font-bold text-navy-950">{stage.title}</h3>
    {stage.date&&<span className="text-[11px] font-medium text-slate-500">{readableDate(stage.date)}</span>}
   </div>
   <p className="mt-1 text-xs leading-5 text-slate-600">{stage.description}</p>
  </div>
 </li>;
}
export function FiscalStatusView(){
 const {currentUser,setActiveTab}=useCoworking();
 const [applications,setApplications]=useState<Application[]>([]);
 const [orders,setOrders]=useState<Order[]>([]);
 const [contracts,setContracts]=useState<Contract[]>([]);
 const [documents,setDocuments]=useState<Doc[]>([]);
 const [selected,setSelected]=useState<string|null>(null);
 const [checkout,setCheckout]=useState<Application|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [lastSync,setLastSync]=useState('');
 const refresh=useCallback(async()=>{
  if(!currentUser)return;
  setLoading(true);setError('');
  const [a,o,c,d]=await Promise.all([
   supabase.from('fiscal_applications').select('id,company_name,cnpj,plan_id,term_months,transfer_from,status,review_notes,created_at,reviewed_at,applicant_type,intake_details').eq('user_id',currentUser.id).order('created_at',{ascending:false}),
   supabase.from('mva_checkout_orders').select('resource_id,status,livemode,paid_at').eq('kind','fiscal').eq('user_id',currentUser.id).order('created_at',{ascending:false}),
   supabase.from('fiscal_contracts').select('id,application_id,status,payment_status,payment_is_live,formalized_at,renewal_date').eq('user_id',currentUser.id),
   supabase.from('fiscal_private_documents').select('request_id,document_kind,signer_index').not('request_id','is',null)
  ]);
  if(a.error||o.error||c.error||d.error){
   setError('Não foi possível consultar o andamento. Verifique sua conexão e tente novamente.');
  }else{
   setApplications((a.data||[]) as Application[]);
   setOrders((o.data||[]) as Order[]);
   setContracts((c.data||[]) as Contract[]);
   setDocuments((d.data||[]) as Doc[]);
   setLastSync(new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Maceio',hour:'2-digit',minute:'2-digit'}).format(new Date()));
  }
  setLoading(false);
 },[currentUser?.id]);
 useEffect(()=>{void refresh()},[refresh]);
 useEffect(()=>{
  if(!currentUser)return;
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh()},45000);
  const visible=()=>{if(document.visibilityState==='visible')void refresh()};
  document.addEventListener('visibilitychange',visible);
  return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
 },[refresh,currentUser?.id]);
 const app=useMemo(()=>applications.find(a=>a.id===selected)||applications[0]||null,[applications,selected]);
 const order=app?orders.find(o=>o.resource_id===app.id && o.livemode):null;
 const contract=app?contracts.find(c=>c.application_id===app.id):null;
 const paid=order?.status==='paid'&&order.livemode===true;
 const active=!!(contract&&contract.status==='ativo'&&contract.payment_status==='paid'&&contract.payment_is_live&&contract.renewal_date>=nowDate());
 const expired=!!(contract&&contract.status==='ativo'&&contract.payment_status==='paid'&&contract.payment_is_live&&contract.renewal_date<nowDate());
 const blockedPayment=order?.status==='refunded'||order?.status==='disputed';
 const appDocs=app?documents.filter(d=>d.request_id===app.id):[];
 const missing=app?.applicant_type==='pj'?requiredBusinessDocuments(app.intake_details as BusinessDetails)
  .filter(req=>!appDocs.some(d=>d.document_kind===req.kind&&d.signer_index===req.signerIndex)):[];
 const steps=app?fiscalSteps(app,!!paid,active,expired):[];
 const current=steps.find(s=>s.state==='problem'||s.state==='current')||steps[steps.length-1];
 return <section className="mx-auto max-w-6xl space-y-6 pb-14" aria-labelledby="fiscal-progress-title">
  <header className="relative overflow-hidden rounded-[22px] border border-navy-900 bg-navy-950 px-5 py-7 text-white sm:px-8 sm:py-9">
   <div className="absolute inset-y-0 right-0 hidden w-1/3 opacity-10 md:block" aria-hidden>
    <Building2 className="absolute -right-10 top-0 h-64 w-64 stroke-[0.6]"/>
   </div>
   <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
    <div className="max-w-2xl">
     <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-orange-300"><ClipboardList className="h-4 w-4"/> Central do cliente</p>
     <h1 id="fiscal-progress-title" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Acompanhar endereço fiscal</h1>
     <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Veja em qual etapa sua solicitação está, confira pendências e saiba o que fazer a seguir. Sem precisar procurar pelo pedido em outras páginas.</p>
    </div>
    <button type="button" onClick={()=>void refresh()} disabled={loading}
     className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-xs font-bold text-white hover:bg-white/15 disabled:opacity-60">
     <RefreshCw className="h-4 w-4"/>Atualizar andamento
    </button>
   </div>
  </header>
  {!currentUser?<div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-navy-900">Entre na sua conta para acompanhar solicitações vinculadas ao seu cadastro.</div>:
  error?<div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
    <p className="flex items-center gap-2"><AlertCircle className="h-4 w-4"/>{error}</p>
    <button type="button" onClick={()=>void refresh()} className="rounded-lg bg-white px-3 py-2 font-semibold">Tentar novamente</button>
   </div>:
  loading&&applications.length===0?<p role="status" className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">Carregando suas solicitações…</p>:
  applications.length===0?<div className="flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
    <FileText className="h-8 w-8 text-orange-600"/>
    <h2 className="text-lg font-bold text-navy-950">Você ainda não tem solicitações.</h2>
    <p className="max-w-xl text-sm text-slate-600">Escolha um plano de endereço comercial ou fiscal e envie seus dados para iniciar a análise.</p>
    <button type="button" onClick={()=>setActiveTab('fiscal')} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-navy-950 px-4 py-3 text-sm font-semibold text-white">Conhecer os planos<ArrowRight className="h-4 w-4"/></button>
   </div>:<>
    <div className="grid gap-5 lg:grid-cols-[minmax(240px,0.76fr)_minmax(0,1.65fr)]">
     <aside className="space-y-3" aria-label="Suas solicitações">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
       <h2 className="text-sm font-bold text-navy-950">Minhas solicitações</h2>
       <span className="text-xs text-slate-600">{applications.length} {applications.length===1?'pedido':'pedidos'}</span>
      </div>
      <div className="space-y-2">
       {applications.map(a=>{
        const aOrder=orders.find(o=>o.resource_id===a.id&&o.status==='paid'&&o.livemode);
        const aContract=contracts.find(c=>c.application_id===a.id&&c.status==='ativo'&&c.payment_status==='paid'&&c.payment_is_live);
        const label=a.status==='rejected'?'Rejeitado':aContract&&aContract.renewal_date<nowDate()?'Vigência encerrada':aContract?'Formalizado':aOrder?'Pagamento confirmado':a.status==='approved'?'Aguardando pagamento':a.status==='under_review'?'Em análise':'Recebido';
        return <button type="button" key={a.id} onClick={()=>setSelected(a.id)} aria-pressed={app?.id===a.id}
         className={`w-full rounded-2xl border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 ${app?.id===a.id?'border-orange-500 bg-white shadow-[0_3px_18px_rgba(16,40,64,.08)]':'border-slate-200 bg-white hover:border-orange-300'}`}>
         <div className="flex items-start justify-between gap-3">
          <span className="min-w-0 break-words text-sm font-bold text-navy-950">{a.company_name}</span>
          {app?.id===a.id&&<Check className="h-4 w-4 shrink-0 text-orange-600"/>}
         </div>
         <p className="mt-1 text-xs text-slate-600">{FISCAL_PLANS[a.plan_id]?.name||'Endereço fiscal'} · {a.term_months===1?'1 mês':'12 meses'}</p>
         <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${a.status==='rejected'||aContract&&aContract.renewal_date<nowDate()?'bg-rose-50 text-rose-800':aContract?'bg-emerald-50 text-emerald-800':a.status==='approved'?'bg-orange-50 text-orange-900':'bg-slate-100 text-slate-700'}`}>{label}</span>
        </button>;
       })}
      </div>
     </aside>
     {app&&<article className="min-w-0 space-y-5 rounded-[22px] border border-slate-200 bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5">
       <div>
        <p className="text-[11px] font-bold uppercase tracking-[.1em] text-orange-700">Acompanhamento da solicitação</p>
        <h2 className="mt-2 break-words text-xl font-semibold text-navy-950">{app.company_name}</h2>
        <p className="mt-1 text-xs text-slate-600">Enviado em {readableDate(app.created_at)} · {FISCAL_PLANS[app.plan_id]?.name} · {app.term_months===1?'Mensal':'Anual'}</p>
       </div>
       <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${active?'bg-emerald-100 text-emerald-800':expired||app.status==='rejected'?'bg-rose-100 text-rose-800':'bg-orange-50 text-orange-900'}`}>
        {active?'Ativo':expired?'Vigência encerrada':app.status==='rejected'?'Ajustes necessários':app.status==='approved'?'Aprovado':'Em andamento'}
       </span>
      </div>
      <div className={`rounded-xl border p-4 ${app.status==='rejected'||expired?'border-rose-200 bg-rose-50':active?'border-emerald-200 bg-emerald-50':'border-orange-200 bg-orange-50'}`}>
       <p className="text-[11px] font-bold uppercase tracking-[.08em] text-slate-600">Situação atual</p>
       <p className="mt-1 text-sm font-bold text-navy-950">{current?.title}</p>
       <p className="mt-1 text-xs leading-5 text-slate-700">{current?.description}</p>
       {app.review_notes&&<div className="mt-3 border-t border-black/10 pt-3 text-xs leading-5 text-slate-700">
        <strong>Parecer da equipe MVA: </strong>{app.review_notes}
       </div>}
      </div>
      {missing.length>0&&app.status!=='approved'&&<div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
       <p className="flex items-center gap-2 text-xs font-bold text-amber-900"><AlertCircle className="h-4 w-4"/>Documentos societários pendentes</p>
       <p className="mt-2 text-xs leading-5 text-amber-900">{missing.join(', ')}.</p>
      </div>}
      <div>
       <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy-950"><CalendarDays className="h-4 w-4 text-orange-600"/>Etapas do processo</h3>
       <ol className="list-none p-0">{steps.map((step,i)=><Stage key={step.title} stage={step} index={i}/>)}</ol>
      </div>
      <div className="border-t border-slate-200 pt-5">
       <p className="mb-3 text-xs font-semibold text-navy-950">Próxima ação</p>
       {active?<div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900"><CheckCircle2 className="h-4 w-4"/>Endereço autorizado até {contract?.renewal_date.split('-').reverse().join('/')}.</div>:
        expired?<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">A vigência foi encerrada. Consulte a equipe MVA para solicitar a renovação antes de utilizar o endereço.</p>:
        app.status==='rejected'?<button type="button" onClick={()=>setActiveTab('fiscal')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-navy-950 px-4 py-3 text-sm font-semibold text-white">Ver condições para novo pedido<ArrowRight className="h-4 w-4"/></button>:
        app.status==='approved'&&!paid&&!blockedPayment?<StripeCheckoutAction action="checkout_fiscal" resourceId={app.id} label="Continuar para pagamento seguro"/>:
        app.status==='approved'&&blockedPayment?<p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">O pagamento foi revertido ou contestado. Consulte a MVA antes de prosseguir.</p>:
        paid?<p className="rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-700">Pagamento recebido. Aguarde a conferência e a assinatura dos documentos pela equipe MVA.</p>:
        missing.length>0?<button type="button" onClick={()=>setCheckout(app)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-navy-950 px-4 py-3 text-sm font-bold text-white">Enviar documentos pendentes<ArrowRight className="h-4 w-4"/></button>:
        <p className="rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-700">Nenhuma ação é necessária agora. Você pode acompanhar a análise nesta página.</p>}
       <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/>A aprovação e o pagamento não liberam automaticamente o uso do endereço. A autorização depende da formalização pela MVA.</p>
      </div>
     </article>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
     <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5"/>Última atualização: {lastSync||'a consultar'} · horário de Brasília (UTC−3)</span>
     <button type="button" onClick={()=>setActiveTab('fiscal')} className="font-semibold text-orange-700 hover:underline">Ver planos e informações do endereço fiscal</button>
    </div>
   </>}
   {checkout&&<FiscalCheckout planId={checkout.plan_id} initialTerm={checkout.term_months}
    transfer={checkout.term_months===12&&checkout.transfer_from.trim().length>=3} applicationId={checkout.id}
    onClose={()=>{setCheckout(null);void refresh()}} onPaid={()=>{setCheckout(null);void refresh()}}/>}
 </section>;
}
