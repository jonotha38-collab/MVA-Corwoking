import { t } from '../../lib/preferences';
import React, { useState } from 'react';
import { useCoworking } from '../../context/CoworkingContext';
import { Booking } from '../../types';
import { 
  Calendar, 
  Clock, 
  Mail, 
  FileCheck, 
  CreditCard, 
  MapPin, 
  CheckCircle2, 
  Plus, 
  Printer, 
  ArrowUpRight, 
  QrCode, 
  X,
  Sparkles
} from 'lucide-react';

export const ClientDashboardView: React.FC = () => {
  const { 
    currentCompany, 
    currentUser,
    bookings, 
    correspondence, 
    cancelBooking, 
    setActiveTab, 
  } = useCoworking();

  const day = new Date().toISOString().slice(0, 10);
  const addressActive = currentCompany.paymentStatus === 'paid' && currentCompany.paymentIsLive && currentCompany.status === 'ativo' && currentCompany.startDate <= day && currentCompany.renewalDate >= day;
  const [selectedVoucher, setSelectedVoucher] = useState<Booking | null>(null);

  // Filter bookings
  const clientBookings = bookings.filter(b => b.userId === currentUser?.id);

  // Pending correspondence
  const pendingMails = correspondence.filter(
    c => c.companyId === currentCompany.id && c.status === 'aguardando_retirada'
  );

  // Next upcoming booking
  const upcomingBooking = clientBookings.find(b => b.status === 'confirmada');

  return (
    <div className="space-y-8 pb-16">
      
      {/* Profile Header Banner - Minimalist Deep Navy */}
      <div className="bg-navy-950 text-white rounded-3xl p-6 sm:p-8 border border-navy-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-orange-500/20">
            {t((currentCompany.tradingName || currentUser?.name || 'MVA').substring(0, 2).toUpperCase())}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{currentCompany.tradingName || currentUser?.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">{t(addressActive ? 'Endereço ativo' : 'Aguardando liberação')}</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">{t("Razão Social: ")}<strong>{currentCompany.companyName}</strong>{t("• CNPJ: ")}<span className="font-mono">{currentCompany.cnpj}</span>
            </p>
            <div className="flex items-center gap-1.5 text-xs text-orange-400 font-semibold mt-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{t("Sede de Domicílio: ")}{currentCompany.unitAddress}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('fiscal')}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-navy-850 hover:bg-navy-800 text-slate-200 border border-navy-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <FileCheck className="w-4 h-4 text-orange-400" />{t("Declaração Fiscal ")}</button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className="flex-1 md:flex-initial px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-orange-500/25 transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />{t("Agendar Nova Sala ")}</button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        
        {/* Hours Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[11px]">{t("Crédito de Horas ")}</span>
            <Clock className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-navy-900">
              {addressActive ? Math.max(0, currentCompany.meetingHoursAllowance - currentCompany.meetingHoursUsed) : 0}{t("h")}</span>
            <span className="text-xs text-slate-500">{t("disponíveis ")}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {t(currentCompany.meetingHoursUsed)}{t("h consumidas de")}{t(currentCompany.meetingHoursAllowance)}{t("h no ciclo atual")}</p>
        </div>

        {/* Pending Correspondence */}
        <div 
          onClick={() => setActiveTab('correspondence')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 cursor-pointer hover:border-orange-400 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[11px]">{t("Correspondências ")}</span>
            <Mail className="w-4 h-4 text-orange-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-navy-900">{t(pendingMails.length)}</span>
            <span className="text-xs text-orange-600 font-semibold">{t("na recepção ")}</span>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>{t("Visualizar e digitalizar em PDF ")}</span>
            <ArrowUpRight className="w-3 h-3 text-orange-600" />
          </p>
        </div>

        {/* Active Bookings Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[11px]">{t("Reservas Ativas ")}</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-navy-900">
              {t(clientBookings.filter(b => b.status === 'confirmada').length)}
            </span>
            <span className="text-xs text-slate-500">{t("agendadas ")}</span>
          </div>
          <p className="text-[11px] text-slate-400">{t("Próxima: ")}{t(upcomingBooking ? `${upcomingBooking.date.split('-').reverse().join('/')}` : 'Nenhuma próxima')}
          </p>
        </div>

        {/* Monthly Subscription */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[11px]">{t("Equivalente mensal ")}</span>
            <CreditCard className="w-4 h-4 text-navy-900" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-semibold text-slate-500">{t("R$ ")}</span>
            <span className="text-3xl font-bold text-navy-900">{t(currentCompany.monthlyFee.toFixed(2))}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t(addressActive ? 'Pagamento anual confirmado' : currentCompany.paymentStatus === 'paid' && !currentCompany.paymentIsLive ? 'Pagamento de teste' : 'Aguardando liberação')}</span>
          </div>
        </div>

      </div>

      {/* Upcoming Highlight Card */}
      {upcomingBooking && (
        <div className="bg-gradient-to-r from-navy-900 via-navy-950 to-navy-900 text-white rounded-3xl p-6 sm:p-7 shadow-sm border border-navy-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />{t("Sua Próxima Reunião Agendada ")}</span>
            <h2 className="text-xl font-bold">{t(upcomingBooking.spaceName)}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-orange-400" />
                {t(upcomingBooking.date.split('-').reverse().join('/'))}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                {t(upcomingBooking.startTime)}{t("às")}{t(upcomingBooking.endTime)} ({t(upcomingBooking.durationHours)}{t("h)")}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-orange-400" />
                {t(upcomingBooking.coworkingName)}
              </span>
            </div>
          </div>

          <button
            onClick={() => setSelectedVoucher(upcomingBooking)}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-2 shrink-0"
          >
            <QrCode className="w-4 h-4" />{t("Abrir Voucher & QR Code ")}</button>
        </div>
      )}

      {/* Bookings History and Management */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-navy-900">{t("Histórico de Reservas de Espaços ")}</h2>
            <p className="text-xs text-slate-500">{t("Acompanhe salas de reunião e atendimento agendadas ")}</p>
          </div>
          <button
            onClick={() => setActiveTab('marketplace')}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >{t("Buscar mais salas ")}<ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {t(clientBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="overflow-x-auto -mx-1 px-1"><table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">{t("Espaço / Coworking ")}</th>
                  <th className="py-3.5 px-4">{t("Data & Horário ")}</th>
                  <th className="py-3.5 px-4">{t("Responsável ")}</th>
                  <th className="py-3.5 px-4">{t("Investimento ")}</th>
                  <th className="py-3.5 px-4">{t("Status ")}</th>
                  <th className="py-3.5 px-6 text-right">{t("Ações ")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-navy-900">{t(b.spaceName)}</div>
                      <div className="text-[11px] text-slate-500">{b.coworkingName}</div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{t(b.date.split('-').reverse().join('/'))}</div>
                      <div className="text-[11px] text-slate-500">{t(b.startTime)}{t("às")}{t(b.endTime)} ({t(b.durationHours)}{t("h)")}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-slate-800 font-medium">{b.responsibleName}</div>
                      <div className="text-[11px] text-slate-500">{t(b.responsiblePhone)}</div>
                    </td>
                    <td className="py-4 px-4 font-bold text-navy-900 whitespace-nowrap">{t("R$ ")}{t(b.totalPrice.toFixed(2))}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {b.status === 'confirmada' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{t("Confirmada ")}</span>
                      )}
                      {b.status === 'concluida' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">{t("Concluída ")}</span>
                      )}
                      {b.status === 'cancelada' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">{t("Cancelada ")}</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedVoucher(b)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-navy-900 rounded-lg transition-colors"
                        >{t("Voucher ")}</button>
                        {b.status === 'confirmada' && (
                          <button
                            onClick={() => {
                              if (confirm(`Deseja realmente cancelar a reserva do dia ${b.date}?`)) {
                                cancelBooking(b.id);
                              }
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >{t("Cancelar ")}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        ) : (
          <div className="text-center py-12 p-6 space-y-3">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-navy-900">{t("Nenhuma reserva encontrada ")}</h3>
            <p className="text-xs text-slate-500">{t("Agende salas executivas e use seus créditos mensais inclusos. ")}</p>
            <button
              onClick={() => setActiveTab('marketplace')}
              className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-semibold"
            >{t("Explorar Salas ")}</button>
          </div>
        ))}
      </div>

      {/* Voucher Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scaleUp">
            <div className="bg-navy-950 text-white p-5 flex items-center justify-between no-print">
              <span className="font-bold text-sm">{t("Voucher de Acesso • MVA Hub ")}</span>
              <button onClick={() => setSelectedVoucher(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              <div className="border-2 border-dashed border-orange-200 bg-orange-50/30 p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-orange-600 uppercase">{t("Reserva Confirmada ")}</span>
                    <h3 className="text-base font-bold text-navy-900">{t(selectedVoucher.spaceName)}</h3>
                    <p className="text-slate-500 text-[11px]">{t(selectedVoucher.coworkingName)}</p>
                  </div>
                  <div className="font-mono text-xs font-bold text-navy-900 bg-white px-2.5 py-1 rounded border border-orange-200">
                    {t(selectedVoucher.id.toUpperCase())}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-orange-100">
                  <div>
                    <span className="text-slate-400 block">{t("Data ")}</span>
                    <strong className="text-slate-800">{t(selectedVoucher.date.split('-').reverse().join('/'))}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{t("Horário ")}</span>
                    <strong className="text-slate-800">{t(selectedVoucher.startTime)}{t("às")}{t(selectedVoucher.endTime)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{t("Responsável ")}</span>
                    <strong className="text-slate-800 truncate block">{t(selectedVoucher.responsibleName)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{t("Total ")}</span>
                    <strong className="text-orange-600 font-bold">{t("R$ ")}{t(selectedVoucher.totalPrice.toFixed(2))}</strong>
                  </div>
                </div>

                <div className="pt-3 border-t border-orange-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-12 h-12 p-1 bg-white border border-slate-300 rounded" />
                    <div className="text-[11px] text-slate-500">
                      <span>{t("Validação eletrônica ")}</span>
                      <strong className="block text-navy-900">{t("Check-in na Recepção ")}</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-orange-600" />{t("Imprimir ")}</button>
                </div>
              </div>

              <div className="flex justify-end pt-2 no-print">
                <button
                  onClick={() => setSelectedVoucher(null)}
                  className="px-5 py-2 bg-navy-900 text-white rounded-xl font-bold"
                >{t("Fechar ")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
