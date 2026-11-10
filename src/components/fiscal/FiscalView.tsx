import { useEffect, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, BadgeCheck, BriefcaseBusiness, Building2,
  Check, CheckCircle2, ChevronDown, FileCheck2, FileText,
  Gift, Headphones, MessageCircle, LockKeyhole, MailCheck, MapPin,
  MonitorSmartphone, SearchCheck, ShieldCheck, Sparkles, UsersRound
} from 'lucide-react';
import { useCoworking } from '../../context/CoworkingContext';
import { supabase } from '../../lib/supabase';
import { t, usePreferences, type Language } from '../../lib/preferences';
import { mvaWhatsAppUrl } from '../../lib/whatsapp';
import { FISCAL_PLANS, quotePlan, canIssueCertificate, restoreOrder, type FiscalPlanId } from '../../lib/fiscal-payment';
import { FiscalCheckout } from '../payments/FiscalCheckout';
import { CertificateDialog } from './CertificateDialog';
import { FiscalServiceCenter } from './FiscalServiceCenter';

type ServiceUnit = { id:string; name:string; street_address:string; city:string; state:string };
const planIds: FiscalPlanId[] = ['mva_essencial','mva_profissional','mva_excellence'];
const brl = (cents:number, language:Language) => new Intl.NumberFormat(language==='en'?'en-US':language==='es'?'es-ES':'pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2}).format(cents/100);

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
  },
  mva_essencial:{
    eyebrow:'Sua empresa no endereço certo',
    summary:'Endereço fiscal profissional com gestão de correspondências e documentação segura.',
    ideal:'Empresas em abertura e prestadores de serviços que buscam o essencial.',
    features:[
      'Endereço fiscal, sujeito à viabilidade e formalização',
      'Gestão de correspondências e documentos',
      'Acompanhamento pelo painel do cliente',
      'Salas de reunião disponíveis mediante agendamento, pela tarifa regular'
    ]
  },
  mva_profissional:{
    eyebrow:'Mais praticidade no seu dia a dia',
    summary:'A estrutura de endereço fiscal da MVA com economia nas suas reuniões profissionais.',
    ideal:'Profissionais e empresas que utilizam salas de reunião ocasionalmente.',
    features:[
      'Todos os benefícios do MVA Essencial',
      '5% de desconto na locação de salas de reunião da sede MVA',
      'Gestão de correspondências e documentos',
      'Acesso à documentação assinada após formalização'
    ]
  },
  mva_excellence:{
    eyebrow:'Nosso plano mais completo',
    summary:'Endereço fiscal com vantagens para receber clientes e apoio contábil.',
    ideal:'Empresas e profissionais que recebem clientes e querem serviços adicionais.',
    features:[
      'Todos os benefícios do MVA Profissional',
      '10% de desconto nas salas de reunião da sede MVA (em vez de 5%)',
      '2 horas mensais de bônus em sala de atendimento nos 3 primeiros meses, não cumulativas',
      '1 consulta gratuita com contador por contratação, mediante agendamento',
      'Gestão de correspondências e documentação'
    ],
    popular:true
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
  const {language}=usePreferences();
 const eligible=canIssueCertificate(currentCompany);
 const [term,setTerm]=useState<1|12>(12);
 const [transfer,setTransfer]=useState(false);
 const [selectedPlan,setSelectedPlan]=useState<FiscalPlanId>('mva_profissional');
 const [clientAreaOpen,setClientAreaOpen]=useState(false);
 const [checkoutOpen,setCheckoutOpen]=useState(false);
 const [certificateOpen,setCertificateOpen]=useState(false);
 const [resumeOrderId,setResumeOrderId]=useState<string>();
 const [units,setUnits]=useState<ServiceUnit[]>([]);
 const [unitsLoading,setUnitsLoading]=useState(true);
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

 // No separate fiscal application form: choose a plan and go to checkout.
 // The payment service must independently validate eligibility before activating contracts.
 const start=(id:FiscalPlanId)=>{
   setSelectedPlan(id);
   setResumeOrderId(undefined);
   setCheckoutOpen(true);
 };
 const showArea=()=>{
   if(!currentUser){setAuthModalTab('login');setAuthModalOpen(true);return}
   setClientAreaOpen(v=>!v);
   window.setTimeout(()=>go('minha-area-fiscal'),60);
 };
 const planQuote=(id:FiscalPlanId)=>quotePlan(FISCAL_PLANS[id],term,term===12&&transfer);
 return <div className="mva-fiscal min-w-0 space-y-20 pb-16 sm:space-y-24">
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
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true"/> {t('Escritório virtual MVA Coworking')}
      </span>
      <h1 id="fiscal-hero-heading" className="max-w-[670px] text-[clamp(2.25rem,4.45vw,4.35rem)] font-semibold leading-[1.09] tracking-[-.052em]">
       {t('Um endereço para sua empresa.')} <span className="text-[#ffad77]">{t("Mais liberdade para você.")}</span>
      </h1>
      <p className="max-w-xl text-[15px] leading-[1.85] text-slate-300 sm:text-[17px]">
       {t('Endereço fiscal e comercial em Aracaju, com atendimento, correspondências e a estrutura de um coworking de verdade. Tudo em um só lugar.')}
      </p>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
       <button type="button" onClick={()=>go('planos-fiscais')} className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#cf581f] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-950/20 transition hover:bg-[#b84410]">
         {t('Conhecer planos e preços')} <ArrowRight className="h-4 w-4" aria-hidden/>
       </button>
       <button type="button" onClick={()=>go('como-funciona-fiscal')} className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10">
         {t('Entenda como funciona')} <ChevronDown className="h-4 w-4" aria-hidden/>
       </button>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-xs font-medium text-slate-300">
       <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-300"/> {t('Atendimento especializado')}</span>
       <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-300"/> {t('Correspondências no painel')}</span>
       <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-300"/> {t('Contratação com análise')}</span>
      </div>
    </div>
    <div className="relative min-h-[250px] overflow-hidden lg:min-h-0">
     <img src="/hero-office.jpg" alt={t('Ambiente profissional da MVA Coworking')} className="absolute inset-0 h-full w-full object-cover lg:hidden"/>
     <div className="absolute inset-0 bg-gradient-to-t from-[#0c1c30] via-transparent to-transparent lg:hidden"/>
     <div className="absolute bottom-6 left-5 right-5 flex items-center gap-3 rounded-2xl border border-white/20 bg-[#0e2339]/85 p-4 text-white shadow-xl backdrop-blur-lg sm:bottom-10 sm:left-auto sm:right-10 sm:max-w-[285px] lg:bottom-12">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/20"><MapPin className="h-5 w-5 text-orange-200"/></span>
      <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-orange-200">{t("Presença em Aracaju")}</p><p className="mt-1 text-sm font-semibold">São José · SE</p><p className="text-xs text-slate-300">{t("Sede MVA Coworking")}</p></div>
     </div>
    </div>
   </div>
  </section>

  {/* Benefits immediately, no intake form. */}
  <section id="vantagens-fiscais" className="scroll-mt-36 space-y-9">
   <div className="mx-auto max-w-2xl space-y-3 text-center">
    <span className="text-[11px] font-bold uppercase tracking-[.2em] fiscal-accent">{t("Mais do que um endereço")}</span>
    <h2 className="text-2xl font-semibold leading-tight tracking-tight fiscal-ink sm:text-[35px]">{t("Sua empresa com presença profissional, sem os custos de um escritório próprio.")}</h2>
    <p className="text-sm leading-relaxed fiscal-muted">{t("Organize as demandas do dia a dia da sua empresa e concentre seus serviços na MVA.")}</p>
   </div>
   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {[
     {icon:Building2,title:'Endereço profissional',description:'Para o cadastro e a comunicação da empresa, conforme a análise da atividade.'},
     {icon:MailCheck,title:'Correspondências organizadas',description:'Recebimento e acompanhamento pelo sistema, com solicitação de digitalização quando disponível.'},
     {icon:LockKeyhole,title:'Mais privacidade',description:'Evite divulgar seu endereço residencial como ponto de contato da empresa quando permitido.'},
     {icon:MonitorSmartphone,title:'Tudo no seu painel',description:'Acesse informações de contrato, solicitações e documentos em uma área reservada.'},
     {icon:UsersRound,title:'Coworking de verdade',description:'Reserve salas de reunião e espaços para encontros presenciais conforme disponibilidade.'},
     {icon:Headphones,title:'Acompanhamento humano',description:'Equipe para orientar a contratação e esclarecer exigências documentais.'}
    ].map(({icon:Icon,title,description})=><article key={title} className="group min-w-0 rounded-[22px] border fiscal-line fiscal-surface p-6 shadow-sm transition-colors hover:border-orange-200 sm:p-7">
       <div className="fiscal-icon-badge mb-6 rounded-2xl"><Icon className="h-5 w-5" aria-hidden/></div>
       <h3 className="text-lg font-semibold fiscal-ink">{t(title)}</h3>
       <p className="mt-2 text-sm leading-[1.8] fiscal-muted">{t(description)}</p>
     </article>)}
   </div>
  </section>

  {/* Three conceptual types, inspired by clear content hierarchy rather than visual copying. */}
  <section className="grid min-w-0 gap-8 overflow-hidden rounded-[26px] border fiscal-line fiscal-surface lg:grid-cols-[.82fr_1.18fr]">
    <div className="relative min-h-[250px] overflow-hidden bg-[#10253d] lg:min-h-[455px]">
      <img src="/hero-office.jpg" alt={t('Espaço de trabalho moderno')} className="absolute inset-0 h-full w-full object-cover opacity-75"/>
      <div className="absolute inset-0 bg-gradient-to-t from-[#10253d]/95 via-[#10253d]/20 to-transparent"/>
      <div className="absolute bottom-7 left-7 right-7 text-white sm:bottom-9 sm:left-9">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-sm"><BadgeCheck className="h-3.5 w-3.5"/> {t('Uma estrutura, várias possibilidades')}</span>
        <h2 className="mt-4 max-w-sm text-2xl font-semibold leading-snug sm:text-3xl">{t("A solução certa para o momento do seu negócio.")}</h2>
      </div>
    </div>
    <div className="min-w-0 space-y-7 px-6 py-8 sm:px-10 sm:py-10">
      <span className="text-[11px] font-bold uppercase tracking-[.17em] fiscal-accent">{t("Escolha de acordo com sua necessidade")}</span>
      {[
       {icon:BriefcaseBusiness,title:'Endereço comercial',desc:'Para apresentar seu negócio com um endereço profissional em materiais, redes sociais e contatos comerciais.'},
       {icon:ShieldCheck,title:'Endereço fiscal',desc:'Para avaliar o uso do endereço no registro de sua empresa, conforme CNAE e regras municipais.'},
       {icon:FileCheck2,title:'Endereço fiscal com IE',desc:'Para empresas que também precisam verificar exigências relativas à inscrição estadual e ICMS.'}
      ].map(({icon:Icon,title,desc},i)=><div key={title} className={`flex min-w-0 gap-4 ${i>0?'border-t fiscal-line pt-6':''}`}>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl fiscal-soft fiscal-ink"><Icon className="h-5 w-5" aria-hidden/></div>
        <div className="min-w-0"><h3 className="text-base font-semibold fiscal-ink">{t(title)}</h3><p className="mt-2 text-sm leading-[1.75] fiscal-muted">{t(desc)}</p></div>
       </div>)}
      <button type="button" onClick={()=>go('planos-fiscais')} className="inline-flex items-center gap-2 text-sm font-bold fiscal-accent hover:underline">{t('Comparar os planos')} <ArrowRight className="h-4 w-4"/></button>
    </div>
  </section>

  {/* Plan catalog: prices derived from authoritative shared server catalog, not reference website. */}
  <section id="planos-fiscais" className="scroll-mt-32 space-y-9">
   <div className="mx-auto max-w-2xl space-y-3 text-center">
    <span className="text-[11px] font-bold uppercase tracking-[.2em] fiscal-accent">{t("Escolha seu plano")}</span>
    <h2 className="text-2xl font-semibold tracking-tight fiscal-ink sm:text-[36px]">{t("Um plano para cada fase da sua empresa.")}</h2>
    <p className="text-sm leading-relaxed fiscal-muted">{t("Valores claros e serviços que acompanham o seu negócio.")}</p>
   </div>
   <div className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border fiscal-line fiscal-surface p-1.5 shadow-sm" aria-label={t('Período do plano')}>
     <button type="button" aria-pressed={term===1} onClick={()=>setTerm(1)} className={`rounded-xl px-5 py-3 text-xs font-bold transition sm:text-sm ${term===1?'bg-navy-900 text-white shadow-sm':'fiscal-muted hover:bg-slate-100'}`}>{t("Mensal")}</button>
     <button type="button" aria-pressed={term===12} onClick={()=>setTerm(12)} className={`rounded-xl px-5 py-3 text-xs font-bold transition sm:text-sm ${term===12?'bg-navy-900 text-white shadow-sm':'fiscal-muted hover:bg-slate-100'}`}>{t("Anual · 12 meses")}</button>
   </div>
   {term===12 && <label className="mx-auto flex max-w-2xl cursor-pointer items-start gap-3 rounded-xl border fiscal-highlight-border fiscal-accent-soft px-4 py-3 text-sm fiscal-ink">
    <input type="checkbox" checked={transfer} onChange={e=>setTransfer(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-orange-600"/>
    <span><strong>{t('Já tem endereço fiscal e quer transferir?')}</strong> {t('Marque para visualizar a campanha de 4 meses grátis no anual, sujeita à comprovação e elegibilidade.')}</span>
   </label>}
   <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
    {planIds.map(id=>{
      const p=FISCAL_PLANS[id], info=planInfo[id],q=planQuote(id);
      const monthlyEquivalent=q.amount/(term===1?1:12);
      return <article key={id} className={`relative flex min-w-0 flex-col overflow-hidden rounded-[24px] border fiscal-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl ${info.popular?'border-[#d06636] shadow-[0_12px_35px_rgba(183,74,28,.11)]':'fiscal-line'}`}>
        {info.popular&&<div className="bg-[#14304d] py-2.5 text-center text-[11px] font-bold uppercase tracking-[.16em] text-white">{t("Mais procurado")}</div>}
        <div className="flex flex-1 flex-col p-6 sm:p-7">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] fiscal-accent">{t(info.eyebrow)}</span>
          <h3 className="mt-3 min-h-[48px] text-xl font-semibold leading-tight fiscal-ink">{p.name}</h3>
          <p className="mt-3 min-h-[72px] text-sm leading-[1.7] fiscal-muted">{t(info.summary)}</p>
          <div className="mt-6 border-t fiscal-line pt-5">
            <p className="text-[11px] font-semibold fiscal-muted">{t("A partir de")}</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
              <strong className="text-[clamp(1.9rem,3vw,2.3rem)] font-semibold leading-tight tracking-tight fiscal-ink">{brl(monthlyEquivalent,language)}</strong>
              <span className="text-xs fiscal-muted">{t("/ mês equivalente")}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed fiscal-muted">
              {term===12?`${t('Pagamento anual:')} ${brl(q.amount,language)}`:`${t('Pagamento de 1 mês:')} ${brl(q.amount,language)}`}
            </p>
            {q.discount>0&&<div className="mt-2 inline-flex items-center gap-1.5 rounded-full fiscal-accent-soft px-3 py-1.5 text-[11px] font-bold fiscal-accent"><Gift className="h-3.5 w-3.5"/> {t('Economia estimada:')} {brl(q.discount,language)}</div>}
          </div>
          <button type="button" onClick={()=>start(id)} className={`mt-6 flex min-h-[47px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors disabled:opacity-60 ${info.popular?'bg-[#c65019] text-white hover:bg-[#aa3c0f]':'bg-navy-900 text-white hover:bg-navy-800'}`}>{t('Ver contratação e pagamento')} <ArrowRight className="h-4 w-4"/></button>
          <div className="mt-6 border-t fiscal-line pt-5">
            <p className="mb-4 text-xs font-semibold fiscal-ink">{t("O que está incluído")}</p>
            <ul className="space-y-3">{info.features.map(feature=><li key={feature} className="flex items-start gap-2.5 text-[13px] leading-[1.55] fiscal-muted"><Check className="mt-0.5 h-4 w-4 shrink-0 fiscal-accent"/>{t(feature)}</li>)}</ul>
          </div>
        </div>
      </article>;
    })}
   </div>
   <p className="mx-auto max-w-3xl text-center text-xs leading-relaxed fiscal-muted">{t("Planos conforme o catálogo atual da MVA. A contratação e a emissão de documentos dependem da viabilidade do endereço, formalização e confirmação do pagamento. O Stripe confirma o pagamento real; o uso do endereço e a entrega dos documentos dependem da aprovação final e da assinatura do contrato pela MVA.")}</p>
  </section>

  {/* Conversion with correct expectations */}
  <section id="como-funciona-fiscal" className="scroll-mt-32 space-y-9">
   <div className="mx-auto max-w-2xl space-y-3 text-center">
    <span className="text-[11px] font-bold uppercase tracking-[.2em] fiscal-accent">{t("Simples e acompanhado")}</span>
    <h2 className="text-2xl font-semibold tracking-tight fiscal-ink sm:text-4xl">{t("Como funciona a contratação?")}</h2>
    <p className="text-sm leading-relaxed fiscal-muted">{t("Você escolhe a solução, nós verificamos a elegibilidade e seguimos com a formalização.")}</p>
   </div>
   <div className="grid gap-4 md:grid-cols-3">
    {[
     {icon:SearchCheck,number:'01',title:'Escolha sua solução',desc:'Compare os planos, o prazo e a unidade de interesse.'},
     {icon:FileText,number:'02',title:'Análise e documentação',desc:'Na tela de pagamento, informe apenas os dados necessários à contratação. A equipe da MVA verificará a atividade e a documentação.'},
     {icon:BadgeCheck,number:'03',title:'Contrato e liberação',desc:'Depois da aprovação e do pagamento confirmado, os documentos pertinentes ficam disponíveis no painel.'}
    ].map(({icon:Icon,number,title,desc})=><article key={number} className="relative min-w-0 rounded-[22px] border fiscal-line fiscal-surface p-6 sm:p-7">
      <div className="flex items-center justify-between"><span className="text-sm font-bold tracking-widest fiscal-accent">{number}</span><div className="fiscal-icon-badge rounded-xl"><Icon className="h-5 w-5" aria-hidden="true"/></div></div>
      <h3 className="mt-7 text-lg font-semibold fiscal-ink">{t(title)}</h3>
      <p className="mt-2 text-sm leading-[1.75] fiscal-muted">{t(desc)}</p>
     </article>)}
   </div>
  </section>

  <section id="unidades-fiscais" className="scroll-mt-32 space-y-8">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div className="max-w-2xl space-y-3"><span className="text-[11px] font-bold uppercase tracking-[.2em] fiscal-accent">{t("Onde estamos")}</span>
        <h2 className="text-2xl font-semibold tracking-tight fiscal-ink sm:text-4xl">{t("Um endereço com estrutura real.")}</h2>
        <p className="text-sm leading-relaxed fiscal-muted">{t("Conheça as unidades disponíveis para análise. Parceiros só aparecem após credenciamento da MVA.")}</p></div>
      <button type="button" onClick={()=>go('planos-fiscais')} className="inline-flex items-center gap-2 text-sm font-bold fiscal-accent hover:underline">{t('Escolher meu plano')} <ArrowUpRight className="h-4 w-4"/></button>
    </div>
    {unitsLoading?<div className="rounded-2xl border fiscal-line fiscal-surface p-6 text-sm fiscal-muted" role="status">{t("Consultando unidades disponíveis…")}</div>
      :units.length===0?<div className="rounded-2xl border fiscal-line fiscal-surface p-6 text-sm fiscal-muted">{t("Unidades em análise de disponibilidade. Consulte nossa equipe para mais informações.")}</div>
      :<div className="grid gap-4 md:grid-cols-2">
        {units.map(unit=><article key={unit.id} className="flex min-w-0 items-start gap-4 rounded-[22px] border fiscal-line fiscal-surface p-6 shadow-sm">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#142940] text-orange-300"><MapPin className="h-5 w-5"/></div>
          <div className="min-w-0"><span className="text-[11px] font-semibold uppercase tracking-widest fiscal-accent">{t("Unidade disponível para consulta")}</span>
            <h3 className="mt-2 break-words text-base font-bold fiscal-ink">{unit.name}</h3>
            <p className="mt-2 break-words text-sm leading-[1.7] fiscal-muted">{unit.street_address}</p>
            <p className="mt-2 text-xs font-semibold fiscal-muted">{unit.city} · {unit.state}</p>
          </div>
        </article>)}
      </div>}
  </section>

  <section className="relative overflow-hidden rounded-[26px] bg-[#112840] px-6 py-9 text-white sm:px-10 sm:py-11">
   <div className="pointer-events-none absolute -right-20 -top-16 h-60 w-60 rounded-full bg-[#d15a21]/20 blur-[75px]" aria-hidden="true"/>
   <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
     <div className="max-w-2xl"><span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-orange-300"><Gift className="h-4 w-4"/> {t('Condição especial')}</span>
       <h2 className="mt-3 text-2xl font-semibold leading-tight sm:text-[30px]">{t("Sua empresa já usa outro endereço fiscal?")}</h2>
       <p className="mt-3 text-sm leading-relaxed text-slate-300">{t("A MVA oferece uma campanha de transferência com até 4 meses gratuitos na contratação anual, sujeita à elegibilidade e comprovação.")}</p></div>
     <button type="button" onClick={()=>{setTerm(12);setTransfer(true);go('planos-fiscais')}} className="fiscal-white-cta inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold transition sm:w-auto">{t('Ver condição anual')} <ArrowRight className="h-4 w-4"/></button>
   </div>
  </section>

  <section id="duvidas-fiscais" className="scroll-mt-32 space-y-7">
   <div className="max-w-2xl space-y-3"><span className="text-[11px] font-bold uppercase tracking-[.2em] fiscal-accent">{t("Sem letras miúdas")}</span><h2 className="text-2xl font-semibold tracking-tight fiscal-ink sm:text-4xl">{t("Perguntas frequentes.")}</h2><p className="text-sm leading-relaxed fiscal-muted">{t("As respostas mais importantes antes de contratar seu escritório virtual.")}</p></div>
   <div className="grid min-w-0 gap-3">
    {faqs.map(({q,a})=><details key={q} className="group min-w-0 rounded-2xl border fiscal-line fiscal-surface p-4 open:border-orange-200 sm:p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-semibold fiscal-ink marker:content-none sm:text-[15px]">{t(q)}<ChevronDown className="h-5 w-5 shrink-0 fiscal-accent transition-transform group-open:rotate-180"/></summary>
      <p className="max-w-4xl pt-4 text-sm leading-[1.8] fiscal-muted">{t(a)}</p>
     </details>)}
   </div>
  </section>

  <section className="rounded-[26px] border border-[#283e57] bg-[#0e2035] px-6 py-10 text-white sm:px-10 sm:py-12">
   <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="max-w-2xl"><span className="text-[11px] font-bold uppercase tracking-widest text-orange-300">{t("Seu próximo passo")}</span><h2 className="mt-3 text-2xl font-semibold leading-tight sm:text-[32px]">{t("Pronto para profissionalizar seu endereço?")}</h2><p className="mt-3 text-sm leading-relaxed text-slate-300">{t("Escolha seu plano com tranquilidade. Nossa equipe confere os requisitos antes de qualquer liberação.")}</p></div>
    <div className="flex flex-col gap-3 sm:flex-row">
      <button type="button" onClick={()=>go('planos-fiscais')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#cc541c] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#af410f]">{t('Ver planos')} <ArrowRight className="h-4 w-4"/></button>
      <a href={mvaWhatsAppUrl(language,'fiscal')} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#48856b] bg-[#196647] px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#15563c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300">
        <MessageCircle className="h-4 w-4" aria-hidden="true"/> {t('Tirar dúvidas pelo WhatsApp')}
       </a>
      <button type="button" onClick={showArea} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10"><FileCheck2 className="h-4 w-4"/> {t('Minha área')}</button>
    </div>
   </div>
  </section>

  {/* Existing clients keep document/contract access, without exposing onboarding forms in the landing page. */}
  <div id="minha-area-fiscal" className="scroll-mt-32">
    {eligible && currentUser && <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">{t("Contrato ativo")}</p><p className="mt-1 break-words text-sm font-semibold fiscal-ink">{currentCompany.companyName}</p><p className="mt-1 text-xs fiscal-muted">{t("Acesse sua declaração de endereço fiscal no painel seguro da MVA.")}</p></div>
      <button type="button" onClick={()=>setCertificateOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-xs font-bold text-white"><FileCheck2 className="h-4 w-4"/> {t('Ver declaração')}</button>
     </div>}
    {currentUser && <div className="space-y-5">
       <button type="button" aria-expanded={clientAreaOpen} onClick={()=>setClientAreaOpen(v=>!v)} className="flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl border fiscal-line fiscal-surface px-5 py-4 text-left text-sm font-bold fiscal-ink">
        <span className="flex min-w-0 items-center gap-2"><FileCheck2 className="h-5 w-5 shrink-0 text-orange-600"/> {t('Acompanhar solicitações e documentos')}</span><ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${clientAreaOpen?'rotate-180':''}`}/>
       </button>
       {clientAreaOpen&&<FiscalServiceCenter mode="dashboard" initialPlan={selectedPlan} onCheckout={id=>start(id)}/>}
    </div>}
  </div>

  {checkoutOpen&&<FiscalCheckout planId={selectedPlan} initialTerm={term} transfer={term===12&&transfer} resumeOrderId={resumeOrderId}
    onClose={()=>{setCheckoutOpen(false);setResumeOrderId(undefined)}} onPaid={()=>{setClientAreaOpen(true);showToast(t('Status do pagamento atualizado.'),'info')}}/>}
  {certificateOpen&&<CertificateDialog onClose={()=>setCertificateOpen(false)} onChoosePlan={()=>{setCertificateOpen(false);start('mva_profissional')}}/>}
 </div>;
}
