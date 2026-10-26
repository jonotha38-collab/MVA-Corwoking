import { t } from '../../lib/preferences';
import React, { useState } from 'react';
import { Space, Booking } from '../../types';
import { calendarEnabled, connectGoogleCalendar, saveGoogleCalendarEvent, type CalendarSyncResult } from '../../lib/google-calendar';
import { BookingConfirmation } from './BookingConfirmation';
import { useCoworking } from '../../context/CoworkingContext';
import { 
  X, 
  Calendar, 
  Clock, 
  Users, 
  Check, 
  Video, 
  MapPin
} from 'lucide-react';

interface BookingModalProps {
  space: Space | null;
  onClose: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ space, onClose }) => {
  const { addBooking, currentCompany, currentUser, showToast } = useCoworking();

  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [responsibleName, setResponsibleName] = useState(currentUser?.name || '');
  const [responsibleEmail, setResponsibleEmail] = useState(currentUser?.email || currentCompany.contactEmail);
  const [responsiblePhone, setResponsiblePhone] = useState(currentCompany.contactPhone);
  const [companyName, setCompanyName] = useState(currentCompany.companyName);

  // Addons
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [calendarSync, setCalendarSync] = useState<CalendarSyncResult | 'error' | 'saving' | null>(null);
  const [calendarConnecting, setCalendarConnecting] = useState(false);

  if (!space) return null;

  // Calculate hours
  const startH = parseInt(startTime.split(':')[0], 10);
  const endH = parseInt(endTime.split(':')[0], 10);
  const durationHours = Math.max(1, endH - startH);

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

    if (endH <= startH) {
      alert('O horário de término deve ser após o horário de início.');
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
    if (currentUser && calendarEnabled(currentUser.id)) {
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
            canConnectGoogle={currentUser?.provider === 'google'}
            sync={calendarSync}
            connecting={calendarConnecting}
            onConnect={() => {
              if (!currentUser) return;
              setCalendarConnecting(true);
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

            {/* Date & Hours Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-orange-600" />{t("Data da Reserva ")}</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-orange-600" />{t("Início ")}</label>
                <select
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                >
                  {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-orange-600" />{t("Término ")}</label>
                <select
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                >
                  {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

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
                <label className="block font-semibold text-slate-700 mb-1">{t("E-mail de Confirmação ")}</label>
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
                <span className="text-[10px] text-orange-400 uppercase font-semibold block">{t("Valor Final ")}</span>
                <div className="text-2xl font-bold text-orange-400">{t("R$ ")}{t(totalPrice.toFixed(2))}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >{t("Cancelar ")}</button>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-md hover:shadow-orange-500/30 transition-all flex items-center gap-2"
              >{t("Confirmar Reserva Instantânea ")}</button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
