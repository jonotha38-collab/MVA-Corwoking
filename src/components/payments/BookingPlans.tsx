import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { t, usePreferences } from '../../lib/preferences';
import { useCoworking } from '../../context/CoworkingContext';
import { StripeCheckoutAction } from './StripeCheckoutAction';

type Plan = { id:'bronze'|'prata'|'ouro'; label:string; monthly_cents:number; included_minutes:number; active:boolean; display_order:number };
type Membership = { planId:string;status:string;livemode:boolean;active:boolean;remainingMinutes:number;usedMinutes:number;periodStart:string|null;periodEnd:string|null;cancelAtPeriodEnd:boolean;hasStripeCustomer:boolean };
type Payload = { plans:Plan[]; eligibleRooms:number; member:Membership|null };
const money = (cents:number,language:'pt'|'en'|'es') => (cents/100).toLocaleString(language==='pt'?'pt-BR':language==='en'?'en-US':'es-ES',{style:'currency',currency:'BRL'});
const statusLabels:Record<string,string>={active:'Ativo',trialing:'Em avaliação',past_due:'Pagamento em atraso',incomplete:'Aguardando pagamento',canceled:'Cancelado',unpaid:'Pagamento pendente',paused:'Pausado',incomplete_expired:'Checkout expirado'};

export function BookingPlans({ compact=false }:{compact?:boolean}) {
 const {currentUser,setActiveTab}=useCoworking();
 const {language}=usePreferences();
 const [plans,setPlans]=useState<Plan[]>([]);
 const [member,setMember]=useState<Membership|null>(null);
 const [eligibleRooms,setEligibleRooms]=useState(0);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
  let alive=true;
  const fetchPlans=async()=>{
   setLoading(true);setError('');
   const publicPlans=await supabase.from('mva_booking_plans').select('id,label,monthly_cents,included_minutes,active,display_order').eq('active',true).order('display_order');
   if(!alive)return;
   if(publicPlans.error){setError('Não foi possível carregar os planos.');setLoading(false);return}
   setPlans((publicPlans.data||[]) as Plan[]);
   if(currentUser){
    const {data,error:gatewayError}=await supabase.functions.invoke('mva-stripe-gateway',{body:{action:'booking_plan_status'}});
    if(!alive)return;
    if(!gatewayError&&data&&!data.error){
     const status=data as Payload;setMember(status.member);setEligibleRooms(status.eligibleRooms);
    }else{setMember(null);setError('Não foi possível consultar o saldo do plano. Atualize a página.')}
   }else{
    setMember(null);
    const {count}=await supabase.from('spaces').select('id',{count:'exact',head:true})
      .eq('is_mva_headquarters',true).eq('category','atendimento').eq('status','available').eq('approval','aprovado');
    if(alive)setEligibleRooms(count||0);
   }
   if(alive)setLoading(false);
  };
  void fetchPlans();
  return()=>{alive=false};
 },[currentUser?.id]);
 if(loading)return <section aria-label={t('Planos de atendimento')} className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">{t("Consultando planos e disponibilidade...")}</section>;
 if(plans.length===0)return null;
 const periodEnd=member?.periodEnd ? new Date(member.periodEnd).toLocaleDateString(language==='pt'?'pt-BR':language==='en'?'en-US':'es-ES') : null;
 return <section aria-label={t('Planos mensais de salas de atendimento')} className="space-y-5">
  <div><div className="flex items-center gap-2 text-orange-600"><CalendarClock className="h-5 w-5"/><span className="text-xs font-bold uppercase tracking-wider">{t("Atendimento por assinatura")}</span></div>
   <h2 className="mt-2 text-2xl font-bold text-navy-900">{t(compact?'Seu plano de horas':'Planos mensais de atendimento')}</h2>
   <p className="mt-2 text-sm text-slate-600">{t("Use suas horas em diferentes atendimentos durante o período pago, sempre mediante agendamento e disponibilidade.")}</p>
  </div>
  {error&&<p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{error}</p>}
  {member&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
    <p className="flex items-center gap-2 text-sm font-bold text-emerald-900"><CheckCircle2 className="h-4 w-4"/>{t('Plano')} {t(member.planId.toUpperCase())} — {t(statusLabels[member.status]||member.status)}</p>
    <p className="mt-1 text-sm text-emerald-900">{member.active?`${(member.remainingMinutes/60).toLocaleString(language==='pt'?'pt-BR':language==='en'?'en-US':'es-ES')} ${t('horas disponíveis de atendimento')}`:t('As horas são liberadas somente após o pagamento mensal ser confirmado pelo Stripe.')}</p>
    {periodEnd&&<p className="mt-1 text-xs text-emerald-800">{t('Ciclo pago até')} {periodEnd}. {t('Horas não acumulam.')} {member.cancelAtPeriodEnd?t('Cancelamento agendado para o fim do período.'):''}</p>}
    {member.status==='incomplete'&&!member.hasStripeCustomer&&<p className="mt-2 text-xs text-emerald-900">{t("Se você desistiu do checkout, escolha novamente um plano abaixo. O Stripe abrirá a sessão existente ou permitirá uma nova tentativa, sem duplicar sua assinatura.")}</p>}
    {member.hasStripeCustomer&&<div className="mt-4 max-w-xs"><StripeCheckoutAction action="booking_plan_portal" label={t('Gerenciar minha assinatura')}/></div>}
   </div>}
  {eligibleRooms===0&&<p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
   As assinaturas estão cadastradas, mas a contratação fica suspensa até a MVA publicar uma sala própria de atendimento elegível.
   Nenhuma cobrança será iniciada enquanto não houver uma sala disponível no catálogo.
  </p>}
  {compact?<button type="button" onClick={()=>setActiveTab('marketplace')} className="rounded-xl border border-orange-200 px-4 py-2.5 text-xs font-bold text-orange-700 hover:bg-orange-50">{t("Ver planos e agendar salas")}</button>:
   <div className="grid gap-4 md:grid-cols-3">
    {plans.map(plan=>{
     const minutes=plan.included_minutes;
     const subscribed=!!member&&(member.active||['active','trialing','past_due','unpaid','paused'].includes(member.status)||member.hasStripeCustomer);
     return <article key={plan.id} className={'flex flex-col rounded-2xl border bg-white p-5 shadow-sm '+(plan.id==='bronze'?'border-orange-300':'border-slate-200')}>
      <div className="flex items-center justify-between"><span className="text-sm font-bold uppercase tracking-wider text-navy-900">{t(plan.label)}</span>
       {plan.id==='bronze'&&<span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-700">{t("Comece aqui")}</span>}</div>
      <div className="mt-4"><span className="text-3xl font-bold text-navy-950">{money(plan.monthly_cents,language)}</span><span className="text-xs text-slate-500"> / {t('mês')}</span></div>
      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><Clock className="h-4 w-4 text-orange-500"/>{minutes/60} {t('horas mensais')}</p>
      <p className="mt-1 text-sm font-bold text-orange-700">{money(plan.monthly_cents/(minutes/60),language)}/{t('hora')}</p>
      <p className="mt-1 text-xs text-slate-500">{minutes/60} {t('horas')} × {money(plan.monthly_cents/(minutes/60),language)} = {money(plan.monthly_cents,language)} {t('mensais')}</p>
      <ul className="mt-4 flex-1 space-y-2 text-xs text-slate-600">
       <li>{t("Atendimentos em horários reservados")}</li><li>{t("Uso de salas próprias elegíveis da MVA")}</li>
       <li>{t("Horas não cumulativas a cada ciclo pago")}</li><li>{t("Renovação automática mensal; cancelamento pelo Stripe")}</li>
      </ul>
      <div className="mt-5">
       {eligibleRooms>0&&!subscribed?<StripeCheckoutAction action="checkout_booking_plan" planId={plan.id} label={t('Assinar')+' '+t(plan.label)}/>:
        <button type="button" disabled className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 p-3 text-xs font-bold text-slate-500">
         {t(subscribed?'Consulte seu plano acima':'Aguardando salas da MVA')}
        </button>}
      </div>
     </article>;
    })}
   </div>}
  <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/>{t("As horas só ficam disponíveis após confirmação financeira de cada mensalidade. Reservas de parceiros, salas de reunião e adicionais não são cobertos. Cancelamentos com pelo menos 24 horas de antecedência devolvem horas ao saldo do ciclo; cancelamentos tardios não restituem horas automaticamente.")}</p>
 </section>;
}
