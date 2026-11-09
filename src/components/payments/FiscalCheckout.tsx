import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, CheckCircle2, FileCheck2, Info, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { useCoworking } from '../../context/CoworkingContext';
import { usePreferences } from '../../lib/preferences';
import { getPlan, quotePlan, money, validCnpj, type FiscalPlanId, type FiscalTermMonths } from '../../lib/fiscal-payment';
import { supabase } from '../../lib/supabase';
import { Dialog } from '../ui/Dialog';
import { StripeCheckoutAction } from './StripeCheckoutAction';

type Application={
 id:string;company_name:string;plan_id:string;term_months:number;transfer_from:string;
 status:'submitted'|'under_review'|'approved'|'rejected';
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
 const [saving,setSaving]=useState(false);
 const [requestError,setRequestError]=useState('');
 const matchesSelection=(a:Application)=>
  a.plan_id===planId&&a.term_months===initialTerm
  &&(initialTerm!==12||(a.transfer_from.trim().length>=3)===transfer)
  &&(!applicationId||a.id===applicationId);
 const [termsAccepted,setTermsAccepted]=useState(false);
 const [company,setCompany]=useState({
   company_name:'',cnpj:'em abertura',cnae:'',
   responsible_name:'',contact_email:'',contact_phone:'',transfer_from:''
 });
 const change=(field:keyof typeof company,value:string)=>{
  setCompany(v=>({...v,[field]:value}));
  setRequestError('');
 };
 useEffect(()=>{
  let live=true;
  if(!currentUser){setLoading(false);return}
  setPaymentStatus('');setPaymentIsLive(false);
  void supabase.from('fiscal_applications')
   .select('id,company_name,plan_id,term_months,transfer_from,status')
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
 useEffect(()=>{
  if(currentUser)setCompany(v=>({...v,responsible_name:v.responsible_name||currentUser.name,
    contact_email:v.contact_email||currentUser.email}));
 },[currentUser?.id]);
 const submitApplication=async()=>{
  if(!currentUser||saving)return;
  const name=company.company_name.trim();
  const cnpj=company.cnpj.trim();
  const cnae=company.cnae.trim();
  const responsible=company.responsible_name.trim();
  const email=company.contact_email.trim();
  if(name.length<3||name.length>180){
   setRequestError('Informe a razão social com pelo menos 3 caracteres (máximo 180).');return;
  }
  if(!validCnpj(cnpj)){
   setRequestError('Informe um CNPJ válido ou escreva "em abertura" caso ainda não possua CNPJ.');return;
  }
  if(cnae.length<3||cnae.length>120){
   setRequestError('Informe a atividade econômica ou CNAE com pelo menos 3 caracteres (máximo 120).');return;
  }
  if(responsible.length<3||responsible.length>160){
   setRequestError('Informe o nome do responsável legal (3 a 160 caracteres).');return;
  }
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
   setRequestError('Informe um e-mail válido, por exemplo contato@empresa.com.br.');return;
  }
  if(transfer&&company.transfer_from.trim().length<3){
   setRequestError('Informe o endereço anterior para o desconto de transferência.');return;
  }
  if(!termsAccepted){setRequestError('Aceite as condições da solicitação.');return;}
  setSaving(true);setRequestError('');
  try{
   const {data,error}=await supabase.from('fiscal_applications').insert({
     user_id:currentUser.id,company_name:name,
     cnpj,cnae,responsible_name:responsible,
     contact_email:email,contact_phone:company.contact_phone.trim(),
     plan_id:planId,term_months:initialTerm,
     transfer_from:transfer?company.transfer_from.trim():'',
     terms_version:'2026-10-30'
   }).select('id,company_name,plan_id,term_months,transfer_from,status').single();
   if(error||!data)throw error||new Error('Nenhuma resposta.');
   setApplications(prev=>[data as Application,...prev]);
   setTermsAccepted(false);
  }catch(err){
   console.error('Erro ao registrar a solicitação fiscal',err);
   const code=(err as {code?:string})?.code;
   setRequestError(code==='42501'?
    'Não foi possível enviar: sua sessão não tem permissão. Entre novamente e tente outra vez.':
    code==='23505'?
    'Já existe uma solicitação semelhante. Consulte a área fiscal para acompanhar.':
    'Não foi possível registrar a solicitação. Verifique os campos e tente novamente.');
  }finally{setSaving(false);}
 };
 const match=useMemo(()=>applications.find(a=>a.status==='approved'&&matchesSelection(a)),[applications,planId,initialTerm,transfer,applicationId]);
 const other=applications.find(matchesSelection);
 const contact='mailto:contato@mvacoworking.com.br?subject='+encodeURIComponent('Análise para contratação · '+plan.name)
   +'&body='+encodeURIComponent('Olá! Gostaria de solicitar análise para o '+plan.name+' ('+
   initialTerm+' meses'+(transfer?' com transferência de endereço':'')+').');
 const startLogin=()=>{setAuthModalTab('login');setAuthModalOpen(true)};
 return <Dialog titleId="mva-fiscal-checkout-title" onClose={onClose} className="checkout-wide">
  <header className="checkout-heading">
    <div className="checkout-brand"><img src="/logo.png" alt="MVA Coworking"/><span>Contratação de endereço</span></div>
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
       {quote.discount>0&&<div><dt>Campanha de transferência</dt><dd>− {money(quote.discount,language)}</dd></div>}
       <div className="checkout-total"><dt>Valor total</dt><dd>{money(quote.amount,language)}</dd></div>
     </dl>
     <p className="checkout-billing-note">Cobrança única para o período escolhido. Não é assinatura com renovação automática.</p>
     <div className="checkout-security"><LockKeyhole size={16}/><span>Os dados do cartão são coletados pelo Stripe, nunca pela MVA.</span></div>
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
       {(!other||other.status==='rejected')&&<form className="space-y-3 rounded-xl border border-slate-200 bg-white p-4" onSubmit={e=>{e.preventDefault();void submitApplication()}}>
         <p className="text-xs font-bold text-navy-900">Dados essenciais para análise cadastral</p>
         <p className="text-[11px] leading-5 text-slate-600">Nenhum valor será cobrado nesta etapa. A MVA deve verificar a viabilidade do endereço antes de liberar o pagamento.</p>
         <div className="grid gap-3 sm:grid-cols-2">
           {([
             ['company_name','Razão social','Nome da empresa'],
             ['cnpj','CNPJ ou em abertura','em abertura'],
             ['cnae','Atividade / CNAE','Ex.: serviços administrativos'],
             ['responsible_name','Responsável legal','Nome completo'],
             ['contact_email','E-mail de contato','email@empresa.com'],
             ['contact_phone','Telefone (opcional)','(79) 99999-9999']
           ] as const).map(([field,label,placeholder])=><label key={field} className="block min-w-0 space-y-1 text-xs font-semibold text-navy-900">
             <span>{label}</span>
             <input className="w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-navy-900 placeholder:text-slate-400"
               type={field==='contact_email'?'email':'text'} autoComplete={field==='contact_email'?'email':'off'}
               value={company[field]} onChange={e=>change(field,e.target.value)} placeholder={placeholder}
               maxLength={field==='contact_email'?254:field==='cnae'?120:field==='responsible_name'?160:180}
               required={field!=='contact_phone'}/>
           </label>)}
         </div>
         {transfer&&<label className="block space-y-1 text-xs font-semibold text-navy-900"><span>Endereço anterior para transferência</span>
           <input className="w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-navy-900"
             value={company.transfer_from} onChange={e=>change('transfer_from',e.target.value)} maxLength={180} required/>
         </label>}
         <label className="flex items-start gap-2 text-xs leading-relaxed text-navy-900">
           <input type="checkbox" checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)} required className="mt-0.5"/>
           <span>Aceito a análise de elegibilidade e estou ciente de que a contratação depende do contrato e do pagamento confirmado, sem garantia de alvará ou inscrição estadual.</span>
         </label>
         {requestError&&<p role="alert" className="text-xs font-semibold text-rose-700">{requestError}</p>}
         <button type="submit" disabled={saving} className="action-primary checkout-submit">
           {saving?'Enviando solicitação…':'Solicitar análise para continuar'}
         </button>
       </form>}
       {(other?.status==='submitted'||other?.status==='under_review'||other?.status==='rejected')&&<a href={contact} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-xs font-bold text-navy-900">Falar com a equipe MVA</a>}
       <button type="button" onClick={()=>{onClose();setActiveTab('fiscal');document.getElementById('minha-area-fiscal')?.scrollIntoView({behavior:'smooth'})}}
        className="ml-3 text-xs font-semibold text-amber-900 underline underline-offset-2">Ver minhas solicitações</button>
     </div>}
     {currentUser&&!loading&&match&&<div className="space-y-4">
       <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
         <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"/>
         <div><strong className="text-sm text-emerald-900">Empresa elegível para a contratação</strong>
           <p className="mt-1 text-xs leading-relaxed text-emerald-800">{match.company_name}. Os documentos finais dependem do contrato e da confirmação financeira.</p></div>
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
