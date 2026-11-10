import { t } from '../../lib/preferences';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Space, Booking } from '../../types';
import { calendarEnabled, connectGoogleCalendar, saveGoogleCalendarEvent, type CalendarSyncResult } from '../../lib/google-calendar';
import { BookingConfirmation } from './BookingConfirmation';
import { BOOKING_EXTERNAL_INTEGRATIONS_ENABLED } from '../../config/integrations';
import { useCoworking } from '../../context/CoworkingContext';
import { 
  X, 
  Calendar, 
  Clock, 
  Users, 
  Check, 
  Video, 
  MapPin,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const localDay = (offset: number) => {
  const now = new Date();
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
};
const readDay = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const displayDay = (value: string) => readDay(value).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
const timeLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
const timeMinutes = (value: string) => {
  const [h,m] = value.split(':').map(Number);
  return h * 60 + m;
};

interface BookingModalProps {
  space: Space | null;
  onClose: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ space, onClose }) => {
  const { addBooking, currentCompany, currentUser, showToast } = useCoworking();

  const [date, setDate] = useState(() => localDay(1));
  const [weekOffset, setWeekOffset] = useState(0);
  const [duration, setDuration] = useState(1);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [occupied, setOccupied] = useState<Array<{start_time: string; end_time: string}>>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotsError, setSlotsError] = useState(false);
  const [responsibleName, setResponsibleName] = useState(currentUser?.name || '');
  const [responsibleEmail, setResponsibleEmail] = useState(currentUser?.email || currentCompany.contactEmail);
  const [responsiblePhone, setResponsiblePhone] = useState(currentCompany.contactPhone);
  const [companyName, setCompanyName] = useState(currentCompany.companyName);

  // Addons
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [calendarSync, setCalendarSync] = useState<CalendarSyncResult | 'error' | 'saving' | null>(null);
  const [calendarConnecting, setCalendarConnecting] = useState(false);

  useEffect(() => {
    if (!space?.id || !date) return;
    let active = true;
    setLoadingSlots(true);
    setSlotsError(false);
    setOccupied([]);
    void Promise.resolve(supabase.rpc('mva_occupied_booking_slots', {
      p_space_id: space.id,
      p_booking_date: date,
    })).then(({data,error}) => {
      if (!active) return;
      setLoadingSlots(false);
      if (error) { setSlotsError(true); setOccupied([]); return; }
      setOccupied((data || []) as Array<{start_time: string; end_time: string}>);
    }).catch(() => {
      if (active) { setLoadingSlots(false); setSlotsError(true); setOccupied([]); }
    });
    return () => { active = false; };
  }, [space?.id, date]);

  if (!space) return null;

  // Calculate hours
  const startH = parseInt(startTime.split(':')[0], 10);
  const endH = parseInt(endTime.split(':')[0], 10);
  const durationHours = duration;

  const addonPrices: Record<string, number> = {
    'Gravação da Sala & Suporte A/V': 60,
  };

  const addonsTotal = selectedAddons.reduce((acc, curr) => acc + (addonPrices[curr] || 0), 0);
  const baseTotal = durationHours * space.pricePerHour;
  const adminBooking = currentUser?.isAdmin === true;
  const totalPrice = adminBooking ? 0 : baseTotal + addonsTotal;

  const toggleAddon = (addon: string) => {
    if (selectedAddons.includes(addon)) {
      setSelectedAddons(prev => prev.filter(a => a !== addon));
    } else {
      setSelectedAddons(prev => [...prev, addon]);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startTime || !endTime || endH <= startH || loadingSlots || slotsError ||
        occupied.some(b => timeMinutes(startTime) < timeMinutes(b.end_time) &&
          timeMinutes(endTime) > timeMinutes(b.start_time))) {
      showToast('Escolha um horário disponível antes de confirmar a reserva.', 'error');
      return;
    }

    const newBooking = await addBooking({
      spaceId: space.id,
      spaceName: space.name,
      spaceCategory: space.category,
      coworkingName: space.coworkingName,
      companyName,
      responsibleName,
      responsibleEmail,
      responsiblePhone,
      date,
      startTime,
      endTime,
      durationHours,
      totalPrice,
      addons: selectedAddons,
    });

    if (!newBooking) return;
    setConfirmedBooking(newBooking);
    if (BOOKING_EXTERNAL_INTEGRATIONS_ENABLED && currentUser && calendarEnabled(currentUser.id)) {
      setCalendarSync('saving');
      try {
        const result = await saveGoogleCalendarEvent(newBooking, currentUser.id, space);
        setCalendarSync(result);
        if (result === 'saved') showToast('Agendamento salvo no Google Agenda com lembretes.', 'success');
      } catch {
        setCalendarSync('error');
        showToast('Reserva confirmada, mas a sincronização com o Google Agenda não foi concluída.', 'info');
      }
    } else {
      setCalendarSync('not_connected');
    }

  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="bg-navy-950 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white bg-navy-900 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {t(!confirmedBooking ? (
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30 mb-2">{t("Reserva de Espaço ")}</div>
              <h2 className="text-xl font-bold tracking-tight">{space.name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                <MapPin className="w-3.5 h-3.5 text-orange-400" />
                <span>{space.coworkingName} • {space.address}</span>
              </div>
            </div>
          ) : (
            <div className="pr-12">
              <span className="text-[11px] font-semibold uppercase tracking-[.2em] text-orange-300">Comprovante MVA Coworking</span>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-white">Detalhes da sua reserva</h2>
              <p className="mt-1 text-xs text-slate-300">Confira as informações do seu agendamento abaixo.</p>
            </div>
          ))}
        </div>

        {confirmedBooking ? (
          <BookingConfirmation
            booking={confirmedBooking}
            space={space}
            userId={currentUser?.id || null}
            canConnectGoogle={BOOKING_EXTERNAL_INTEGRATIONS_ENABLED && currentUser?.provider === 'google'}
            sync={calendarSync}
            connecting={calendarConnecting}
            onConnect={() => {
              if (!currentUser) return;
              setCalendarConnecting(true);
              if (!BOOKING_EXTERNAL_INTEGRATIONS_ENABLED) return;
              void connectGoogleCalendar(currentUser, confirmedBooking.id).catch(error => {
                setCalendarConnecting(false);
                showToast(error instanceof Error ? error.message : 'Falha ao conectar Google Agenda.', 'error');
              });
            }}
            onClose={onClose}
          />
        ) : (
          /* Form for new reservation */
          <form onSubmit={handleConfirm} className="p-6 space-y-4 text-xs">
            {/* Space info summary */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-slate-600">
                <Users className="w-4 h-4 text-slate-400" />
                <span>{t("Capacidade: ")}<strong className="text-navy-900">{t(space.capacity)}{t("pessoas")}</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">{t("Valor hora: ")}</span>
                <span className="text-sm font-bold text-orange-600">{t("R$ ")}{t(space.pricePerHour)},00</span>
              </div>
            </div>

            {/* Escolha visual de horários: disponibilidade confirmada no Supabase. */}
            <section aria-label="Escolher dia e horário" className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-navy-950"><Calendar className="h-4 w-4 text-orange-600" /> Escolha o dia</h3>
                  <p className="mt-1 text-[11px] text-slate-500">Selecione um dia e depois toque no horário disponível.</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Dias anteriores" disabled={weekOffset === 0}
                    onClick={() => { const next = Math.max(0, weekOffset - 7); setWeekOffset(next); setDate(localDay(next + 1)); setStartTime(''); setEndTime(''); }}
                    className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 hover:bg-slate-50"><ChevronLeft className="h-4 w-4"/></button>
                  <button type="button" aria-label="Próximos dias" disabled={weekOffset >= 84}
                    onClick={() => { const next = Math.min(84, weekOffset + 7); setWeekOffset(next); setDate(localDay(next + 1)); setStartTime(''); setEndTime(''); }}
                    className="rounded-lg border border-slate-200 p-2 disabled:opacity-40 hover:bg-slate-50"><ChevronRight className="h-4 w-4"/></button>
                </div>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {Array.from({length: 7}, (_, index) => localDay(weekOffset + index + 1))
                  .filter(day => day <= localDay(90))
                  .map(day => <button key={day} type="button" onClick={() => {setDate(day); setStartTime(''); setEndTime('');}}
                    aria-pressed={date===day}
                    className={`min-h-12 rounded-xl border px-1 py-2 text-[11px] font-semibold capitalize transition-colors ${date===day ? 'border-orange-600 bg-orange-600 text-white shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-300 hover:bg-orange-50'}`}>
                    {displayDay(day)}
                  </button>)}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-bold text-navy-950"><Clock className="h-4 w-4 text-orange-600" /> Horários disponíveis</h3>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Duração:</span>
                  {[1,2,3,4].map(h => <button key={h} type="button" aria-pressed={duration===h}
                    onClick={() => {setDuration(h);setStartTime('');setEndTime('');}}
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${duration===h?'border-orange-600 bg-orange-50 text-orange-700':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {h}h
                  </button>)}
                </div>
              </div>
              {loadingSlots ? <p role="status" className="rounded-xl bg-slate-50 p-4 text-slate-600">Consultando horários disponíveis…</p>
                : slotsError ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">Não foi possível consultar a disponibilidade. Selecione outro dia ou tente novamente.</p>
                : <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Array.from({length: 20 - 8 - duration + 1}, (_, index) => index + 8).map(hour => {
                      const from = timeLabel(hour);
                      const to = timeLabel(hour + duration);
                      const blocked = occupied.some(b => timeMinutes(from) < timeMinutes(b.end_time) && timeMinutes(to) > timeMinutes(b.start_time));
                      const selected = startTime === from && endTime === to;
                      return <button key={hour} type="button" disabled={blocked} aria-pressed={selected}
                        onClick={() => {setStartTime(from);setEndTime(to);}}
                        className={`min-h-12 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${blocked?'cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400 line-through':selected?'border-orange-600 bg-orange-600 text-white shadow-sm':'border-emerald-200 bg-emerald-50/60 text-emerald-900 hover:border-orange-400 hover:bg-orange-50'}`}>
                        {from} – {to}
                        {blocked && <span className="mt-0.5 block text-[10px] no-underline">Ocupado</span>}
                      </button>;
                    })}
                  </div>}
              <p role="status" className="text-xs font-semibold text-slate-700">
                {startTime && endTime ? `Selecionado: ${displayDay(date)} · ${startTime} às ${endTime}` : 'Escolha um dos horários livres para continuar.'}
              </p>
            </section>

            {/* Responsible and Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Empresa Contratante ")}</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Responsável no Local ")}</label>
                <input
                  type="text"
                  required
                  value={responsibleName}
                  onChange={e => setResponsibleName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("E-mail para contato (sem envio automático) ")}</label>
                <input
                  type="email"
                  required
                  value={responsibleEmail}
                  onChange={e => setResponsibleEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Telefone / WhatsApp ")}</label>
                <input
                  type="text"
                  required
                  value={responsiblePhone}
                  onChange={e => setResponsiblePhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Optional Addons */}
            <div>
              <label className="block font-bold text-navy-900 mb-1.5 uppercase text-[11px] tracking-wide">{t("Serviços Opcionais ")}</label>
              <div className="space-y-2">
                {[
                  {
                    name: 'Gravação da Sala & Suporte A/V',
                    icon: <Video className="w-4 h-4 text-navy-900" />,
                    desc: 'Gravação em alta definição da reunião na nuvem',
                    price: 60
                  },
                ].map((addon) => {
                  const isChecked = selectedAddons.includes(addon.name);
                  return (
                    <div
                      key={addon.name}
                      onClick={() => toggleAddon(addon.name)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-orange-500 bg-orange-50/40 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                          isChecked ? 'bg-orange-600 border-orange-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 font-semibold text-navy-900">
                            {t(addon.icon)}
                            {t(addon.name)}
                          </div>
                          <p className="text-[10px] text-slate-500">{t(addon.desc)}</p>
                        </div>
                      </div>
                      <span className="font-bold text-navy-900 shrink-0 ml-2">{t("+ R$ ")}{t(addon.price)},00
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total calculation bar */}
            <div className="bg-navy-950 text-white p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">{t("Total ( ")}{t(durationHours)}{t("h de locação)")}</span>
                <div className="text-xs text-slate-300">{t("Base: R$ ")}{t(baseTotal)},00 {addonsTotal > 0 && `+ Adicionais: R$ ${addonsTotal},00`}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-orange-400 uppercase font-semibold block">{t(adminBooking ? "Reserva administrativa" : "Valor Final ")}</span>
                <div className="text-2xl font-bold text-orange-400">{adminBooking ? t("Sem cobrança") : `${t("R$ ")}${t(totalPrice.toFixed(2))}`}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900" role="note">{adminBooking ? <><strong>Agendamento administrativo isento.</strong> A reserva será confirmada sem pagamento, após validação do perfil pelo servidor. Os horários disponíveis e as regras de conflito continuam valendo.</> : <><strong>Pagamento seguro após o agendamento.</strong> O horário será registrado primeiro. Depois, escolha pagar pelo Stripe ou utilizar horas de um plano MVA elegível. Reservas de parceiros dependem da habilitação de recebimentos do responsável.</>}</div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >{t("Cancelar ")}</button>
              <button
                type="submit"
                disabled={!startTime || !endTime || loadingSlots || slotsError}
                className="disabled:cursor-not-allowed disabled:opacity-50 px-6 py-2.5 text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-md hover:shadow-orange-500/30 transition-all flex items-center gap-2"
              >{t(adminBooking ? "Confirmar reserva gratuita" : "Continuar para pagamento ")}</button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
