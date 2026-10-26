import { t } from '../../lib/preferences';
import React from 'react';
import { Space } from '../../types';
import { Users, MapPin, Star, Calendar, ArrowUpRight, Building2 } from 'lucide-react';

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
    <div className="surface-card group w-full bg-white rounded-2xl border border-slate-200/80 flex flex-col overflow-hidden hover:border-slate-300 transition-all duration-300">
      
      {/* Image Container */}
      <button
        type="button"
        aria-label={`Ver detalhes de ${space.name}`}
        onClick={() => onSelect(space)}
        className="relative h-52 w-full overflow-hidden bg-slate-100 cursor-pointer"
      >
        <img
          src={space.image}
          alt={space.name}
          className="w-full h-full object-cover group-hover:scale-[1.025] transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-90 group-hover:opacity-75 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1">
          {t(space.isMvaHeadquarters ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide bg-orange-600 text-white shadow-sm backdrop-blur-md flex items-center gap-1 border border-orange-400">
              <Building2 className="w-3 h-3 text-orange-200" />{t("SEDE OFICIAL MVA ")}</span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide bg-navy-900/90 text-white shadow-sm backdrop-blur-md border border-navy-700">
              {categoryLabels[space.category]}
            </span>
          ))}

          {t(space.reviewsCount > 0 ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-white/95 text-slate-800 backdrop-blur-md shadow-sm">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            {t(space.rating)}
          </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/95 text-slate-800 backdrop-blur-md shadow-sm">{t("Novo ")}</span>
          ))}
        </div>

        {/* Bottom Address preview */}
        <div className="absolute bottom-3 left-3 right-3 text-white flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 drop-shadow-sm font-medium truncate max-w-[60%] sm:max-w-[210px]">
            <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="truncate">{space.street}, {t(space.number)}</span>
          </div>
          <span className="text-[10px] text-slate-200 bg-navy-950/80 px-2 py-0.5 rounded backdrop-blur-sm font-semibold">
            {space.city} - {t(space.state)}
          </span>
        </div>
      </button>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wide truncate">
              {space.coworkingName}
            </span>
            {space.isMvaHeadquarters && (
              <span className="text-[10px] text-slate-400 font-medium">{t("Sede MVA ")}</span>
            )}
          </div>
          
          <h3 className="font-bold text-lg leading-snug text-navy-900">
            <button type="button" onClick={() => onSelect(space)} className="text-left hover:text-orange-700">{space.name}</button>
          </h3>

          <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed">
            {space.description}
          </p>

          {/* Quick specs chips */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
              <Users className="w-3 h-3 text-slate-500" />{t("Até ")}{t(space.capacity)}{t("pess.")}</span>
            {space.amenities.slice(0, 2).map((amenity, i) => (
              <span key={i} className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200/60 truncate max-w-[45%] sm:max-w-[130px]">
                {t(amenity)}
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
            <span className="text-[10px] text-slate-400 block leading-tight uppercase font-medium">{t("Valor hora ")}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-navy-900">{t("R$ ")}{t(space.pricePerHour)}</span>
              <span className="text-[11px] text-slate-500 font-medium">{t("/hora ")}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSelect(space)}
              className="p-2 text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors"
              title={t("Ver detalhes e fotos")}
              aria-label={`Ver detalhes e fotos de ${space.name}`}
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onBook(space)}
              className="action-primary px-3.5 py-2 text-xs"
            >
              <Calendar className="w-3.5 h-3.5" />{t("Reservar ")}</button>
          </div>
        </div>

      </div>
    </div>
  );
};
