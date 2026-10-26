import { useState } from 'react';
import {
  ArrowUpRight, Bell, CalendarDays, CalendarPlus, Check, CheckCircle2,
  Clock3, Copy, ExternalLink, MapPin, Printer, ShieldCheck, UserRound,
} from 'lucide-react';
import type { Booking, Space } from '../../types';
import {
  manualGoogleCalendarLink, recordedCalendarEventUrl,
  type CalendarSyncResult,
} from '../../lib/google-calendar';

type Props = {
  booking: Booking;
  space: Space;
  userId: string | null;
  canConnectGoogle: boolean;
  sync: CalendarSyncResult | 'error' | 'saving' | null;
  connecting: boolean;
  onConnect: () => void;
  onClose: () => void;
};

const formatDate = (date: string) => new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});
const currency = (amount: number) => amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function BookingConfirmation({
  booking, space, userId, canConnectGoogle, sync, connecting, onConnect, onClose,
}: Props) {
  const [copied, setCopied] = useState(false);
  const eventUrl = sync === 'saved'
    ? (recordedCalendarEventUrl(userId || '', booking.id) || 'https://calendar.google.com/calendar/u/0/r')
    : manualGoogleCalendarLink(booking, space);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(booking.id.toUpperCase());
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return <div className="space-y-5 bg-[#fafbfc] p-5 sm:p-7">
    <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white" aria-label="Reserva confirmada">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50/70 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold text-emerald-900">Reserva confirmada</p>
            <p className="text-xs text-emerald-800">Sua sala está agendada para o dia e horário escolhidos.</p>
          </div>
        </div>
        <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold text-emerald-800">
          Confirmada
        </span>
      </div>
      <div className="p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Detalhes do agendamento</p>
        <h3 className="mt-1 text-xl font-bold tracking-tight text-navy-950">{booking.spaceName}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-600" aria-hidden />
          {space.address || booking.coworkingName}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" aria-hidden />
            <div><span className="block text-[11px] font-medium text-slate-500">Data</span>
              <strong className="mt-0.5 block text-sm capitalize text-navy-900">{formatDate(booking.date)}</strong>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" aria-hidden />
            <div><span className="block text-[11px] font-medium text-slate-500">Horário</span>
              <strong className="mt-0.5 block text-sm text-navy-900">{booking.startTime} às {booking.endTime}</strong>
              <span className="mt-0.5 block text-[11px] text-slate-500">Horário local · Brasília</span>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
            <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" aria-hidden />
            <div className="min-w-0"><span className="block text-[11px] font-medium text-slate-500">Responsável pela reserva</span>
              <strong className="mt-0.5 block truncate text-sm text-navy-900">{booking.responsibleName}</strong>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" aria-hidden />
            <div><span className="block text-[11px] font-medium text-slate-500">Valor da reserva</span>
              <strong className="mt-0.5 block text-sm text-navy-900">{currency(booking.totalPrice)}</strong>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3">
          <div className="min-w-0">
            <span className="block text-[11px] font-medium text-slate-500">Número do agendamento</span>
            <code className="mt-0.5 block break-all font-mono text-xs font-semibold text-navy-900">{booking.id.toUpperCase()}</code>
          </div>
          <button type="button" onClick={() => void copyCode()} title="Copiar número da reserva"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-navy-800 hover:bg-slate-50">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiado' : 'Copiar código'}
          </button>
        </div>
      </div>
    </section>

    <section aria-label="Aviso para a recepção" className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
      <div>
        <p className="text-xs font-bold text-navy-900">Agendamento enviado à recepção</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Nossa equipe poderá consultar seu nome, a sala e o horário no painel administrativo. Guarde o código da reserva para facilitar sua chegada.
        </p>
      </div>
    </section>

    <section aria-label="Lembretes e Google Agenda" className="rounded-2xl border border-blue-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50">
          <CalendarPlus className="h-5 w-5 text-blue-700" aria-hidden />
        </div>
        <div>
          <h3 className="text-sm font-bold text-navy-900">Não se esqueça da reserva</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {sync === 'saved'
              ? 'Evento sincronizado com o Google Agenda. Os lembretes foram configurados para 1 hora e 30 minutos antes.'
              : sync === 'saving'
                ? 'Estamos registrando o evento no Google Agenda…'
                : 'Adicione a reserva ao Google Agenda para acompanhar os horários e receber lembretes.'}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {sync !== 'saved' && canConnectGoogle && (
          <button type="button" disabled={connecting || sync === 'saving'} onClick={onConnect}
            className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-navy-800 disabled:opacity-60">
            <CalendarPlus className="h-4 w-4" />
            {connecting ? 'Autorizando…' : 'Sincronizar com Google Agenda'}
          </button>
        )}
        <a href={eventUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-semibold text-blue-800 transition-colors hover:bg-blue-50">
          <ExternalLink className="h-4 w-4" />{sync === 'saved' ? 'Abrir minha agenda' : 'Adicionar manualmente'}
        </a>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
        <Bell className="h-3.5 w-3.5" aria-hidden /> Os alertas dependem das notificações autorizadas no Google.
      </p>
    </section>

    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <button type="button" onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
        <Printer className="h-4 w-4" />Imprimir comprovante
      </button>
      <button type="button" onClick={onClose}
        className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-xs font-bold text-white hover:bg-orange-500">
        Concluir <ArrowUpRight className="h-4 w-4" />
      </button>
    </div>
  </div>;
}
