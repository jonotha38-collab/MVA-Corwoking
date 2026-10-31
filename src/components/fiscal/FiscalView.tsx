import { useEffect, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, BadgeCheck, BriefcaseBusiness, Building2, CalendarClock,
  Check, CheckCircle2, ChevronDown, Clock3, FileCheck2, FileText,
  Gift, Headphones, LockKeyhole, MailCheck, MapPin, MessageSquareText,
  MonitorSmartphone, SearchCheck, ShieldCheck, Sparkles, UsersRound, X
} from 'lucide-react';
import { useCoworking } from '../../context/CoworkingContext';
import { t } from '../../lib/preferences';
import { supabase } from '../../lib/supabase';
import { FISCAL_PLANS, quotePlan, canIssueCertificate, restoreOrder, type FiscalPlanId } from '../../lib/fiscal-payment';
import { FiscalCheckout } from '../payments/FiscalCheckout';
import { CertificateDialog } from './CertificateDialog';
import { FiscalServiceCenter } from './FiscalServiceCenter';
import { Dialog } from '../ui/Dialog';

type ServiceUnit = { id:string; name:string; street_address:string; city:string; state:string };
const planIds: FiscalPlanId[] = ['comercial','fiscal','fiscal_ie'];
const brl = (cents:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2}).format(cents/100);

const planInfo: Record<FiscalPlanId,{eyebrow:string;summary:string;ideal:string;features:string[];popular?:boolean}> = {
  comercial:{
    eyebrow:'Para marcar presença', summary:'Sua marca com um endereço profissional para divulgar nos canais comerciais.',
    ideal:'Autônomos, prestadores de serviço e empresas que buscam presença comercial.',
    features:['Endereço comercial para divulgação','Recepção de correspondências, conforme contrato','Consulta de recebimentos no painel','Acesso às salas de reunião disponíveis']
  },
  fiscal:{
    eyebrow:'Para o seu CNPJ',summary:'Estrutura de endereço para quem está abrindo ou alterando uma empresa.',
    ideal:'Prestadores de serviços, negócios digitais e profissionais PJ.',
    features:['Análise de viabilidade para o endereço fiscal','Documentação de autorização após regularização','Acompanhamento de correspondências','Acesso à estrutura da MVA para reuniões'],
    popular:true
  },
  fiscal_ie:{
    eyebrow:'Para operações com ICMS',summary:'Uma solução para empresas que precisam avaliar também a inscrição estadual.',
    ideal:'Comércios, e-commerces e empresas com operações sujeitas ao ICMS.',
    features:['Análise da atividade e das exigências estaduais','Documentação de endereço fiscal, quando elegível','Gestão de correspondências fiscais','Atendimento para orientação da contratação']
  }
};
const faqs = [
  {q:'Qual a diferença entre endereço fiscal e comercial?',a:'O endereço fiscal é o local indicado nos registros da empresa perante os órgãos competentes, conforme a atividade e as regras do município. O comercial é voltado à divulgação e ao contato profissional. É possível avaliar as duas necessidades na contratação.'},
  {q:'Posso abrir um CNPJ com o endereço da MVA?',a:'Depende da atividade econômica, da viabilidade municipal e da documentação da unidade. A equipe analisa a solicitação antes de autorizar o uso do endereço; não há garantia automática de aprovação.'},
  {q:'Posso contratar se minha empresa ainda não tem CNPJ?',a:'Sim, você pode iniciar a avaliação como empresa em abertura. A formalização será conduzida conforme os documentos e dados exigidos para o caso.'},
  {q:'Quando recebo a declaração de uso do endereço?',a:'Depois da análise cadastral, formalização do contrato e confirmação real do pagamento, caso a atividade e a unidade sejam elegíveis. A emissão não é imediata por padrão.'},
  {q:'Vocês recebem correspondências e encomendas?',a:'A MVA possui uma área de gestão de correspondências. Os serviços de recebimento, guarda e eventual digitalização dependem das condições do plano, da unidade e de autorização do titular.'},
  {q:'Posso contratar por um mês ou por um ano?',a:'Sim. A escolha é feita no site. Os valores são apresentados antes da contratação. A campanha de quatro meses de desconto no pagamento anual é condicionada à comprovação de transferência de outro endereço fiscal.'},
  {q:'Outros coworkings podem oferecer endereço fiscal na MVA?',a:'Proprietários podem solicitar credenciamento de suas unidades. Cada espaço passa por avaliação; o cadastro como coworking não autoriza automaticamente oferecer endereço fiscal.'},
];
const go = (id:string) => document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});

export function FiscalView(){
 const {currentCompany,currentUser,showToast,setAuthModalTab,setAuthModalOpen} = useCoworking();
 const eligible=canIssueCertificate(currentCompany);
 const [term,setTerm]=useState<1|12>(12);
 const [transfer,setTransfer]=useState(false);
 const [selectedPlan,setSelectedPlan]=useState<FiscalPlanId>('fiscal');
 const [applicationOpen,setApplicationOpen]=useState(false);
 const [clientAreaOpen,setClientAreaOpen]=useState(false);
 const [checkoutOpen,setCheckoutOpen]=useState(false);
 const [certificateOpen,setCertificateOpen]=useState(false);
 const [resumeOrderId,setResumeOrderId]=useState<string>();
 const [units,setUnits]=useState<ServiceUnit[]>([]);
 const [unitsLoading,setUnitsLoading]=useState(true);
 const [checkBusy,setCheckBusy]=useState(false);
 const [returnOrderId]=useState(()=>new URL(window.location.href).searchParams.get('fiscal_order'));

 useEffect(()=>{
  const u=new URL(window.location.href);
  ['fiscal_order','payment_intent','payment_intent_client_secret','redirect_status'].forEach(k=>u.searchParams.delete(k));
  window.history.replaceState(null,'',u.pathname+u.search+u.hash);
 },[]);
 useEffect(()=>{
  let live=true;
  void supabase.from('fiscal_units').select('id,name,street_address,city,state')
    .eq('active',true).order('name').then(({data,error})=>{
      if(!live)return;
      if(!error)setUnits((data||[]) as ServiceUnit[]);
      setUnitsLoading(false);
    });
  return()=>{live=false};
 },[]);
 useEffect(()=>{
  if(!currentUser)return;
  const saved=returnOrderId||restoreOrder(currentUser.id);
  if(saved && /^[0-9a-f-]{36}$/i.test(saved)){setResumeOrderId(saved);setCheckoutOpen(true)}
 },[currentUser?.id,returnOrderId]);

 const start=async(id:FiscalPlanId)=>{
  setSelectedPlan(id);
  if(!currentUser){
    setAuthModalTab('login');setAuthModalOpen(true);
    showToast('Entre na sua conta para prosseguir com a contratação.','info');
    return;
  }
  if(checkBusy)return;
  setCheckBusy(true);
  try{
    const {data,error}=await supabase.from('fiscal_applications')
      .select('id,term_months,transfer_from').eq('user_id',currentUser.id)
      .eq('plan_id',id).eq('status','approved').eq('term_months',term)
      .order('created_at',{ascending:false}).limit(1);
    if(error)throw error;
    if(data?.length && (!transfer || !!data[0].transfer_from)){
      setCheckoutOpen(true);
    }else{
      setApplicationOpen(true);
    }
  }catch{
    showToast('Não foi possível consultar sua análise cadastral. Tente novamente.','error');
  }finally{setCheckBusy(false)}
 };
 const showArea=()=>{
   if(!currentUser){setAuthModalTab('login');setAuthModalOpen(true);return}
   setClientAreaOpen(v=>!v);
   window.setTimeout(()=>go('minha-area-fiscal'),60);
 };
 const planQuote=(id:FiscalPlanId)=>quotePlan(FISCAL_PLANS[id],term,term===12&&transfer);
 return <div className="min-w-0 space-y-20 pb-16 sm:space-y-24">
  {/* Hero - two-column editorial treatment, native MVA identity. */}
  <section className="relative isolate overflow-hidden rounded-[24px] border border-[#263c54] bg-[#0c1c30] text-white shadow-[0_22px_65px_rgba(9,22,41,.13)] sm:rounded-[30px]" aria-labelledby="fiscal-hero-heading">
   <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
     <img src="/hero-office.jpg" alt="" className="absolute inset-y-0 right-0 h-full w-[53%] object-cover object-center"/>
     <div className="absolute inset-0 bg-gradient-to-r from-[#0c1c30] via-[#0c1c30] 40% to-[#0c1c30]/15"/>
     <div className="absolute inset-0 bg-gradient-to-t from-[#0c1c30]/40 via-transparent to-[#0c1c30]/10"/>
   </div>
   <div className="pointer-events-none absolute -left-36 bottom-0 h-80 w-80 rounded-full bg-orange-500/10 blur-[110px]" aria-hidden="true"/>
   <div className="relative grid min-w-0 lg:min-h-[540px] lg:grid-cols-[minmax(0,1.16fr)_minmax(0,.84fr)]">
    <div className="min-w-0 space-y-7 px-6 py-11 sm:px-10 sm:py-16 lg:px-12 lg:py-20">
      <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/10 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[.13em] text-orange-200">
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true"/> Escritório virtual MVA Coworking
      </span>
      <h1 id="fiscal-hero-heading" className="max-w-[670px] text-[clamp(2.25rem,4.45vw,4.35rem)] font-semibold leading-[1.09] tracking-[-.052em]">
       Um endereço para sua empresa. <span className="text-[#ffad77]">Mais liberdade para você.</span>
      </h1>
      <p className="max-w-xl text-[15px] leading-[1.85] text-slate-300 sm:text-[17px]">
       Endereço fiscal e comercial em Aracaju, com atendimento, correspondências e a estrutura de um coworking de verdade. Tudo em um só lugar.
      </p>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
       <button type="button" onClick={()=>go('planos-fiscais')} className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#cf581f] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-950/20 transition hover:bg-[#b84410]">
         Conhecer planos e preços <ArrowRight className="h-4 w-4" aria-hidden/>
       </button>
       <button type="button" onClick={()=>go('como-funciona-fiscal')} className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10">
         Entenda como funciona <ChevronDown className="h-4 w-4" aria-hidden/>
       </button>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-xs font-medium text-slate-300">
       <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-300"/> Atendimento especializado</span>
       <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-300"/> Correspondências no painel</span>
       <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-300"/> Contratação com análise</span>
      </div>
    </div>
    <div className="relative min-h-[250px] overflow-hidden lg:min-h-0">
     <img src="/hero-office.jpg" alt="Ambiente profissional da MVA Coworking" className="absolute inset-0 h-full w-full object-cover lg:hidden"/>
     <div className="absolute inset-0 bg-gradient-to-t from-[#0c1c30] via-transparent to-transparent lg:hidden"/>
     <div className="absolute bottom-6 left-5 right-5 flex items-center gap-3 rounded-2xl border border-white/20 bg-[#0e2339]/85 p-4 text-white shadow-xl backdrop-blur-lg sm:bottom-10 sm:left-auto sm:right-10 sm:max-w-[285px] lg:bottom-12">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/20"><MapPin className="h-5 w-5 text-orange-200"/></span>
      <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-orange-200">Presença em Aracaju</p><p className="mt-1 text-sm font-semibold">São José · SE</p><p className="text-xs text-slate-300">Sede MVA Coworking</p></div>
     </div>
    </div>
   </div>
  </section>

  {/* Benefits immediately, no intake form. */}
  <section id="vantagens-fiscais" className="scroll-mt-36 space-y-9">
   <div className="mx-auto max-w-2xl space-y-3 text-center">
    <span className="text-[11px] font-bold uppercase tracking-[.2em] text-orange-700">Mais do que um endereço</span>
    <h2 className="text-2xl font-semibold leading-tight tracking-tight text-navy-950 sm:text-[35px]">Sua empresa com presença profissional, sem os custos de um escritório próprio.</h2>
    <p className="text-sm leading-relaxed text-slate-600">Organize as demandas do dia a dia da sua empresa e concentre seus serviços na MVA.</p>
   </div>
   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {[
     {icon:Building2,title:'Endereço profissional',description:'Para o cadastro e a comunicação da empresa, conforme a análise da atividade.'},
     {icon:MailCheck,title:'Correspondências organizadas',description:'Recebimento e acompanhamento pelo sistema, com solicitação de digitalização quando disponível.'},
     {icon:LockKeyhole,title:'Mais privacidade',description:'Evite divulgar seu endereço residencial como ponto de contato da empresa quando permitido.'},
     {icon:MonitorSmartphone,title:'Tudo no seu painel',description:'Acesse informações de contrato, solicitações e documentos em uma área reservada.'},
     {icon:UsersRound,title:'Coworking de verdade',description:'Reserve salas de reunião e espaços para encontros presenciais conforme disponibilidade.'},
     {icon:Headphones,title:'Acompanhamento humano',description:'Equipe para orientar a contratação e esclarecer exigências documentais.'}
    ].map(({icon:Icon,title,description})=><article key={title} className="group min-w-0 rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-orange-200 sm:p-7">
       <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-[#fff1e8] text-[#b74d19]"><Icon className="h-5 w-5" aria-hidden/></div>
       <h3 className="text-lg font-semibold text-navy-950">{title}</h3>
       <p className="mt-2 text-sm leading-[1.8] text-slate-600">{description}</p>
     </article>)}
   </div>
  </section>

  {/* Three conceptual types, inspired by clear content hierarchy rather than visual copying. */}
  <section className="grid min-w-0 gap-8 overflow-hidden rounded-[26px] border border-slate-200 bg-white lg:grid-cols-[.82fr_1.18fr]">
    <div className="relative min-h-[250px] overflow-hidden bg-[#10253d] lg:min-h-[455px]">
      <img src="/hero-office.jpg" alt="Espaço de trabalho moderno" className="absolute inset-0 h-full w-full object-cover opacity-75"/>
      <div className="absolute inset-0 bg-gradient-to-t from-[#10253d]/95 via-[#10253d]/20 to-transparent"/>
      <div className="absolute bottom-7 left-7 right-7 text-white sm:bottom-9 sm:left-9">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-sm"><BadgeCheck className="h-3.5 w-3.5"/> Uma estrutura, várias possibilidades</span>
        <h2 className="mt-4 max-w-sm text-2xl font-semibold leading-snug sm:text-3xl">A solução certa para o momento do seu negócio.</h2>
      </div>
    </div>
    <div className="min-w-0 space-y-7 px-6 py-8 sm:px-10 sm:py-10">
      <span className="text-[11px] font-bold uppercase tracking-[.17em] text-orange-700">Escolha de acordo com sua necessidade</span>
      {[
       {icon:BriefcaseBusiness,title:'Endereço comercial',desc:'Para apresentar seu negócio com um endereço profissional em materiais, redes sociais e contatos comerciais.'},
       {icon:ShieldCheck,title:'Endereço fiscal',desc:'Para avaliar o uso do endereço no registro de sua empresa, conforme CNAE e regras municipais.'},
       {icon:FileCheck2,title:'Endereço fiscal com IE',desc:'Para empresas que também precisam verificar exigências relativas à inscrição estadual e ICMS.'}
      ].map(({icon:Icon,title,desc},i)=><div key={title} className={`flex min-w-0 gap-4 ${i>0?'border-t border-slate-100 pt-6':''}`}>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-navy-800"><Icon className="h-5 w-5" aria-hidden/></div>
        <div className="min-w-0"><h3 className="text-base font-semibold text-navy-950">{title}</h3><p className="mt-2 text-sm leading-[1.75] text-slate-600">{desc}</p></div>
       </div>)}
      <button type="button" onClick={()=>go('planos-fiscais')} className="inline-flex items-center gap-2 text-sm font-bold text-[#b74710] hover:underline">Comparar os planos <ArrowRight className="h-4 w-4"/></button>
    </div>
  </section>

  {/* Plan catalog: prices derived from authoritative shared server catalog, not reference website. */}
  <section id="planos-fiscais" className="scroll-mt-32 space-y-9">
   <div className="mx-auto max-w-2xl space-y-3 text-center">
    <span className="text-[11px] font-bold uppercase tracking-[.2em] text-orange-700">Escolha seu plano</span>
    <h2 className="text-2xl font-semibold tracking-tight text-navy-950 sm:text-[36px]">Um plano para cada fase da sua empresa.</h2>
    <p className="text-sm leading-relaxed text-slate-600">Valores claros e serviços que acompanham o seu negócio.</p>
   </div>
   <div className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm" aria-label="Período do plano">
     <button type="button" aria-pressed={term===1} onClick={()=>setTerm(1)} className={`rounded-xl px-5 py-3 text-xs font-bold transition sm:text-sm ${term===1?'bg-navy-900 text-white shadow-sm':'text-slate-600 hover:bg-slate-100'}`}>Mensal</button>
     <button type="button" aria-pressed={term===12} onClick={()=>setTerm(12)} className={`rounded-xl px-5 py-3 text-xs font-bold transition sm:text-sm ${term===12?'bg-navy-900 text-white shadow-sm':'text-slate-600 hover:bg-slate-100'}`}>Anual · 12 meses</button>
   </div>
   {term===12 && <label className="mx-auto flex max-w-2xl cursor-pointer items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-navy-900">
    <input type="checkbox" checked={transfer} onChange={e=>setTransfer(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-orange-600"/>
    <span><strong>Já tem endereço fiscal e quer transferir?</strong> Marque para visualizar a campanha de 4 meses grátis no anual, sujeita à comprovação e elegibilidade.</span>
   </label>}
   <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
    {planIds.map(id=>{
      const p=FISCAL_PLANS[id], info=planInfo[id],q=planQuote(id);
      const monthlyEquivalent=q.amount/(term===1?1:12);
      return <article key={id} className={`relative flex min-w-0 flex-col overflow-hidden rounded-[24px] border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl ${info.popular?'border-[#d06636] shadow-[0_12px_35px_rgba(183,74,28,.11)]':'border-slate-200'}`}>
        {info.popular&&<div className="bg-[#14304d] py-2.5 text-center text-[11px] font-bold uppercase tracking-[.16em] text-white">Mais procurado</div>}
        <div className="flex flex-1 flex-col p-6 sm:p-7">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-orange-700">{info.eyebrow}</span>
          <h3 className="mt-3 min-h-[48px] text-xl font-semibold leading-tight text-navy-950">{p.name}</h3>
          <p className="mt-3 min-h-[72px] text-sm leading-[1.7] text-slate-600">{info.summary}</p>
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-[11px] font-semibold text-slate-500">A partir de</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
              <strong className="text-[clamp(1.9rem,3vw,2.3rem)] font-semibold leading-tight tracking-tight text-navy-950">{brl(monthlyEquivalent)}</strong>
              <span className="text-xs text-slate-500">/ mês equivalente</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {term===12?`Pagamento anual: ${brl(q.amount)}`:`Pagamento de 1 mês: ${brl(q.amount)}`}
            </p>
            {q.discount>0&&<div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-[11px] font-bold text-orange-800"><Gift className="h-3.5 w-3.5"/> Economia estimada: {brl(q.discount)}</div>}
          </div>
          <button type="button" disabled={checkBusy} onClick={()=>void start(id)} className={`mt-6 flex min-h-[47px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors disabled:opacity-60 ${info.popular?'bg-[#c65019] text-white hover:bg-[#aa3c0f]':'bg-navy-900 text-white hover:bg-navy-800'}`}>Começar contratação <ArrowRight className="h-4 w-4"/></button>
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="mb-4 text-xs font-semibold text-navy-900">O que está incluído</p>
            <ul className="space-y-3">{info.features.map(feature=><li key={feature} className="flex items-start gap-2.5 text-[13px] leading-[1.55] text-slate-600"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#bd581f]"/>{feature}</li>)}</ul>
          </div>
        </div>
      </article>;
    })}
   </div>
   <p className="mx-auto max-w-3xl text-center text-xs leading-relaxed text-slate-500">Preços de referência do catálogo atual da MVA. Endereço fiscal e inscrição estadual dependem de análise cadastral, contrato e requisitos municipais/estaduais. A contratação financeira só estará disponível quando o provedor de pagamento estiver configurado.</p>
  </section>

  {/* Conversion with correct expectations */}
  <section id="como-funciona-fiscal" className="scroll-mt-32 space-y-9">
   <div className="mx-auto max-w-2xl space-y-3 text-center">
    <span className="text-[11px] font-bold uppercase tracking-[.2em] text-orange-700">Simples e acompanhado</span>
    <h2 className="text-2xl font-semibold tracking-tight text-navy-950 sm:text-4xl">Como funciona a contratação?</h2>
    <p className="text-sm leading-relaxed text-slate-600">Você escolhe a solução, nós verificamos a elegibilidade e seguimos com a formalização.</p>
   </div>
   <div className="grid gap-4 md:grid-cols-3">
    {[
     {icon:SearchCheck,number:'01',title:'Escolha sua solução',desc:'Compare os planos, o prazo e a unidade de interesse.'},
     {icon:FileText,number:'02',title:'Análise e documentação',desc:'Após iniciar a contratação, enviamos sua solicitação para conferência da atividade, documentos e viabilidade.'},
     {icon:BadgeCheck,number:'03',title:'Contrato e liberação',desc:'Depois da aprovação e do pagamento confirmado, os documentos pertinentes ficam disponíveis no painel.'}
    ].map(({icon:Icon,number,title,desc})=><article key={number} className="relative min-w-0 rounded-[22px] border border-slate-200 bg-white p-6 sm:p-7">
      <div className="flex items-center justify-between"><span className="text-sm font-bold tracking-widest text-orange-700">{number}</span><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff1e8] text-[#bd581f]"><Icon className="h-5 w-5"/></div></div>
      <h3 className="mt-7 text-lg font-semibold text-navy-950">{title}</h3>
      <p className="mt-2 text-sm leading-[1.75] text-slate-600">{desc}</p>
     </article>)}
   </div>
  </section>

  <section id="unidades-fiscais" className="scroll-mt-32 space-y-8">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div className="max-w-2xl space-y-3"><span className="text-[11px] font-bold uppercase tracking-[.2em] text-orange-700">Onde estamos</span>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-950 sm:text-4xl">Um endereço com estrutura real.</h2>
        <p className="text-sm leading-relaxed text-slate-600">Conheça as unidades disponíveis para análise. Parceiros só aparecem após credenciamento da MVA.</p></div>
      <button type="button" onClick={()=>go('planos-fiscais')} className="inline-flex items-center gap-2 text-sm font-bold text-[#b74710] hover:underline">Escolher meu plano <ArrowUpRight className="h-4 w-4"/></button>
    </div>
    {unitsLoading?<div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">Consultando unidades disponíveis…</div>
      :units.length===0?<div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Unidades em análise de disponibilidade. Consulte nossa equipe para mais informações.</div>
      :<div className="grid gap-4 md:grid-cols-2">
        {units.map(unit=><article key={unit.id} className="flex min-w-0 items-start gap-4 rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#142940] text-orange-300"><MapPin className="h-5 w-5"/></div>
          <div className="min-w-0"><span className="text-[11px] font-semibold uppercase tracking-widest text-orange-700">Unidade disponível para consulta</span>
            <h3 className="mt-2 break-words text-base font-bold text-navy-950">{unit.name}</h3>
            <p className="mt-2 break-words text-sm leading-[1.7] text-slate-600">{unit.street_address}</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">{unit.city} · {unit.state}</p>
          </div>
        </article>)}
      </div>}
  </section>

  <section className="relative overflow-hidden rounded-[26px] bg-[#112840] px-6 py-9 text-white sm:px-10 sm:py-11">
   <div className="pointer-events-none absolute -right-20 -top-16 h-60 w-60 rounded-full bg-[#d15a21]/20 blur-[75px]" aria-hidden="true"/>
   <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
     <div className="max-w-2xl"><span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-orange-300"><Gift className="h-4 w-4"/> Condição especial</span>
       <h2 className="mt-3 text-2xl font-semibold leading-tight sm:text-[30px]">Sua empresa já usa outro endereço fiscal?</h2>
       <p className="mt-3 text-sm leading-relaxed text-slate-300">A MVA oferece uma campanha de transferência com até 4 meses gratuitos na contratação anual, sujeita à elegibilidade e comprovação.</p></div>
     <button type="button" onClick={()=>{setTerm(12);setTransfer(true);go('planos-fiscais')}} className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-navy-900 transition hover:bg-orange-50 sm:w-auto">Ver condição anual <ArrowRight className="h-4 w-4"/></button>
   </div>
  </section>

  <section id="duvidas-fiscais" className="scroll-mt-32 space-y-7">
   <div className="max-w-2xl space-y-3"><span className="text-[11px] font-bold uppercase tracking-[.2em] text-orange-700">Sem letras miúdas</span><h2 className="text-2xl font-semibold tracking-tight text-navy-950 sm:text-4xl">Perguntas frequentes.</h2><p className="text-sm leading-relaxed text-slate-600">As respostas mais importantes antes de contratar seu escritório virtual.</p></div>
   <div className="grid min-w-0 gap-3">
    {faqs.map(({q,a})=><details key={q} className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-4 open:border-orange-200 sm:p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-semibold text-navy-900 marker:content-none sm:text-[15px]">{q}<ChevronDown className="h-5 w-5 shrink-0 text-orange-700 transition-transform group-open:rotate-180"/></summary>
      <p className="max-w-4xl pt-4 text-sm leading-[1.8] text-slate-600">{a}</p>
     </details>)}
   </div>
  </section>

  <section className="rounded-[26px] border border-[#283e57] bg-[#0e2035] px-6 py-10 text-white sm:px-10 sm:py-12">
   <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="max-w-2xl"><span className="text-[11px] font-bold uppercase tracking-widest text-orange-300">Seu próximo passo</span><h2 className="mt-3 text-2xl font-semibold leading-tight sm:text-[32px]">Pronto para profissionalizar seu endereço?</h2><p className="mt-3 text-sm leading-relaxed text-slate-300">Escolha seu plano com tranquilidade. Nossa equipe confere os requisitos antes de qualquer liberação.</p></div>
    <div className="flex flex-col gap-3 sm:flex-row">
      <button type="button" onClick={()=>go('planos-fiscais')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#cc541c] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#af410f]">Ver planos <ArrowRight className="h-4 w-4"/></button>
      <button type="button" onClick={showArea} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10"><FileCheck2 className="h-4 w-4"/> Minha área</button>
    </div>
   </div>
  </section>

  {/* Existing clients keep document/contract access, without exposing onboarding forms in the landing page. */}
  <div id="minha-area-fiscal" className="scroll-mt-32">
    {currentUser && <div className="space-y-5">
       <button type="button" aria-expanded={clientAreaOpen} onClick={()=>setClientAreaOpen(v=>!v)} className="flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left text-sm font-bold text-navy-900">
        <span className="flex min-w-0 items-center gap-2"><FileCheck2 className="h-5 w-5 shrink-0 text-orange-600"/> Acompanhar solicitações e documentos</span><ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${clientAreaOpen?'rotate-180':''}`}/>
       </button>
       {clientAreaOpen&&<FiscalServiceCenter mode="dashboard" initialPlan={selectedPlan} onCheckout={id=>void start(id)}/>}
    </div>}
  </div>

  {applicationOpen && <Dialog titleId="mva-fiscal-application-title" className="checkout-wide" onClose={()=>setApplicationOpen(false)}>
     <div className="max-h-[90dvh] overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
       <div className="min-w-0"><span className="text-xs font-bold uppercase tracking-widest text-orange-700">Próxima etapa</span><h2 id="mva-fiscal-application-title" className="mt-1 text-xl font-bold text-navy-950">Análise antes da contratação</h2><p className="mt-1 text-xs leading-relaxed text-slate-600">Só precisamos dos dados para verificar a elegibilidade. Nenhuma cobrança acontece agora.</p></div>
       <button aria-label="Fechar" type="button" onClick={()=>setApplicationOpen(false)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><X className="h-5 w-5"/></button>
      </div>
      <FiscalServiceCenter mode="application" initialPlan={selectedPlan} initialTerm={term}
       onSubmitted={()=>{setApplicationOpen(false);setClientAreaOpen(true);window.setTimeout(()=>go('minha-area-fiscal'),60)}}
       onCheckout={id=>void start(id)}/>
     </div>
    </Dialog>}
  {checkoutOpen&&<FiscalCheckout planId={selectedPlan} transfer={term===12&&transfer} resumeOrderId={resumeOrderId}
    onClose={()=>{setCheckoutOpen(false);setResumeOrderId(undefined)}} onPaid={()=>{setClientAreaOpen(true);showToast('Status do pagamento atualizado.','info')}}/>}
  {certificateOpen&&<CertificateDialog onClose={()=>setCertificateOpen(false)} onChoosePlan={()=>{setCertificateOpen(false);void start('fiscal')}}/>}
 </div>;
}
