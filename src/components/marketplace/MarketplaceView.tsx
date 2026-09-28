import React, { useState, useMemo } from 'react';
import { useCoworking } from '../../context/CoworkingContext';
import { Space } from '../../types';
import { SpaceCard } from './SpaceCard';
import { SpaceDetailModal } from './SpaceDetailModal';
import { BookingModal } from './BookingModal';
import { 
  Search, 
  MapPin, 
  Filter, 
  Sparkles, 
  Building2, 
  SlidersHorizontal,
  X,
  PlusCircle
} from 'lucide-react';

export const MarketplaceView: React.FC = () => {
  const { 
    spaces, 
    searchQuery, 
    setSearchQuery, 
    selectedCity, 
    setSelectedCity, 
    selectedCategory, 
    setSelectedCategory,
    setActiveTab 
  } = useCoworking();

  const [capacityFilter, setCapacityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'priceAsc' | 'priceDesc' | 'capacity'>('rating');
  const [detailSpace, setDetailSpace] = useState<Space | null>(null);
  const [bookingSpace, setBookingSpace] = useState<Space | null>(null);

  // Extract cities
  const cities = useMemo(() => {
    const set = new Set<string>();
    spaces.forEach(s => set.add(s.city));
    return ['Todas', ...Array.from(set)];
  }, [spaces]);

  // Categories list
  const categories: { id: string; label: string; count: number }[] = useMemo(() => {
    return [
      { id: 'todas', label: 'Todos os Espaços', count: spaces.length },
      { id: 'reuniao', label: 'Salas de Reunião', count: spaces.filter(s => s.category === 'reuniao').length },
      { id: 'atendimento', label: 'Atendimento & Consultório', count: spaces.filter(s => s.category === 'atendimento').length },
      { id: 'auditorio', label: 'Auditórios & Eventos', count: spaces.filter(s => s.category === 'auditorio').length },
      { id: 'privada', label: 'Salas Privadas', count: spaces.filter(s => s.category === 'privada').length },
    ];
  }, [spaces]);

  // Filtered & sorted spaces
  const filteredSpaces = useMemo(() => {
    return spaces
      .filter(space => {
        if (selectedCity !== 'Todas' && space.city !== selectedCity) return false;
        if (selectedCategory !== 'todas' && space.category !== selectedCategory) return false;

        if (capacityFilter === 'small' && space.capacity > 4) return false;
        if (capacityFilter === 'medium' && (space.capacity < 5 || space.capacity > 10)) return false;
        if (capacityFilter === 'large' && space.capacity <= 10) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = space.name.toLowerCase().includes(q);
          const matchCoworking = space.coworkingName.toLowerCase().includes(q);
          const matchStreet = space.street.toLowerCase().includes(q);
          const matchNeighborhood = space.neighborhood.toLowerCase().includes(q);
          const matchCity = space.city.toLowerCase().includes(q);
          const matchDesc = space.description.toLowerCase().includes(q);
          const matchAmenities = space.amenities.some(a => a.toLowerCase().includes(q));
          return matchName || matchCoworking || matchStreet || matchNeighborhood || matchCity || matchDesc || matchAmenities;
        }

        return true;
      })
      .sort((a, b) => {
        // Always prioritize MVA headquarters on top unless filtered
        if (a.isMvaHeadquarters && !b.isMvaHeadquarters) return -1;
        if (!a.isMvaHeadquarters && b.isMvaHeadquarters) return 1;

        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'priceAsc') return a.pricePerHour - b.pricePerHour;
        if (sortBy === 'priceDesc') return b.pricePerHour - a.pricePerHour;
        if (sortBy === 'capacity') return b.capacity - a.capacity;
        return 0;
      });
  }, [spaces, selectedCity, selectedCategory, capacityFilter, searchQuery, sortBy]);

  return (
    <div className="space-y-8 pb-16">
      
      {/* Hero Banner - Minimalist Deep Navy & Orange */}
      <div className="rounded-3xl bg-navy-950 text-white p-6 sm:p-10 border border-navy-800 shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>MVA Coworking • Sede: Rua Dom José Thomaz, 565</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Reserve salas de reunião e atendimento ou anuncie seu espaço de coworking.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            A MVA Coworking disponibiliza sua sede na Rua Dom José Thomaz, 565 e conecta empresas de coworking de todo o país para que profissionais reservem salas com infraestrutura de ponta.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('owner-dashboard')}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-orange-500/25 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Sou Dono de Coworking: Anunciar Espaço
            </button>

            <button
              onClick={() => setActiveTab('fiscal')}
              className="px-5 py-2.5 bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-2"
            >
              <Building2 className="w-4 h-4 text-orange-400" />
              Contratar Endereço Fiscal para CNPJ
            </button>
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-orange-500/10 to-transparent pointer-events-none" />
      </div>

      {/* Sede MVA Official Highlight Card */}
      <div className="bg-gradient-to-r from-navy-900 to-navy-950 border border-orange-500/30 rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center font-bold text-white shrink-0 shadow-sm">
            MVA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-sm font-bold text-white">Sede Oficial MVA Coworking</strong>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                Aracaju / SE
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Rua Dom José Thomaz, 565 - São José, Aracaju - SE • Salas de Reunião, Atendimento Acústico & Endereço Fiscal
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedCity('Aracaju');
            setSearchQuery('');
          }}
          className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 rounded-xl text-xs font-bold transition-colors whitespace-nowrap self-stretch sm:self-auto text-center"
        >
          Ver Salas da Sede MVA
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
        
        {/* Top search inputs row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, rua, comodidade (ex: Dom José Thomaz, acústica, 4K)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-slate-50/60"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="md:col-span-3 relative">
            <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-slate-50/60 font-medium"
            >
              {cities.map(city => (
                <option key={city} value={city}>
                  {city === 'Todas' ? 'Todas as Cidades' : city}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 relative">
            <SlidersHorizontal className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <select
              value={capacityFilter}
              onChange={e => setCapacityFilter(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-slate-50/60 font-medium"
            >
              <option value="all">Qualquer Capacidade</option>
              <option value="small">1 a 4 pessoas (Atendimento)</option>
              <option value="medium">5 a 10 pessoas (Reunião média)</option>
              <option value="large">10+ pessoas (Auditórios / Grandes)</option>
            </select>
          </div>
        </div>

        {/* Category Pills & Sort Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-navy-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="text-xs text-slate-500 font-medium">Ordenar:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            >
              <option value="rating">Melhor Avaliados</option>
              <option value="priceAsc">Menor Preço/h</option>
              <option value="priceDesc">Maior Preço/h</option>
              <option value="capacity">Maior Capacidade</option>
            </select>
          </div>

        </div>

      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-navy-900">
            Espaços Disponíveis para Agendamento
          </h2>
          <p className="text-xs text-slate-500">
            Exibindo {filteredSpaces.length} salas (Sede MVA e parceiros credenciados)
          </p>
        </div>

        {(searchQuery || selectedCity !== 'Todas' || selectedCategory !== 'todas' || capacityFilter !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCity('Todas');
              setSelectedCategory('todas');
              setCapacityFilter('all');
            }}
            className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Limpar Filtros
          </button>
        )}
      </div>

      {/* Spaces Grid */}
      {filteredSpaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpaces.map(space => (
            <SpaceCard
              key={space.id}
              space={space}
              onSelect={s => setDetailSpace(s)}
              onBook={s => setBookingSpace(s)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center mx-auto">
            <Filter className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-navy-900">Nenhum espaço encontrado</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Não encontramos salas que correspondam aos filtros selecionados. Tente alterar a cidade ou limpar a busca.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCity('Todas');
              setSelectedCategory('todas');
              setCapacityFilter('all');
            }}
            className="px-5 py-2 text-xs font-semibold bg-orange-600 text-white rounded-xl shadow-xs hover:bg-orange-500 transition-colors"
          >
            Ver Todas as Salas
          </button>
        </div>
      )}

      {/* Modals */}
      {detailSpace && (
        <SpaceDetailModal
          space={detailSpace}
          onClose={() => setDetailSpace(null)}
          onOpenBooking={s => setBookingSpace(s)}
        />
      )}

      {bookingSpace && (
        <BookingModal
          space={bookingSpace}
          onClose={() => setBookingSpace(null)}
        />
      )}

    </div>
  );
};
