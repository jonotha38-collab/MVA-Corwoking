import { t } from '../../lib/preferences';
import React from 'react';
import { Space } from '../../types';
import { 
  X, 
  Users, 
  MapPin, 
  Star, 
  CheckCircle, 
  Clock, 
  Calendar, 
  Sparkles,
  Building2,
  Layers
} from 'lucide-react';

interface SpaceDetailModalProps {
  space: Space | null;
  onClose: () => void;
  onOpenBooking: (space: Space) => void;
}

export const SpaceDetailModal: React.FC<SpaceDetailModalProps> = ({ space, onClose, onOpenBooking }) => {
  if (!space) return null;

  const categoryLabels = {
    reuniao: 'Sala de Reunião',
    atendimento: 'Sala de Atendimento & Consultório',
    auditorio: 'Auditório para Eventos',
    privada: 'Escritório Privativo / Squads'
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Detalhes de ${space.name}`} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl my-8 overflow-hidden animate-scaleUp">
        
        {/* Cover Image & Header */}
        <div className="relative h-72 w-full overflow-hidden bg-navy-950">
          <img
            src={space.image}
            alt={space.name}
            className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/40 to-transparent"></div>

          <button
            onClick={onClose}
            aria-label={t("Fechar")}
            className="absolute top-4 right-4 bg-navy-900/80 hover:bg-navy-900 text-white p-2.5 rounded-full backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-5 left-6 right-6 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {t(space.isMvaHeadquarters ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-600 text-white shadow-sm backdrop-blur-md flex items-center gap-1 border border-orange-400">
                  <Sparkles className="w-3.5 h-3.5 text-orange-200" />{t("SEDE OFICIAL MVA COWORKING ")}</span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-navy-900 text-white backdrop-blur-md border border-navy-700">
                  {categoryLabels[space.category]}
                </span>
              ))}
              {space.reviewsCount > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-md">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {t(space.rating)} ({t(space.reviewsCount)}{t("avaliações)")}</span>
              )}
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{space.name}</h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1">
              <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
              <span>{space.address}</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Key Specs Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block uppercase font-medium">{t("Capacidade ")}</span>
                <strong className="text-sm font-bold text-navy-900">{t("Até ")}{t(space.capacity)}{t("pessoas")}</strong>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-navy-900 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block uppercase font-medium">{t("Horário ")}</span>
                <strong className="text-sm font-bold text-navy-900">{t(space.openingHours)}</strong>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block uppercase font-medium">{t("Valor por hora ")}</span>
                <strong className="text-sm font-bold text-orange-600">{t("R$ ")}{t(space.pricePerHour)},00</strong>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-navy-900 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block uppercase font-medium">{t("Turno (4h) ")}</span>
                <strong className="text-sm font-bold text-navy-900">
                  {t(space.pricePerShift ? `R$ ${space.pricePerShift},00` : 'Consulte')}
                </strong>
              </div>
            </div>
          </div>

          {/* Description & Coworking Provider */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-bold text-slate-700">{t("Espaço operado por: ")}<strong>{space.coworkingName}</strong></span>
              {space.isMvaHeadquarters && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">{t("Sede Oficial ")}</span>
              )}
            </div>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{space.description}</p>
          </div>

          {/* Amenities checklist */}
          <div>
            <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-2.5">{t("Comodidades Inclusas ")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {space.amenities.map(amenity => (
                <div key={amenity} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t(amenity)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <div>
              <span className="text-[11px] text-slate-500 block uppercase">{t("Tarifa Avulsa ")}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-navy-900">{t("R$ ")}{t(space.pricePerHour)}</span>
                <span className="text-xs text-slate-500 font-medium">{t("/hora ")}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="w-1/2 sm:w-auto px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded-xl transition-colors"
              >{t("Voltar ")}</button>
              <button
                onClick={() => {
                  onClose();
                  onOpenBooking(space);
                }}
                className="w-1/2 sm:w-auto px-6 py-2.5 text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-md hover:shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />{t("Agendar Agora ")}</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
