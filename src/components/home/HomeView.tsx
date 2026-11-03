import { ArrowRight, ArrowUpRight, BadgeCheck, Building2, CalendarCheck, CheckCircle2, ChevronRight, FileCheck2, Headphones, Mail, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { useCoworking } from '../../context/CoworkingContext';
import { usePreferences } from '../../lib/preferences';
import heroOffice from '../../assets/hero-office.jpg';

const copy = {
 pt: {
  eyebrow:'MVA Coworking · Aracaju/SE',line1:'Um espaço para trabalhar.',line2:'Uma plataforma para crescer.',
  intro:'Salas de reunião, endereço fiscal e uma vitrine para seu coworking. Escolha o serviço ideal e acompanhe tudo em um só lugar.',
  cta:'Explorar espaços',more:'Conhecer endereço fiscal',badge1:'Sede em Aracaju',badge2:'Reservas organizadas',badge3:'Anúncios com análise',
  select:'O que você precisa hoje?',selectSub:'Três caminhos claros para profissionais, empresas e proprietários de coworkings.',
  space:'Reservar uma sala',spaceDesc:'Encontre ambientes para reuniões, atendimentos e trabalho por hora. Confira fotos, estrutura e valores antes de reservar.',spaceBtn:'Ver espaços disponíveis',
  fiscal:'Contratar endereço fiscal',fiscalDesc:'Conheça os planos de endereço comercial e fiscal da MVA. Sujeito à análise de atividade, documentação e contratação.',fiscalBtn:'Ver planos e condições',
  owner:'Anunciar meu coworking',ownerDesc:'Cadastre seus espaços, envie fotos e solicite a publicação no marketplace. Novos anúncios passam por análise da MVA.',ownerBtn:'Conhecer painel do proprietário',
  about:'Uma operação real, com gestão digital',aboutText:'A MVA possui sua sede na Rua Dom José Thomaz, 565, bairro São José, em Aracaju. Coworkings parceiros são identificados separadamente no marketplace.',
  aboutOne:'Serviços e valores apresentados antes da solicitação',aboutTwo:'Gestão de reservas e acompanhamento pelo painel',aboutThree:'Privacidade e confirmação de elegibilidade para endereço fiscal',
  process:'Comece pelo que precisa',step1:'Escolha o serviço',step1D:'Veja os detalhes e as opções para sua empresa.',step2:'Confira disponibilidade',step2D:'Compare espaços, preços e condições de contratação.',step3:'Acompanhe no painel',step3D:'Acesse reservas e solicitações pela sua conta.',
  contactTitle:'Quer conversar antes de decidir?',contactBody:'Fale com a equipe da MVA para esclarecer dúvidas sobre a sede, as salas e os serviços.',contactCta:'Enviar e-mail à MVA',location:'Sede da MVA',online:'Pagamento online ainda em implantação. Reservas e contratos são registrados conforme suas condições específicas.'
 },
 en: {
  eyebrow:'MVA Coworking · Aracaju, Brazil',line1:'A place to work.',line2:'A platform to grow.',
  intro:'Meeting rooms, virtual office addresses and a place to showcase your coworking. Explore the right service for your business.',
  cta:'Explore spaces',more:'Discover fiscal address',badge1:'Based in Aracaju',badge2:'Organized reservations',badge3:'Listings reviewed',
  select:'What do you need today?',selectSub:'Three straightforward paths for professionals, businesses and coworking owners.',
  space:'Book a workspace',spaceDesc:'Find meeting rooms and workspaces by the hour. Review photos, amenities and prices before booking.',spaceBtn:'See available spaces',
  fiscal:'Get a business address',fiscalDesc:'Explore MVA commercial and registered business address plans. Eligibility and documentation review apply.',fiscalBtn:'See plans and terms',
  owner:'List my coworking',ownerDesc:'Add rooms, upload photos and request a marketplace listing. MVA reviews new listings.',ownerBtn:'Open the owner area',
  about:'A real location, digitally managed',aboutText:'MVA operates from Rua Dom José Thomaz, 565, São José, Aracaju, Brazil. Partner coworkings are identified separately.',
  aboutOne:'Understand services and prices beforehand',aboutTwo:'Track bookings on your dashboard',aboutThree:'Private records and eligibility checks for business addresses',
  process:'Getting started',step1:'Select a service',step1D:'Explore details and options.',step2:'Check availability',step2D:'Compare rooms, prices and conditions.',step3:'Track everything',step3D:'Manage bookings and requests in your account.',
  contactTitle:'Need help deciding?',contactBody:'Reach the MVA team with questions about rooms, the main office and services.',contactCta:'Email MVA',location:'MVA headquarters',online:'Online payments are being prepared. Reservations and contracts follow their respective terms.'
 },
 es: {
  eyebrow:'MVA Coworking · Aracaju, Brasil',line1:'Un espacio para trabajar.',line2:'Una plataforma para crecer.',
  intro:'Salas de reuniones, domicilio fiscal y un escaparate para tu coworking. Encuentra el servicio indicado para tu empresa.',
  cta:'Explorar espacios',more:'Conocer domicilio fiscal',badge1:'Sede en Aracaju',badge2:'Reservas organizadas',badge3:'Anuncios revisados',
  select:'¿Qué necesitas hoy?',selectSub:'Tres caminos para profesionales, empresas y propietarios de coworkings.',
  space:'Reservar una sala',spaceDesc:'Encuentra espacios para reuniones y trabajo por horas. Consulta fotos, servicios y precios antes de reservar.',spaceBtn:'Ver espacios disponibles',
  fiscal:'Contratar domicilio fiscal',fiscalDesc:'Conoce los planes de dirección comercial y fiscal de MVA. Sujetos a revisión y documentación.',fiscalBtn:'Ver planes y condiciones',
  owner:'Anunciar mi coworking',ownerDesc:'Registra espacios, agrega fotos y solicita su publicación. MVA revisa los anuncios nuevos.',ownerBtn:'Abrir panel del propietario',
  about:'Un lugar real con gestión digital',aboutText:'MVA tiene su sede en Rua Dom José Thomaz, 565, São José, Aracaju, Brasil. Los socios se identifican por separado.',
  aboutOne:'Servicios y precios antes de contratar',aboutTwo:'Reservas organizadas en un panel',aboutThree:'Privacidad y verificación para el domicilio fiscal',
  process:'Cómo empezar',step1:'Elige el servicio',step1D:'Consulta detalles y opciones.',step2:'Verifica disponibilidad',step2D:'Compara salas, precios y condiciones.',step3:'Sigue tu solicitud',step3D:'Gestiona reservas desde tu cuenta.',
  contactTitle:'¿Necesitas orientación?',contactBody:'Habla con el equipo de MVA sobre salas, la sede y los servicios.',contactCta:'Escribir a MVA',location:'Sede MVA',online:'El pago en línea está en preparación. Las reservas y los contratos siguen sus condiciones respectivas.'
 }
} as const;

export function HomeView(){
 const {setActiveTab,spaces}=useCoworking();
 const {language}=usePreferences();
 const c=copy[language];
 const services=[
  {id:'marketplace',icon:CalendarCheck,name:c.space,description:c.spaceDesc,cta:c.spaceBtn,tag:'01',accent:'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300'},
  {id:'fiscal',icon:FileCheck2,name:c.fiscal,description:c.fiscalDesc,cta:c.fiscalBtn,tag:'02',accent:'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'},
  {id:'owner-dashboard',icon:Building2,name:c.owner,description:c.ownerDesc,cta:c.ownerBtn,tag:'03',accent:'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}
 ];
 const publicCount=spaces.filter(s=>s.approval==='aprovado'&&s.status==='available').length;
 return <div className="mva-home min-w-0 space-y-16 pb-12 sm:space-y-20">
  <section className="relative isolate overflow-hidden rounded-[24px] bg-[#0c2036] text-white shadow-[0_20px_55px_rgba(9,22,41,.15)] sm:rounded-[30px]" aria-labelledby="mva-home-title">
   <img src={heroOffice} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 lg:left-auto lg:w-[65%] lg:opacity-65" aria-hidden="true"/>
   <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0c2036] via-[#0c2036]/95 to-[#0c2036]/35"/>
   <div className="relative z-10 max-w-4xl space-y-7 px-5 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
    <p className="inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[.13em] text-orange-200"><Sparkles className="h-4 w-4"/>{c.eyebrow}</p>
    <h1 id="mva-home-title" className="max-w-3xl text-[clamp(2.15rem,5vw,4.4rem)] font-semibold leading-[1.09] tracking-[-.055em]">{c.line1}<span className="mt-1 block text-orange-200">{c.line2}</span></h1>
    <p className="max-w-xl text-base leading-[1.85] text-slate-200 sm:text-lg">{c.intro}</p>
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
     <button type="button" onClick={()=>setActiveTab('marketplace')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#cb541a] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#b3420d]">{c.cta}<ArrowRight className="h-4 w-4"/></button>
     <button type="button" onClick={()=>setActiveTab('fiscal')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20">{c.more}<ArrowUpRight className="h-4 w-4"/></button>
    </div>
    <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-white/20 pt-6 text-xs text-slate-200">
     {[c.badge1,c.badge2,c.badge3].map(x=><span key={x} className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-300"/>{x}</span>)}
    </div>
   </div>
  </section>

  <section aria-labelledby="mva-home-services" className="space-y-7">
   <div className="max-w-2xl space-y-3"><p className="text-xs font-bold uppercase tracking-[.17em] text-[#be531f] dark:text-orange-300">MVA Coworking</p><h2 id="mva-home-services" className="text-2xl font-semibold tracking-tight text-navy-950 dark:text-slate-100 sm:text-4xl">{c.select}</h2><p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{c.selectSub}</p></div>
   <div className="grid gap-5 lg:grid-cols-3">
    {services.map(({id,icon:Icon,name,description,cta,tag,accent})=><article key={id} className="flex min-w-0 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-orange-300 hover:shadow-lg dark:border-slate-700 dark:bg-[#192b40] sm:p-7">
      <div className="flex items-center justify-between"><span className={`grid h-14 w-14 place-items-center rounded-2xl ${accent}`}><Icon className="h-6 w-6"/></span><span className="text-xs font-bold tracking-widest text-slate-400 dark:text-slate-500">{tag}</span></div>
      <h3 className="mt-7 text-xl font-semibold text-navy-950 dark:text-slate-100">{name}</h3>
      <p className="mt-3 flex-1 text-sm leading-[1.8] text-slate-600 dark:text-slate-300">{description}</p>
      <button type="button" onClick={()=>setActiveTab(id)} className="mt-8 inline-flex min-h-11 items-center justify-between gap-3 border-t border-slate-100 pt-5 text-left text-sm font-bold text-[#b54815] hover:text-[#98340b] dark:border-slate-700 dark:text-orange-300 dark:hover:text-orange-200">{cta}<ArrowUpRight className="h-5 w-5 shrink-0"/></button>
     </article>)}
   </div>
   {publicCount===0&&<p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-[#192b40] dark:text-slate-300">{c.online}</p>}
  </section>

  <section className="grid min-w-0 gap-0 overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#192b40] lg:grid-cols-[.94fr_1.06fr]">
    <div className="bg-[#102840] p-7 text-white sm:p-10 lg:p-12">
     <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-orange-300"><MapPin className="h-4 w-4"/>{c.location}</span>
     <h2 className="mt-5 max-w-sm text-2xl font-semibold leading-tight sm:text-3xl">{c.about}</h2>
     <p className="mt-5 text-sm leading-[1.9] text-slate-200">{c.aboutText}</p>
     <div className="mt-7 flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 p-3 text-xs text-slate-200"><MapPin className="h-4 w-4 shrink-0 text-orange-200"/>Rua Dom José Thomaz, 565 · Aracaju/SE</div>
    </div>
    <div className="space-y-6 p-7 sm:p-10 lg:p-12">
      {[c.aboutOne,c.aboutTwo,c.aboutThree].map((item,i)=><div key={item} className={`flex items-start gap-4 ${i>0?'border-t border-slate-100 pt-6 dark:border-slate-700':''}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-[#a63e10] dark:bg-orange-500/10 dark:text-orange-300">{i===0?<BadgeCheck className="h-5 w-5"/>:i===1?<CalendarCheck className="h-5 w-5"/>:<ShieldCheck className="h-5 w-5"/>}</span><p className="pt-2 text-sm font-medium leading-7 text-navy-900 dark:text-slate-100">{item}</p></div>)}
    </div>
  </section>

  <section className="space-y-7">
    <div className="max-w-2xl"><h2 className="text-2xl font-semibold text-navy-950 dark:text-slate-100 sm:text-3xl">{c.process}</h2></div>
    <ol className="grid gap-4 md:grid-cols-3">{[[c.step1,c.step1D],[c.step2,c.step2D],[c.step3,c.step3D]].map(([title,desc],i)=><li key={title} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-[#192b40]"><span className="font-semibold text-[#b54815] dark:text-orange-300">0{i+1}</span><h3 className="mt-4 text-lg font-semibold text-navy-900 dark:text-slate-100">{title}</h3><p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{desc}</p></li>)}</ol>
  </section>

  <section className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-[#102840] p-7 text-white sm:p-10 lg:flex-row lg:items-center">
   <div className="max-w-xl"><p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.13em] text-orange-300"><Headphones className="h-4 w-4"/>Atendimento</p><h2 className="text-2xl font-semibold sm:text-3xl">{c.contactTitle}</h2><p className="mt-3 text-sm leading-7 text-slate-300">{c.contactBody}</p></div>
   <a href="mailto:contato@mvacoworking.com.br?subject=Atendimento%20MVA%20Coworking" className="mva-home-white-cta inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition sm:w-auto"><Mail className="h-4 w-4"/>{c.contactCta}<ChevronRight className="h-4 w-4"/></a>
  </section>
 </div>;
}
