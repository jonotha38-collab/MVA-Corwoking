import React, { useMemo, useRef, useState } from 'react';
import { useCoworking } from '../../context/CoworkingContext';
import { Space } from '../../types';
import { SpaceCard } from './SpaceCard';
import { SpaceDetailModal } from './SpaceDetailModal';
import { BookingModal } from './BookingModal';
import { Search, MapPin, Users, LayoutGrid, X, PlusCircle, Building2, Mail, ShieldCheck, CalendarCheck, Filter, ChevronDown } from 'lucide-react';

const CATEGORIES = [
  { id: 'todas', label: 'Todos' },
  { id: 'reuniao', label: 'Salas de reunião' },
  { id: 'atendimento', label: 'Atendimento e consultório' },
  { id: 'privada', label: 'Salas privadas' },
  { id: 'auditorio', label: 'Auditórios e eventos' },
];

const STEPS = [
  { title: 'Encontre', text: 'Busque por cidade, tipo de sala e capacidade.' },
  { title: 'Reserve', text: 'Escolha data e horário e confirme na hora.' },
  { title: 'Use', text: 'Faça o check-in na recepção e trabalhe com toda a infraestrutura.' },
];

const FAQ = [
  ['Como reservo uma sala?', 'Escolha o espaço, clique em reservar, informe data, horário e seus dados. A confirmação é imediata e aparece em "Minhas reservas".'],
  ['Posso contratar endereço fiscal?', 'Sim. Na página Endereço Fiscal você contrata o plano, acompanha o alvará e recebe a correspondência da sua empresa.'],
  ['Tenho um coworking. Como anuncio?', 'Crie uma conta como coworking, cadastre o espaço com fotos e endereço e envie. A equipe MVA analisa o anúncio antes de publicá-lo.'],
  ['Por que meu anúncio ainda não apareceu?', 'Todo espaço novo ou alterado passa por aprovação dos administradores. Você acompanha o status (em análise, aprovado ou rejeitado) no painel do anunciante.'],
];

export const MarketplaceView: React.FC = () => {
  const { spaces, searchQuery, setSearchQuery, selectedCity, setSelectedCity, selectedCategory, setSelectedCategory, setActiveTab } = useCoworking();
  const [capacity, setCapacity] = useState('all');
  const [sortBy, setSortBy] = useState<'rating' | 'priceAsc' | 'priceDesc' | 'capacity'>('rating');
  const [detail, setDetail] = useState<Space | null>(null);
  const [booking, setBooking] = useState<Space | null>(null);
  const results = useRef<HTMLElement>(null);

  const live = useMemo(() => spaces.filter(s => (s.approval ?? 'aprovado') === 'aprovado'), [spaces]);
  const cities = useMemo(() => ['Todas', ...Array.from(new Set(live.map(s => s.city)))], [live]);
  const hq = live.find(s => s.isMvaHeadquarters);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return live
      .filter(s => selectedCity === 'Todas' || s.city === selectedCity)
      .filter(s => selectedCategory === 'todas' || s.category === selectedCategory)
      .filter(s => capacity === 'all' || (capacity === 'small' ? s.capacity <= 4 : capacity === 'medium' ? s.capacity >= 5 && s.capacity <= 10 : s.capacity > 10))
      .filter(s => !q || [s.name, s.coworkingName, s.street, s.neighborhood, s.city, s.description, ...s.amenities].some(t => t.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (a.isMvaHeadquarters !== b.isMvaHeadquarters) return a.isMvaHeadquarters ? -1 : 1;
        return sortBy === 'rating' ? b.rating - a.rating : sortBy === 'priceAsc' ? a.pricePerHour - b.pricePerHour : sortBy === 'priceDesc' ? b.pricePerHour - a.pricePerHour : b.capacity - a.capacity;
      });
  }, [live, selectedCity, selectedCategory, capacity, searchQuery, sortBy]);

  const dirty = searchQuery || selectedCity !== 'Todas' || selectedCategory !== 'todas' || capacity !== 'all';
  const clear = () => { setSearchQuery(''); setSelectedCity('Todas'); setSelectedCategory('todas'); setCapacity('all'); };
  const search = (e: React.FormEvent) => { e.preventDefault(); results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const field = 'w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-navy-900 focus:border-orange-500 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30';

  return (
    <div className="space-y-16 pb-8">
      {/* Hero com busca */}
      <section className="relative overflow-hidden rounded-3xl bg-navy-950 px-6 py-12 text-white sm:px-12 sm:py-16">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-radial from-orange-500/15 to-transparent pointer-events-none" />
        <div className="relative max-w-3xl">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Espaços de coworking e salas de reunião {selectedCity !== 'Todas' ? `em ${selectedCity}` : 'para o seu negócio'}
          </h1>
          <p className="mt-4 max-w-xl text-base text-slate-300">
            Reserve salas na sede MVA, na Rua Dom José Thomaz, 565, ou em coworkings parceiros verificados.
          </p>
        </div>
        <form onSubmit={search} className="relative mt-8 grid gap-3 rounded-2xl bg-white p-3 shadow-xl md:grid-cols-12" role="search">
          <div className="relative md:col-span-4"><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Nome, bairro ou comodidade" aria-label="Buscar espaços" className={field} /></div>
          <div className="relative md:col-span-3"><MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden /><select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} aria-label="Cidade" className={field}>{cities.map(c => <option key={c} value={c}>{c === 'Todas' ? 'Todas as cidades' : c}</option>)}</select></div>
          <div className="relative md:col-span-3"><Users className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden /><select value={capacity} onChange={e => setCapacity(e.target.value)} aria-label="Capacidade" className={field}><option value="all">Qualquer capacidade</option><option value="small">Até 4 pessoas</option><option value="medium">5 a 10 pessoas</option><option value="large">Mais de 10 pessoas</option></select></div>
          <button className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600 md:col-span-2">Buscar</button>
        </form>
        <ul className="relative mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-300">
          <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-orange-400" aria-hidden />Espaços aprovados pela equipe MVA</li>
          <li className="flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-orange-400" aria-hidden />Confirmação imediata</li>
          <li className="flex items-center gap-2"><Building2 className="h-4 w-4 text-orange-400" aria-hidden />Endereço fiscal disponível</li>
        </ul>
      </section>

      {/* Resultados */}
      <section ref={results} className="scroll-mt-28" aria-labelledby="resultados">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="resultados" className="text-2xl font-bold text-navy-900">Espaços disponíveis</h2>
            <p className="text-sm text-slate-500">{filtered.length} {filtered.length === 1 ? 'espaço encontrado' : 'espaços encontrados'}</p>
          </div>
          <div className="flex items-center gap-3">
            {dirty && <button onClick={clear} className="flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700"><X className="h-4 w-4" aria-hidden />Limpar filtros</button>}
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} aria-label="Ordenar" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
              <option value="rating">Melhor avaliados</option><option value="priceAsc">Menor preço por hora</option><option value="priceDesc">Maior preço por hora</option><option value="capacity">Maior capacidade</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Tipo de espaço">
          {CATEGORIES.map(c => (
            <button key={c.id} role="tab" aria-selected={selectedCategory === c.id} onClick={() => setSelectedCategory(c.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${selectedCategory === c.id ? 'bg-navy-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-navy-900'}`}>
              {c.label}
            </button>
          ))}
        </div>
        {filtered.length > 0 ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(s => <SpaceCard key={s.id} space={s} onSelect={setDetail} onBook={setBooking} />)}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Filter className="mx-auto h-8 w-8 text-orange-500" aria-hidden />
            <h3 className="mt-3 text-lg font-bold text-navy-900">Nenhum espaço encontrado</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Altere a cidade, o tipo de sala ou a busca para ver mais opções.</p>
            <button onClick={clear} className="mt-5 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600">Ver todos os espaços</button>
          </div>
        )}
        {hq && live.filter(s => !s.isMvaHeadquarters).length === 0 && (
          <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-navy-200 bg-white p-6 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-bold text-navy-900">Seja o primeiro coworking parceiro</h3>
              <p className="text-sm text-slate-500">Hoje o marketplace reúne as salas da sede MVA. Anuncie o seu espaço e alcance novos clientes.</p>
            </div>
            <button onClick={() => setActiveTab('owner-dashboard')} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-800"><PlusCircle className="h-4 w-4" aria-hidden />Anunciar espaço</button>
          </div>
        )}
      </section>

      {/* Como funciona */}
      <section aria-labelledby="como">
        <h2 id="como" className="text-2xl font-bold text-navy-900">Como funciona</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-orange-500 text-sm font-bold text-white">{i + 1}</span>
              <h3 className="mt-4 font-bold text-navy-900">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Serviços */}
      <section aria-labelledby="servicos" className="grid gap-6 md:grid-cols-2">
        <h2 id="servicos" className="sr-only">Serviços para empresas</h2>
        {[
          { icon: Building2, title: 'Endereço fiscal', text: 'Use o endereço da sede MVA para o CNPJ da sua empresa, com acompanhamento do alvará.', tab: 'fiscal', cta: 'Contratar endereço fiscal' },
          { icon: Mail, title: 'Recebimento de correspondência', text: 'Cartas, encomendas e documentos recebidos, avisados e digitalizados pela recepção.', tab: 'correspondence', cta: 'Ver correspondências' },
        ].map(({ icon: Icon, title, text, tab, cta }) => (
          <div key={title} className="rounded-2xl bg-navy-950 p-8 text-white">
            <Icon className="h-7 w-7 text-orange-400" aria-hidden />
            <h3 className="mt-4 text-xl font-bold">{title}</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300">{text}</p>
            <button onClick={() => setActiveTab(tab)} className="mt-6 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold hover:bg-orange-600">{cta}</button>
          </div>
        ))}
      </section>

      {/* Anunciante */}
      <section className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-orange-200 bg-orange-50 p-8 md:flex-row md:items-center">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold text-navy-900">Tem um coworking? Anuncie na MVA</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Cadastre seu espaço com fotos e endereço. Depois da análise e aprovação da equipe MVA, ele aparece para todos os visitantes.</p>
        </div>
        <button onClick={() => setActiveTab('owner-dashboard')} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600"><LayoutGrid className="h-4 w-4" aria-hidden />Cadastrar meu espaço</button>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="max-w-3xl">
        <h2 id="faq" className="text-2xl font-bold text-navy-900">Perguntas frequentes</h2>
        <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-navy-900">{q}<ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden /></summary>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {detail && <SpaceDetailModal space={detail} onClose={() => setDetail(null)} onOpenBooking={setBooking} />}
      {booking && <BookingModal space={booking} onClose={() => setBooking(null)} />}
    </div>
  );
};
