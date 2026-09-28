import React from 'react';
import { Space } from '../../types';
import { Users, MapPin, Star, Calendar, ArrowUpRight, Sparkles, Building2 } from 'lucide-react';

interface SpaceCardProps {
  space: Space;
  onSelect: (space: Space) => void;
  onBook: (space: Space) => void;
}

export const SpaceCard: React.FC<SpaceCardProps> = ({ space, onSelect, onBook }) => {
  const categoryLabels = {
    reuniao: 'Sala de Reunião',
    atendimento: 'Atendimento & Consultório',
    auditorio: 'Auditório',
    privada: 'Sala Privativa'
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-orange-300 transition-all duration-300 flex flex-col overflow-hidden">
      
      {/* Image Container */}
      <div 
        onClick={() => onSelect(space)}
        className="relative h-52 w-full overflow-hidden bg-slate-100 cursor-pointer"
      >
        <img
          src={space.image}
          alt={space.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-90 group-hover:opacity-75 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1">
          {space.isMvaHeadquarters ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide bg-orange-600 text-white shadow-xs backdrop-blur-md flex items-center gap-1 border border-orange-400">
              <Sparkles className="w-3 h-3 text-orange-200" />
              SEDE OFICIAL MVA
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide bg-navy-900/90 text-white shadow-xs backdrop-blur-md border border-navy-700">
              {categoryLabels[space.category]}
            </span>
          )}

          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-white/95 text-slate-800 backdrop-blur-md shadow-xs">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            {space.rating}
          </span>
        </div>

        {/* Bottom Address preview */}
        <div className="absolute bottom-3 left-3 right-3 text-white flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 drop-shadow-sm font-medium truncate max-w-[60%] sm:max-w-[210px]">
            <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="truncate">{space.street}, {space.number}</span>
          </div>
          <span className="text-[10px] text-slate-200 bg-navy-950/80 px-2 py-0.5 rounded backdrop-blur-xs font-semibold">
            {space.city} - {space.state}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wide truncate">
              {space.coworkingName}
            </span>
            {space.isMvaHeadquarters && (
              <span className="text-[10px] text-slate-400 font-medium">Sede MVA</span>
            )}
          </div>
          
          <h3 
            onClick={() => onSelect(space)}
            className="font-bold text-base text-navy-900 group-hover:text-orange-600 transition-colors line-clamp-1 cursor-pointer"
          >
            {space.name}
          </h3>

          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {space.description}
          </p>

          {/* Quick specs chips */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
              <Users className="w-3 h-3 text-slate-500" />
              Até {space.capacity} pess.
            </span>
            {space.amenities.slice(0, 2).map((amenity, i) => (
              <span key={i} className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200/60 truncate max-w-[45%] sm:max-w-[130px]">
                {amenity}
              </span>
            ))}
            {space.amenities.length > 2 && (
              <span className="px-1.5 py-1 text-[10px] text-slate-500 font-semibold">
                +{space.amenities.length - 2}
              </span>
            )}
          </div>
        </div>

        {/* Price & Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] text-slate-400 block leading-tight uppercase font-medium">Valor hora</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-navy-900">R$ {space.pricePerHour}</span>
              <span className="text-[11px] text-slate-500 font-medium">/hora</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSelect(space)}
              className="p-2 text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors"
              title="Ver detalhes e fotos"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onBook(space)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-orange-500/20 transition-all"
            >
              <Calendar className="w-3.5 h-3.5" />
              Reservar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
