import { ArrowRight, ArrowUpRight, CalendarCheck, Check, ChevronDown, ClipboardList, FileCheck2, Mail, MapPin, ShieldCheck, Users } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { isSpacePubliclyVisible } from '../../lib/space-visibility';
import type { MouseEvent } from 'react';
import { useCoworking } from '../../context/CoworkingContext';
import { usePreferences } from '../../lib/preferences';
import heroOffice from '../../assets/hero-office.jpg';

const copy = {
 pt: {
  eyebrow:'MVA Coworking · Aracaju/SE',line1:'Seu próximo passo',line2:'tem espaço aqui.',
  intro:'Do primeiro endereço da sua empresa à próxima grande reunião. Encontre na MVA a estrutura para trabalhar e seguir em frente.',
  cta:'Explorar espaços',more:'Conhecer endereço fiscal',badge1:'Sede em Aracaju',badge2:'Reservas organizadas',badge3:'Atendimento profissional',
  select:'O que você precisa hoje?',selectSub:'Salas, endereço fiscal e acompanhamento digital para sua empresa.',
  space:'Reservar uma sala',spaceDesc:'Encontre ambientes para reuniões, atendimentos e trabalho por hora. Confira fotos, estrutura e valores antes de reservar.',spaceBtn:'Ver espaços disponíveis',
  fiscal:'Contratar endereço fiscal',fiscalDesc:'Conheça os planos de endereço comercial e fiscal da MVA. Sujeito à análise de atividade, documentação e contratação.',fiscalBtn:'Ver planos e condições',
  status:'Acompanhar meu endereço fiscal',statusDesc:'Confira análise documental, pagamento e formalização do endereço em uma área reservada.',statusBtn:'Ver andamento da solicitação',
  about:'Uma operação real, com gestão digital',aboutText:'A MVA possui sede própria na Rua Dom José Thomaz, 565, bairro São José, em Aracaju. Conheça os ambientes disponíveis e reserve com segurança.',
  aboutOne:'Serviços e valores apresentados antes da solicitação',aboutTwo:'Gestão de reservas e acompanhamento pelo painel',aboutThree:'Privacidade e confirmação de elegibilidade para endereço fiscal',
  process:'Comece pelo que precisa',step1:'Escolha o serviço',step1D:'Veja os detalhes e as opções para sua empresa.',step2:'Confira disponibilidade',step2D:'Compare espaços, preços e condições de contratação.',step3:'Acompanhe no painel',step3D:'Acesse reservas e solicitações pela sua conta.',
  contactTitle:'Quer conversar antes de decidir?',contactBody:'Fale com a equipe da MVA para esclarecer dúvidas sobre a sede, as salas e os serviços.',contactCta:'Enviar e-mail à MVA',location:'Sede da MVA',online:'Reservas da sede MVA e planos elegíveis podem ser pagos com segurança pelo Stripe.'
 },
 en: {
  eyebrow:'MVA Coworking · Aracaju, Brazil',line1:'Make room for',line2:'your next step.',
  intro:'Meeting rooms, virtual office addresses and a place to showcase your coworking. Explore the right service for your business.',
  cta:'Explore spaces',more:'Discover fiscal address',badge1:'Based in Aracaju',badge2:'Organized reservations',badge3:'Professional service',
  select:'What do you need today?',selectSub:'Book rooms, manage a business address and track your requests online.',
  space:'Book a workspace',spaceDesc:'Find meeting rooms and workspaces by the hour. Review photos, amenities and prices before booking.',spaceBtn:'See available spaces',
  fiscal:'Get a business address',fiscalDesc:'Explore MVA commercial and registered business address plans. Eligibility and documentation review apply.',fiscalBtn:'See plans and terms',
  status:'Track my business address',statusDesc:'Follow document review, payment and formalization in your secure account.',statusBtn:'View request status',
  about:'A real location, digitally managed',aboutText:'MVA operates its own facilities at Rua Dom José Thomaz, 565, São José, Aracaju, Brazil. Explore available rooms and book securely.',
  aboutOne:'Understand services and prices beforehand',aboutTwo:'Track bookings on your dashboard',aboutThree:'Private records and eligibility checks for business addresses',
  process:'Getting started',step1:'Select a service',step1D:'Explore details and options.',step2:'Check availability',step2D:'Compare rooms, prices and conditions.',step3:'Track everything',step3D:'Manage bookings and requests in your account.',
  contactTitle:'Need help deciding?',contactBody:'Reach the MVA team with questions about rooms, the main office and services.',contactCta:'Email MVA',location:'MVA headquarters',online:'MVA headquarters room bookings and eligible plans can be paid securely via Stripe.'
 },
 es: {
  eyebrow:'MVA Coworking · Aracaju, Brasil',line1:'Tu próximo paso',line2:'tiene espacio aquí.',
  intro:'Salas de reuniones, domicilio fiscal y un escaparate para tu coworking. Encuentra el servicio indicado para tu empresa.',
  cta:'Explorar espacios',more:'Conocer domicilio fiscal',badge1:'Sede en Aracaju',badge2:'Reservas organizadas',badge3:'Atención profesional',
  select:'¿Qué necesitas hoy?',selectSub:'Salas, domicilio fiscal y seguimiento digital para tu empresa.',
  space:'Reservar una sala',spaceDesc:'Encuentra espacios para reuniones y trabajo por horas. Consulta fotos, servicios y precios antes de reservar.',spaceBtn:'Ver espacios disponibles',
  fiscal:'Contratar domicilio fiscal',fiscalDesc:'Conoce los planes de dirección comercial y fiscal de MVA. Sujetos a revisión y documentación.',fiscalBtn:'Ver planes y condiciones',
  status:'Seguir mi solicitud fiscal',statusDesc:'Consulta la revisión de documentos, el pago y la formalización desde tu cuenta.',statusBtn:'Ver estado de solicitud',
  about:'Un lugar real con gestión digital',aboutText:'MVA tiene instalaciones propias en Rua Dom José Thomaz, 565, São José, Aracaju, Brasil. Explora las salas disponibles y reserva con seguridad.',
  aboutOne:'Servicios y precios antes de contratar',aboutTwo:'Reservas organizadas en un panel',aboutThree:'Privacidad y verificación para el domicilio fiscal',
  process:'Cómo empezar',step1:'Elige el servicio',step1D:'Consulta detalles y opciones.',step2:'Verifica disponibilidad',step2D:'Compara salas, precios y condiciones.',step3:'Sigue tu solicitud',step3D:'Gestiona reservas desde tu cuenta.',
  contactTitle:'¿Necesitas orientación?',contactBody:'Habla con el equipo de MVA sobre salas, la sede y los servicios.',contactCta:'Escribir a MVA',location:'Sede MVA',online:'Las reservas de la sede MVA y los planes elegibles se pueden pagar de forma segura por Stripe.'
 }
} as const;

const extraCopy = {
 pt: {
  servicesLabel:'Para cada momento do seu negócio', serviceTags:['Trabalhe e reúna','Estabeleça sua empresa','Acompanhe sua solicitação'],
  photoAlt:'Sala de reunião da MVA com mesa, cadeiras e televisão',photoCaption:'Encontros que levam seu negócio adiante.',photoLabel:'Conheça o ambiente',
  roomsLabel:'Seu próximo encontro',roomsTitle:'Encontre o espaço certo.',roomsText:'Conheça os ambientes, compare a estrutura e confira os detalhes antes de reservar.',allRooms:'Explorar todos os espaços',details:'Conhecer espaço',capacity:'Até',people:'pessoas',perHour:'/ hora',
  placeLabel:'Perto de você, em Aracaju',placeTitle:'Seu negócio com um ponto de referência.',directions:'Como chegar',address:'Rua Dom José Thomaz, 565',neighborhood:'São José · Aracaju/SE · CEP 49015-090',
  faqLabel:'Antes de começar',faqTitle:'Vamos tirar suas dúvidas.',
  faqs:[['Preciso de uma conta para conhecer os espaços?','Você pode explorar fotos, estrutura e valores sem criar uma conta. Para registrar e acompanhar uma reserva, acesse sua conta na plataforma.'],['Como funciona o endereço fiscal?','Consulte os planos e condições na área de endereço fiscal. A contratação depende da análise de atividade e documentação, elegibilidade e confirmação de pagamento.'],['Os espaços são todos da MVA?','A sede própria da MVA fica na Rua Dom José Thomaz, 565, em Aracaju. No momento, os espaços disponíveis para reserva são da MVA. O cadastro de coworkings externos está temporariamente suspenso.']],
  contactLabel:'Conte com a MVA',contactSecondary:'Ligar para a sede',serviceNote:'Escolha um serviço para conhecer os detalhes e as condições.',
 },
 en: {
  servicesLabel:'For every stage of your business',serviceTags:['Work and meet','Establish your business','Track your request'],
  photoAlt:'MVA meeting room with a table, chairs and a television',photoCaption:'A place to move your business forward.',photoLabel:'Explore the setting',
  roomsLabel:'Your next meeting',roomsTitle:'Find the right space.',roomsText:'Explore the rooms, compare amenities and check the details before booking.',allRooms:'Explore all spaces',details:'View space',capacity:'Up to',people:'people',perHour:'/ hour',
  placeLabel:'Find us in Aracaju',placeTitle:'Give your business a place on the map.',directions:'Get directions',address:'Rua Dom José Thomaz, 565',neighborhood:'São José · Aracaju, Brazil · 49015-090',
  faqLabel:'Before you start',faqTitle:'A few helpful answers.',
  faqs:[['Do I need an account to browse spaces?','You can explore photos, amenities and prices without an account. Sign in to register and track a reservation.'],['How does a business address work?','See plans and terms in the business address section. A contract requires activity and document review, eligibility and confirmed payment.'],['Does MVA own every space?','MVA headquarters is at Rua Dom José Thomaz, 565, Aracaju. Currently, listed rooms belong to MVA. External coworking registrations are temporarily paused.']],
  contactLabel:'Here to help',contactSecondary:'Call MVA',serviceNote:'Choose a service to explore its details and terms.',
 },
 es: {
  servicesLabel:'Para cada etapa de tu negocio',serviceTags:['Trabaja y reúnete','Establece tu empresa','Sigue tu solicitud'],
  photoAlt:'Sala de reuniones de MVA con mesa, sillas y televisión',photoCaption:'Encuentros que impulsan tu negocio.',photoLabel:'Conoce el ambiente',
  roomsLabel:'Tu próximo encuentro',roomsTitle:'Encuentra el espacio ideal.',roomsText:'Conoce las salas, compara servicios y consulta los detalles antes de reservar.',allRooms:'Explorar todos los espacios',details:'Conocer espacio',capacity:'Hasta',people:'personas',perHour:'/ hora',
  placeLabel:'Cerca de ti, en Aracaju',placeTitle:'Tu negocio con un punto de referencia.',directions:'Cómo llegar',address:'Rua Dom José Thomaz, 565',neighborhood:'São José · Aracaju, Brasil · 49015-090',
  faqLabel:'Antes de empezar',faqTitle:'Resolvemos tus dudas.',
  faqs:[['¿Necesito una cuenta para ver los espacios?','Puedes explorar fotos, servicios y precios sin crear una cuenta. Accede a tu cuenta para registrar y seguir una reserva.'],['¿Cómo funciona el domicilio fiscal?','Consulta planes y condiciones en la sección de domicilio fiscal. La contratación requiere revisión de actividad y documentos, elegibilidad y pago confirmado.'],['¿Todos los espacios son de MVA?','La sede propia de MVA está en Rua Dom José Thomaz, 565, Aracaju. Por ahora, las salas anunciadas son de MVA. El registro de coworkings externos está suspendido temporalmente.']],
  contactLabel:'Cuenta con MVA',contactSecondary:'Llamar a MVA',serviceNote:'Elige un servicio para conocer sus detalles y condiciones.',
 },
} as const;

export function HomeView() {
 const {setActiveTab, spaces} = useCoworking();
 const {language} = usePreferences();
 const home = useRef<HTMLDivElement>(null);
 const c = copy[language];
 const e = extraCopy[language];
 const services = [
  {id:'marketplace',icon:CalendarCheck,name:c.space,description:c.spaceDesc,cta:c.spaceBtn},
  {id:'fiscal',icon:FileCheck2,name:c.fiscal,description:c.fiscalDesc,cta:c.fiscalBtn},
  {id:'fiscal-status',icon:ClipboardList,name:c.status,description:c.statusDesc,cta:c.statusBtn},
 ];
 const featured = spaces.filter(isSpacePubliclyVisible)
  .sort((a,b)=>Number(b.isMvaHeadquarters)-Number(a.isMvaHeadquarters)).slice(0,3);
 const hasFeaturedRooms = featured.length > 0;

 useEffect(() => {
  const page = home.current;
  if (!page || typeof IntersectionObserver === 'undefined') return;

  // Content stays visible before the observer runs and when it is unavailable.
  const observer = new IntersectionObserver(entries => {
   for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.setAttribute('data-home-visible', '');
    observer.unobserve(entry.target);
   }
  }, { rootMargin: '0px 0px -32px' });

  page.querySelectorAll('[data-home-reveal]:not([data-home-visible])')
   .forEach(element => observer.observe(element));
  return () => observer.disconnect();
 }, [hasFeaturedRooms]);

 // Preserve real links (including open in new tab) while using the existing SPA navigation.
 const navigate = (event: MouseEvent<HTMLAnchorElement>, page: string) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const target = new URL(event.currentTarget.href);
  window.history.replaceState(window.history.state, '', target.pathname + target.search);
  setActiveTab(page);
 };
 const link = (page: string) => ({href:`?page=${page}`,onClick:(event:MouseEvent<HTMLAnchorElement>)=>navigate(event,page)});
 return <div ref={home} className="mva-home home-redesign">
  <section className="home-hero" aria-labelledby="mva-home-title">
   <div className="home-hero-copy mva-glass-hero-copy">
    <p className="home-kicker"><span className="home-location-dot"/>{c.eyebrow}</p>
    <h1 id="mva-home-title">{c.line1}<span>{c.line2}</span></h1>
    <p className="home-intro">{c.intro}</p>
    <div className="home-hero-actions">
     <a {...link('marketplace')} className="home-button home-button-primary">{c.cta}<ArrowUpRight size={19} aria-hidden="true"/></a>
     <a {...link('fiscal')} className="home-text-link">{c.more}<ArrowRight size={17} aria-hidden="true"/></a>
    </div>
    <p className="home-hero-note"><ShieldCheck size={17} aria-hidden="true"/>{c.badge3} · {c.badge2}</p>
   </div>
   <figure className="home-hero-visual">
    <img src={heroOffice} alt={e.photoAlt} width="1024" height="768" fetchPriority="high"/>
    <div className="home-image-label"><span className="home-location-dot"/>{e.photoLabel}</div>
    <figcaption className="home-photo-caption">
     <div><span>MVA Coworking</span><p>{e.photoCaption}</p></div>
     <a {...link('marketplace')} aria-label={c.spaceBtn}><ArrowUpRight size={23} aria-hidden="true"/></a>
    </figcaption>
   </figure>
  </section>

  <section className="home-services home-section" aria-labelledby="mva-home-services">
   <div className="home-section-heading"><div><p className="home-kicker">{e.servicesLabel}</p><h2 id="mva-home-services">{c.select}</h2></div><p>{e.serviceNote}</p></div>
   <div className="home-service-grid">
    {services.map(({id,icon:Icon,name,description,cta},i)=><article key={id} className="home-service-card" data-home-reveal>
     <div className="home-service-top"><span className="home-service-icon"><Icon size={23} aria-hidden="true"/></span><span>{e.serviceTags[i]}</span></div>
     <h3>{name}</h3><p>{description}</p>
     <a {...link(id)} className="home-card-link">{cta}<ArrowUpRight size={19} aria-hidden="true"/></a>
    </article>)}
   </div>
  </section>

  {hasFeaturedRooms && <section className="home-section" aria-labelledby="home-rooms-title">
   <div className="home-section-heading" data-home-reveal><div><p className="home-kicker">{e.roomsLabel}</p><h2 id="home-rooms-title">{e.roomsTitle}</h2></div><a {...link('marketplace')} className="home-text-link">{e.allRooms}<ArrowRight size={18} aria-hidden="true"/></a></div>
   <p className="home-section-intro">{e.roomsText}</p>
   <div className="home-room-grid">
    {featured.map(space=><article className="home-room-card" key={space.id}>
     <a className="home-room-image" href={`?page=marketplace&space=${encodeURIComponent(space.id)}`} onClick={event=>navigate(event,'marketplace')} aria-label={`${e.details}: ${space.name}`}>
      <img src={space.image} alt={space.name} width="640" height="440" loading="lazy" decoding="async"/>
      {space.isMvaHeadquarters && <span><MapPin size={13} aria-hidden="true"/>{c.location}</span>}
     </a>
     <div className="home-room-body"><p className="home-room-location">{space.neighborhood} · {space.city}</p><h3><a href={`?page=marketplace&space=${encodeURIComponent(space.id)}`} onClick={event=>navigate(event,'marketplace')}>{space.name}</a></h3>
      <p className="home-room-capacity"><Users size={16} aria-hidden="true"/>{e.capacity} {space.capacity} {e.people}</p>
      <div className="home-room-bottom"><p><strong>{new Intl.NumberFormat(language==='pt'?'pt-BR':language==='es'?'es':'en',{style:'currency',currency:'BRL'}).format(space.pricePerHour)}</strong><span>{e.perHour}</span></p><a href={`?page=marketplace&space=${encodeURIComponent(space.id)}`} onClick={event=>navigate(event,'marketplace')} aria-label={`${e.details}: ${space.name}`}><ArrowUpRight size={21} aria-hidden="true"/></a></div>
     </div>
    </article>)}
   </div>
  </section>}

  <section className="home-location home-section" aria-labelledby="home-location-title">
   <div className="home-location-address mva-glass-navy" data-home-reveal><MapPin size={30} strokeWidth={1.5} aria-hidden="true"/><p className="home-kicker">{c.location}</p><h3>{e.address}</h3><p>{e.neighborhood}</p><a href="https://www.google.com/maps/search/?api=1&query=Rua+Dom+Jos%C3%A9+Thomaz+565+S%C3%A3o+Jos%C3%A9+Aracaju+SE" target="_blank" rel="noopener noreferrer" className="home-location-link">{e.directions}<ArrowUpRight size={18} aria-hidden="true"/></a></div>
   <div className="home-location-copy mva-glass-info-panel"><p className="home-kicker">{e.placeLabel}</p><h2 id="home-location-title">{e.placeTitle}</h2><p>{c.aboutText}</p><ul>{[c.aboutOne,c.aboutTwo,c.aboutThree].map(item=><li key={item}><Check size={18} aria-hidden="true"/>{item}</li>)}</ul></div>
  </section>

  <section className="home-process home-section mva-glass-steps" aria-labelledby="home-process-title">
   <div className="home-section-heading"><div><p className="home-kicker">MVA Coworking</p><h2 id="home-process-title">{c.process}</h2></div></div>
   <ol>{[[c.step1,c.step1D],[c.step2,c.step2D],[c.step3,c.step3D]].map(([title,desc],i)=><li key={title}><span className="home-step">0{i+1}</span><div><h3>{title}</h3><p>{desc}</p></div></li>)}</ol>
  </section>

  <section className="home-faq home-section mva-glass-faq" aria-labelledby="home-faq-title">
   <div><p className="home-kicker">{e.faqLabel}</p><h2 id="home-faq-title">{e.faqTitle}</h2></div>
   <div>{e.faqs.map(([q,a])=><details key={q}><summary>{q}<ChevronDown size={19} aria-hidden="true"/></summary><p>{a}</p></details>)}</div>
  </section>

  <section className="home-contact home-section" aria-labelledby="home-contact-title"><div><p className="home-kicker">{e.contactLabel}</p><h2 id="home-contact-title">{c.contactTitle}</h2><p>{c.contactBody}</p></div><div className="home-contact-actions"><a href="mailto:contato@mvacoworking.com.br?subject=Atendimento%20MVA%20Coworking" className="home-button home-button-light"><Mail size={18} aria-hidden="true"/>{c.contactCta}<ArrowUpRight size={18} aria-hidden="true"/></a><a href="tel:+557932145500" className="home-contact-phone">{e.contactSecondary} · (79) 3214-5500</a></div></section>
 </div>;
}
