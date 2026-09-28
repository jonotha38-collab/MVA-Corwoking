import React, { useState } from 'react';
import { Space, Booking } from '../../types';
import { useCoworking } from '../../context/CoworkingContext';
import { 
  X, 
  Calendar, 
  Clock, 
  Users, 
  Check, 
  Coffee, 
  Video, 
  Car, 
  Printer, 
  MapPin, 
  CheckCircle2, 
  QrCode
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BookingModalProps {
  space: Space | null;
  onClose: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ space, onClose }) => {
  const { addBooking, currentCompany, currentUser } = useCoworking();

  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [responsibleName, setResponsibleName] = useState(currentUser?.name || 'Lucas Ferreira');
  const [responsibleEmail, setResponsibleEmail] = useState(currentUser?.email || currentCompany.contactEmail);
  const [responsiblePhone, setResponsiblePhone] = useState(currentCompany.contactPhone);
  const [companyName, setCompanyName] = useState(currentCompany.companyName);

  // Addons
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  if (!space) return null;

  // Calculate hours
  const startH = parseInt(startTime.split(':')[0], 10);
  const endH = parseInt(endTime.split(':')[0], 10);
  const durationHours = Math.max(1, endH - startH);

  const addonPrices: Record<string, number> = {
    'Coffee break Nespresso & Pão de Queijo': 35 * Math.min(space.capacity, 8),
    'Gravação da Sala & Suporte A/V': 60,
    'Vaga de Garagem com Manobrista': 30,
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

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();

    if (endH <= startH) {
      alert('O horário de término deve ser após o horário de início.');
      return;
    }

    const newBooking = addBooking({
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

    setConfirmedBooking(newBooking);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // safe fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="bg-navy-950 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white bg-navy-900 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {!confirmedBooking ? (
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30 mb-2">
                Reserva de Espaço
              </div>
              <h2 className="text-xl font-bold tracking-tight">{space.name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                <MapPin className="w-3.5 h-3.5 text-orange-400" />
                <span>{space.coworkingName} • {space.address}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-2">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white">Reserva Confirmada com Sucesso!</h2>
              <p className="text-xs text-slate-300">Apresente este voucher ao chegar na recepção.</p>
            </div>
          )}
        </div>

        {/* Voucher Screen */}
        {confirmedBooking ? (
          <div className="p-6 space-y-6">
            <div className="border-2 border-dashed border-orange-200 bg-orange-50/30 rounded-2xl p-5 relative">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-orange-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-orange-600 tracking-wider uppercase">Voucher Oficial</span>
                  <h3 className="text-lg font-bold text-navy-900">{confirmedBooking.spaceName}</h3>
                  <p className="text-xs text-slate-500">{confirmedBooking.coworkingName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Código</span>
                  <div className="font-mono text-base font-bold text-navy-900 bg-white px-3 py-1 rounded-md border border-orange-200 shadow-xs">
                    {confirmedBooking.id.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-orange-100 text-xs">
                <div>
                  <span className="text-slate-400 block">Data</span>
                  <strong className="text-slate-800 text-sm">{confirmedBooking.date.split('-').reverse().join('/')}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Horário</span>
                  <strong className="text-slate-800 text-sm">{confirmedBooking.startTime} às {confirmedBooking.endTime}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Titular</span>
                  <strong className="text-slate-800 text-sm block truncate">{confirmedBooking.responsibleName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Investimento</span>
                  <strong className="text-orange-600 text-sm font-bold">R$ {confirmedBooking.totalPrice.toFixed(2)}</strong>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <QrCode className="w-12 h-12 text-slate-800 p-1 bg-white rounded border border-slate-200" />
                  <div>
                    <span className="font-medium text-navy-900 block">Check-in automático na recepção</span>
                    <span className="text-slate-500">Wi-Fi, café cortesia e suporte inclusos.</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                >
                  <Printer className="w-4 h-4 text-orange-600" />
                  Imprimir Comprovante
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold shadow-md transition-all"
              >
                Concluir & Fechar
              </button>
            </div>
          </div>
        ) : (
          /* Form for new reservation */
          <form onSubmit={handleConfirm} className="p-6 space-y-4 text-xs">
            {/* Space info summary */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-slate-600">
                <Users className="w-4 h-4 text-slate-400" />
                <span>Capacidade: <strong className="text-navy-900">{space.capacity} pessoas</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Valor hora:</span>
                <span className="text-sm font-bold text-orange-600">R$ {space.pricePerHour},00</span>
              </div>
            </div>

            {/* Date & Hours Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-orange-600" />
                  Data da Reserva
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-orange-600" />
                  Início
                </label>
                <select
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-hidden bg-white"
                >
                  {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-orange-600" />
                  Término
                </label>
                <select
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-hidden bg-white"
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
                <label className="block font-semibold text-slate-700 mb-1">
                  Empresa Contratante
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Responsável no Local
                </label>
                <input
                  type="text"
                  required
                  value={responsibleName}
                  onChange={e => setResponsibleName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  E-mail de Confirmação
                </label>
                <input
                  type="email"
                  required
                  value={responsibleEmail}
                  onChange={e => setResponsibleEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  required
                  value={responsiblePhone}
                  onChange={e => setResponsiblePhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Optional Addons */}
            <div>
              <label className="block font-bold text-navy-900 mb-1.5 uppercase text-[11px] tracking-wide">
                Serviços Opcionais
              </label>
              <div className="space-y-2">
                {[
                  {
                    name: 'Coffee break Nespresso & Pão de Queijo',
                    icon: <Coffee className="w-4 h-4 text-amber-600" />,
                    desc: 'Café moído, chás finos e pães de queijo quentinhos',
                    price: 35 * Math.min(space.capacity, 8)
                  },
                  {
                    name: 'Gravação da Sala & Suporte A/V',
                    icon: <Video className="w-4 h-4 text-navy-900" />,
                    desc: 'Gravação em alta definição da reunião na nuvem',
                    price: 60
                  },
                  {
                    name: 'Vaga de Garagem com Manobrista',
                    icon: <Car className="w-4 h-4 text-emerald-600" />,
                    desc: 'Estacionamento coberto no local',
                    price: 30
                  },
                ].map((addon) => {
                  const isChecked = selectedAddons.includes(addon.name);
                  return (
                    <div
                      key={addon.name}
                      onClick={() => toggleAddon(addon.name)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-orange-500 bg-orange-50/40 shadow-xs'
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
                            {addon.icon}
                            {addon.name}
                          </div>
                          <p className="text-[10px] text-slate-500">{addon.desc}</p>
                        </div>
                      </div>
                      <span className="font-bold text-navy-900 shrink-0 ml-2">
                        + R$ {addon.price},00
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total calculation bar */}
            <div className="bg-navy-950 text-white p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">Total ({durationHours}h de locação)</span>
                <div className="text-xs text-slate-300">
                  Base: R$ {baseTotal},00 {addonsTotal > 0 && `+ Adicionais: R$ ${addonsTotal},00`}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-orange-400 uppercase font-semibold block">Valor Final</span>
                <div className="text-2xl font-black text-orange-400">
                  R$ {totalPrice.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-md hover:shadow-orange-500/30 transition-all flex items-center gap-2"
              >
                Confirmar Reserva Instantânea
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
