import { t } from '../../lib/preferences';
import React, { useCallback, useState } from 'react';
import { Space, Booking } from '../../types';
import { calendarEnabled, connectGoogleCalendar, saveGoogleCalendarEvent, type CalendarSyncResult } from '../../lib/google-calendar';
import { BookingConfirmation } from './BookingConfirmation';
import { BOOKING_EXTERNAL_INTEGRATIONS_ENABLED } from '../../config/integrations';
import { useCoworking } from '../../context/CoworkingContext';
import { RoomAvailabilityPicker, addDate, maceioDate } from './RoomAvailabilityPicker';
import { 
  X, 
  Users, 
  Check, 
  Video, 
  MapPin
} from 'lucide-react';

const brl=(value:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);

interface BookingModalProps {
  space: Space | null;
  onClose: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ space, onClose }) => {
  const { addBooking, currentCompany, currentUser, showToast } = useCoworking();

  const [date, setDate] = useState(() => addDate(maceioDate(), 1));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [responsibleName, setResponsibleName] = useState(currentUser?.name || '');
  const [responsibleEmail, setResponsibleEmail] = useState(currentUser?.email || currentCompany.contactEmail);
  const [responsiblePhone, setResponsiblePhone] = useState(currentCompany.contactPhone);
  const [companyName, setCompanyName] = useState(currentCompany.companyName);

  // Addons
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [calendarSync, setCalendarSync] = useState<CalendarSyncResult | 'error' | 'saving' | null>(null);
  const [calendarConnecting, setCalendarConnecting] = useState(false);
  const [timeAvailable,setTimeAvailable] = useState(false);
  const [availabilityRefresh,setAvailabilityRefresh] = useState(0);
  const [submitting,setSubmitting] = useState(false);
  const updateValidity=useCallback((available:boolean)=>setTimeAvailable(available),[]);

  if (!space) return null;

  // Calculate hours
  const startH = startTime ? Number(startTime.slice(0,2)) : 0;
  const endH = endTime ? Number(endTime.slice(0,2)) : 0;
  const durationHours = timeAvailable ? Math.max(0, endH - startH) : 0;

  const addonPrices: Record<string, number> = {
    'Gravação da Sala & Suporte A/V': 60,
  };

  const addonsTotal = selectedAddons.reduce((acc, curr) => acc + (addonPrices[curr] || 0), 0);
  const baseTotal = durationHours * space.pricePerHour;
  const totalPrice = baseTotal + addonsTotal;

  const toggleAddon = (addon: string) => {
    if (selectedAddons.includes(addon)) {
      setSelectedAddons(prev => prev.filter(a => a !== addon));
    } else {
      setSelectedAddons(prev => [...prev, addon]);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;
    if (!timeAvailable || !date || !startTime || !endTime || endH <= startH) {
      showToast('Escolha um dia e um período disponível antes de continuar.', 'error');
      return;
    }
    setSubmitting(true);
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

    if (!newBooking) {
      setSubmitting(false);
      setAvailabilityRefresh(k=>k+1);
      return;
    }
    setConfirmedBooking(newBooking);
    setSubmitting(false);
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
                <span className="text-sm font-bold text-orange-600">{brl(space.pricePerHour)}</span>
              </div>
            </div>

            {/* Canonical availability: current bookings are checked on the server before selection. */}
            <RoomAvailabilityPicker
              spaceId={space.id}
              date={date} startTime={startTime} endTime={endTime}
              onDate={setDate} onStart={setStartTime} onEnd={setEndTime}
              onValidityChange={updateValidity} refreshKey={availabilityRefresh}
            />

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
                      <span className="font-bold text-navy-900 shrink-0 ml-2">+ {brl(addon.price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total calculation bar */}
            <div className="bg-navy-950 text-white p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">{timeAvailable?`Total (${durationHours}h de locação)`:'Selecione data, início e duração'}</span>
                <div className="text-xs text-slate-300">{timeAvailable?`Base: ${brl(baseTotal)}`:'O valor será calculado automaticamente.'}{timeAvailable&&addonsTotal>0&&` + Adicionais: ${brl(addonsTotal)}`}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-orange-400 uppercase font-semibold block">Valor de referência</span>
                <div className="text-2xl font-bold text-orange-400">{timeAvailable?brl(totalPrice):'—'}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900" role="note">
              <strong>Preço de referência antes dos benefícios.</strong> Se você tiver contrato fiscal ativo com a MVA, o desconto do seu plano e as horas bônus elegíveis serão calculados pelo servidor na confirmação. O valor final será apresentado no comprovante; só haverá cobrança pelo Stripe se restar algo a pagar. Adicionais não recebem desconto. Reservas de parceiros dependem de recebimentos habilitados.
             </div>

            <p className="text-xs leading-relaxed text-slate-600">
              {t('Quando houver valor a pagar, o prazo é de até 1 hora após o agendamento, limitado ao início da reserva. Sem pagamento, o horário será liberado automaticamente.')}
            </p>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >{t("Cancelar ")}</button>
              <button
                type="submit"
                disabled={!timeAvailable||submitting}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >{submitting?'Registrando reserva…':'Confirmar horário e ver valor final'}</button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
