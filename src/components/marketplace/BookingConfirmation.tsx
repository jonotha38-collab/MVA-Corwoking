import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useBookingVoucher } from '../../lib/booking-voucher';
import { BookingVoucherCode } from '../common/BookingVoucherCode';
import { BookingPaymentDeadline, useBookingPaymentWindow } from '../payments/BookingPaymentDeadline';
import { StripeCheckoutAction } from '../payments/StripeCheckoutAction';
import {
  ArrowUpRight, Bell, CalendarDays, CalendarPlus, CheckCircle2,
  Clock3, ExternalLink, MapPin, Printer, ShieldCheck, UserRound,
} from 'lucide-react';
import type { Booking, Space } from '../../types';
import { BOOKING_EXTERNAL_INTEGRATIONS_ENABLED } from '../../config/integrations';
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
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentIsLive, setPaymentIsLive] = useState(false);
  const [creditApplied,setCreditApplied]=useState(false);
  const [creditMinutes,setCreditMinutes]=useState(0);
  const [redeeming,setRedeeming]=useState(false);
  const [creditError,setCreditError]=useState('');
  const fiscalCovered=booking.totalPrice===0&&Number(booking.fiscalBonusHours||0)>=booking.durationHours&&booking.durationHours>0&&booking.addons.length===0;
  const eligibleForCredit=space.isMvaHeadquarters&&space.category==='atendimento'&&booking.addons.length===0
    &&!(booking.fiscalBonusHours||booking.fiscalDiscountPercent);
  const [paymentExpiredAt, setPaymentExpiredAt] = useState(booking.paymentExpiredAt);
  const paymentClosed = useBookingPaymentWindow(booking.paymentDueAt);
  const { voucher, reload } = useBookingVoucher(booking.id, creditApplied || !!paymentExpiredAt);
  const complimentary = voucher?.status === 'available' && voucher.coverage === 'complimentary';
  const financiallyConfirmed=complimentary||fiscalCovered||creditApplied||(paymentStatus==='paid'&&paymentIsLive);
  useEffect(() => {
    let live = true;
    const load = async () => {
      const [orders,credits,latest]=await Promise.all([
       supabase.from('mva_checkout_orders').select('status,livemode').eq('kind','booking').eq('resource_id',booking.id).maybeSingle(),
       supabase.from('mva_booking_redemptions').select('status').eq('booking_id',booking.id).maybeSingle(),
       paymentClosed ? supabase.from('bookings').select('payment_expired_at').eq('id',booking.id).maybeSingle() : null
      ]);
      if(live){
       setPaymentStatus(orders.data?.status??null);setPaymentIsLive(orders.data?.livemode===true);
       setCreditApplied(credits.data?.status==='applied');
       if(latest?.data?.payment_expired_at)setPaymentExpiredAt(latest.data.payment_expired_at);
      }
    };
    void load();
    const recheck = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', recheck);
    const timer = paymentClosed && !paymentExpiredAt ? window.setInterval(recheck, 20_000) : undefined;
    return () => {
      live = false;
      document.removeEventListener('visibilitychange', recheck);
      window.clearInterval(timer);
    };
  }, [booking.id, paymentClosed, paymentExpiredAt]);
  useEffect(()=>{
    if(!eligibleForCredit||!userId)return;
    let alive=true;
    void supabase.functions.invoke('mva-stripe-gateway',{body:{action:'booking_plan_status'}})
      .then(({data,error})=>{
        if(alive&&!error&&data?.member?.active===true){
         setCreditMinutes(Number(data.member.remainingMinutes)||0);
        }
      });
    return()=>{alive=false};
  },[eligibleForCredit,userId,booking.id]);
  const redeem=async()=>{
    if(redeeming)return;
    setRedeeming(true);setCreditError('');
    try{
     const {data,error}=await supabase.functions.invoke('mva-stripe-gateway',
       {body:{action:'redeem_booking_hours',bookingId:booking.id}});
     if(error||data?.error){
      let message=typeof data?.error==='string'?data.error:'Não foi possível utilizar suas horas.';
      const ctx=error?.context as Response|undefined;
      if(ctx){try{const response=await ctx.json();if(typeof response?.error==='string')message=response.error}catch{}}
      throw new Error(message);
     }
     setCreditApplied(data?.covered===true);
     setCreditMinutes(Number(data?.remaining_minutes)||0);
    }catch(err){setCreditError(err instanceof Error?err.message:'Falha ao debitar as horas.')}
    finally{setRedeeming(false)}
  };
  const eventUrl = sync === 'saved'
    ? (recordedCalendarEventUrl(userId || '', booking.id) || 'https://calendar.google.com/calendar/u/0/r')
    : manualGoogleCalendarLink(booking, space);

  return <div className="space-y-5 bg-[#fafbfc] p-5 sm:p-7">
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Detalhes do agendamento">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold text-navy-900">{paymentExpiredAt?'Reserva cancelada por falta de pagamento':complimentary?'Reserva de cortesia confirmada':fiscalCovered?'Reserva coberta pelo MVA Excellence':financiallyConfirmed?'Reserva paga e confirmada':'Reserva registrada — aguardando pagamento'}</p>
            <p className="text-xs text-slate-600">{paymentExpiredAt?'O horário foi liberado para um novo agendamento.':complimentary?'Esta reserva administrativa tem cortesia integral.':fiscalCovered?'Suas horas bônus deste mês cobriram integralmente a reserva, sem cobrança extra.':financiallyConfirmed?'Seu pagamento ou saldo de horas foi confirmado.':'Escolha uma forma de pagamento para liberar o comprovante financeiro.'}</p>
          </div>
        </div>
        <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold text-emerald-800">
          {paymentExpiredAt?'Cancelada':complimentary?'Cortesia':financiallyConfirmed?'Paga':'Pendente'}
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
            <div><span className="block text-[11px] font-medium text-slate-500">{complimentary?'Cortesia administrativa':fiscalCovered?'Coberto pelo bônus fiscal MVA Excellence':creditApplied?'Coberto pelo plano de horas':paymentStatus==='paid'&&paymentIsLive?'Valor pago via Stripe':paymentStatus==='paid'?'Pagamento de teste (sem cobrança real)':'Valor final da reserva — pagamento não confirmado'}</span>
              <strong className="mt-0.5 block text-sm text-navy-900">{currency(booking.totalPrice)}</strong>
              {(booking.fiscalBonusHours||0)>0&&<p className="mt-1 text-[11px] font-semibold text-emerald-700">
               {booking.fiscalBonusHours}h de bônus MVA Excellence aplicadas · não acumulativas
              </p>}
              {(booking.fiscalDiscountPercent||0)>0&&<p className="mt-1 text-[11px] text-slate-600">
               {booking.fiscalDiscountPercent}% de desconto MVA aplicado às horas não cobertas
              </p>}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <BookingVoucherCode voucher={voucher} reload={reload} />
        </div>
      </div>
    </section>

    {(!paymentClosed || financiallyConfirmed) && <section aria-label="Aviso para a recepção" className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
      <div>
        <p className="text-xs font-bold text-navy-900">{complimentary?'Reserva de cortesia confirmada':financiallyConfirmed?'Reserva paga — comprovante válido':'Agendamento pendente de pagamento'}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          {complimentary?'Informe o código do voucher à recepção.':fiscalCovered?'Reserva coberta por horas bônus não acumulativas do MVA Excellence; a recepção pode validar o benefício registrado nesta reserva.':creditApplied?'Reserva coberta pelas horas mensais já pagas. A recepção poderá verificar o saldo debitado no seu agendamento.':
           paymentStatus==='paid'&&paymentIsLive?'Seu pagamento real foi confirmado pelo Stripe. A recepção poderá verificar o comprovante financeiro.':
           paymentStatus==='paid'?'Esta reserva foi paga somente em ambiente de testes. Solicite uma nova reserva para pagamento real.':
           'O horário foi registrado, mas ainda não há pagamento confirmado. Efetue o pagamento com Stripe ou utilize horas de um plano elegível antes de usar a sala.'}
        </p>
      </div>
    </section>}

    {!financiallyConfirmed && booking.status === 'confirmada' && (
      <BookingPaymentDeadline deadline={booking.paymentDueAt} closed={paymentClosed} canceled={!!paymentExpiredAt} />
    )}

    {booking.status==='confirmada'&&!financiallyConfirmed&&!paymentClosed&&paymentStatus!=='paid'&&<section aria-label="Pagamento da reserva" className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-2 text-sm font-bold text-navy-900">Concluir pagamento da reserva</h3>
      <p className="mb-4 text-xs leading-relaxed text-slate-600">
        Pague a reserva com cartão pelo Stripe. {space.isMvaHeadquarters?'A MVA receberá diretamente.':'O pagamento a coworking parceiro só será disponibilizado após a conexão Stripe Connect desse responsável.'}
      </p>
      {eligibleForCredit&&creditMinutes>=booking.durationHours*60&&<div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
       <p className="mb-2 text-xs font-semibold text-emerald-900">Seu plano possui {(creditMinutes/60).toLocaleString('pt-BR')} horas disponíveis.</p>
       <button type="button" onClick={()=>void redeem()} disabled={redeeming}
        className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
        {redeeming?'Abatendo saldo…':'Usar '+booking.durationHours+'h do meu plano (sem cobrança adicional)'}
       </button>
      </div>}
      {creditError&&<p role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-800">{creditError}</p>}
      <StripeCheckoutAction action="checkout_booking" resourceId={booking.id}/>
    </section>}

    {BOOKING_EXTERNAL_INTEGRATIONS_ENABLED && <section aria-label="Lembretes e Google Agenda" className="rounded-2xl border border-blue-200 bg-white p-5">
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
    </section>}

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
