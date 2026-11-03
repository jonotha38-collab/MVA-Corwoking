import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CreditCard, Landmark, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Flags={checkout_enabled:boolean;owner_subscriptions_enabled:boolean;connect_enabled:boolean;enforce_owner_subscriptions:boolean};
type Order={id:string;kind:string;status:string;amount_cents:number;livemode:boolean;created_at:string};
type Sub={owner_id:string;plan_id:string;status:string;livemode:boolean};
type Account={owner_id:string;charges_enabled:boolean;payouts_enabled:boolean};
export function BillingAdminOverview(){
 const [flags,setFlags]=useState<Flags|null>(null);
 const [orders,setOrders]=useState<Order[]>([]);
 const [subs,setSubs]=useState<Sub[]>([]);
 const [accounts,setAccounts]=useState<Account[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const refresh=useCallback(async()=>{
  setLoading(true);setError('');
  const [f,o,s,a]=await Promise.all([
   supabase.from('mva_billing_settings').select('checkout_enabled,owner_subscriptions_enabled,connect_enabled,enforce_owner_subscriptions').eq('id',1).single(),
   supabase.from('mva_checkout_orders').select('id,kind,status,amount_cents,livemode,created_at').order('created_at',{ascending:false}).limit(100),
   supabase.from('mva_owner_subscriptions').select('owner_id,plan_id,status,livemode').limit(100),
   supabase.from('mva_connected_accounts').select('owner_id,charges_enabled,payouts_enabled').limit(100)
  ]);
  if(f.error||o.error||s.error||a.error)setError('Não foi possível carregar os registros financeiros. Confira o acesso administrativo.');
  else{setFlags(f.data as Flags);setOrders((o.data||[]) as Order[]);
    setSubs((s.data||[]) as Sub[]);setAccounts((a.data||[]) as Account[])}
  setLoading(false);
 },[]);
 useEffect(()=>{void refresh()},[refresh]);
 const paid=orders.filter(o=>o.status==='paid');
 return <section className="space-y-5" aria-label="Visão financeira Stripe">
  <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><span className="text-xs font-bold uppercase tracking-wider text-orange-700">Pagamentos MVA</span>
      <h2 className="mt-2 text-xl font-bold text-navy-900">Stripe · três fluxos financeiros</h2>
      <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-600">Endereço fiscal, assinaturas dos coworkings e pagamentos de reservas com Stripe Connect.</p></div>
    <button onClick={()=>void refresh()} type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-navy-900"><RefreshCw className="h-4 w-4"/>Atualizar</button>
   </div>
   {error&&<p className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-800" role="alert">{error}</p>}
   {loading?<p className="mt-4 text-xs text-slate-500">Consultando registros…</p>:<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[['Pagamentos registrados',orders.length],['Pagamentos reais confirmados',paid.filter(o=>o.livemode).length],
        ['Assinaturas registradas',subs.length],['Contas de repasse ativas',accounts.filter(a=>a.charges_enabled&&a.payouts_enabled).length]
       ].map(([label,count])=><div key={String(label)} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-600">{label}</p><strong className="mt-2 block text-2xl text-navy-900">{count}</strong></div>)}
    </div>}
   <div className="mt-4 grid gap-3 md:grid-cols-3">
    {[{name:'Endereço fiscal e reservas',ready:!!flags?.checkout_enabled,icon:CreditCard},
      {name:'Mensalidades de parceiros',ready:!!flags?.owner_subscriptions_enabled,icon:ShieldCheck},
      {name:'Repasses via Connect',ready:!!flags?.connect_enabled,icon:Landmark}
    ].map(({name,ready,icon:Icon})=><div key={name} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-orange-700"/>
      <div><p className="text-xs font-bold text-navy-900">{name}</p><span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${ready?'bg-emerald-50 text-emerald-800':'bg-amber-50 text-amber-800'}`}>{ready?'Habilitado pela MVA':'Em preparação'}</span></div>
    </div>)}
   </div>
   <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">
     <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>O painel é informativo. A habilitação de cobranças requer chave Stripe substituta, webhooks validados, confirmação dos preços e autorização expressa. Anúncios de parceiros não serão bloqueados por assinatura nesta fase.
   </p>
  </div>
  {orders.length>0&&<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
   <div className="border-b border-slate-200 p-4"><h3 className="text-sm font-bold text-navy-900">Últimos pedidos financeiros</h3></div>
   <div className="overflow-x-auto"><table className="w-full min-w-[590px] text-left text-xs">
    <thead><tr className="bg-slate-50 text-slate-600"><th className="p-3">Tipo</th><th className="p-3">Valor</th><th className="p-3">Situação</th><th className="p-3">Ambiente</th><th className="p-3">Data</th></tr></thead>
    <tbody>{orders.slice(0,25).map(o=><tr key={o.id} className="border-t border-slate-100 text-navy-900">
     <td className="p-3">{o.kind==='fiscal'?'Endereço fiscal':'Reserva de sala'}</td>
     <td className="p-3">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(o.amount_cents/100)}</td>
     <td className="p-3">{o.status}</td><td className="p-3">{o.livemode?'Real':'Teste'}</td>
     <td className="p-3">{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
    </tr>)}</tbody>
   </table></div>
  </div>}
 </section>;
}
