import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { contiguousEndOptions, hourOf, shortTime, type RoomSlot } from '../../lib/booking-slot-rules';

const TZ='America/Maceio';
const dmy=(date:Date)=>new Intl.DateTimeFormat('en-GB',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date)
  .reduce<Record<string,string>>((a,p)=>{a[p.type]=p.value;return a},{});
export const maceioDate=()=>{
 const p=dmy(new Date());return p.year+'-'+p.month+'-'+p.day;
};
export const addDate=(iso:string,n:number)=>{const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const dateText=(iso:string,opts:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC',...opts}).format(new Date(iso+'T12:00:00Z'));
type Props={
 spaceId:string;date:string;startTime:string;endTime:string;onDate:(iso:string)=>void;
 onStart:(time:string)=>void;onEnd:(time:string)=>void;
 onValidityChange:(ok:boolean)=>void; refreshKey:number;
};
export function RoomAvailabilityPicker({spaceId,date,startTime,endTime,onDate,onStart,onEnd,onValidityChange,refreshKey}:Props){
 const today=maceioDate();
 const [offset,setOffset]=useState(0);
 const [slots,setSlots]=useState<RoomSlot[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [reload,setReload]=useState(0);
 const [updatedAt,setUpdatedAt]=useState('');
 const from=addDate(today,offset);
 const days=useMemo(()=>Array.from({length:7},(_,i)=>addDate(from,i)).filter(d=>d<=addDate(today,60)),[from,today]);
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  const {data,error:rpcError}=await supabase.rpc('mva_room_availability',{p_space_id:spaceId,p_from:from,p_days:days.length});
  if(rpcError){setSlots([]);setError('Não foi possível consultar os horários desta sala. Tente novamente.');}
  else {setSlots((data||[]) as RoomSlot[]);setUpdatedAt(new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,hour:'2-digit',minute:'2-digit'}).format(new Date()));}
  setLoading(false);
 },[spaceId,from,days.length]);
 useEffect(()=>{let alive=true;setLoading(true);setError('');
  void supabase.rpc('mva_room_availability',{p_space_id:spaceId,p_from:from,p_days:days.length})
   .then(({data,error:rpcError})=>{if(!alive)return;
    if(rpcError){setSlots([]);setError('Não foi possível consultar os horários desta sala. Tente novamente.');}
    else{setSlots((data||[]) as RoomSlot[]);setUpdatedAt(new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,hour:'2-digit',minute:'2-digit'}).format(new Date()));}
    setLoading(false);
   });
  return()=>{alive=false};
 },[spaceId,from,days.length,reload,refreshKey]);
 const byDate=slots.filter(s=>s.booking_date===date).sort((a,b)=>a.start_time.localeCompare(b.start_time));
 const ends=byDate.length?contiguousEndOptions(byDate,startTime):[];
 const valid=!loading&&!error&&ends.includes(endTime)&&hourOf(endTime)>hourOf(startTime);
 useEffect(()=>{onValidityChange(valid)},[valid,onValidityChange]);
 const selectDate=(next:string)=>{
  if(next===date)return;
  onDate(next);onStart('');onEnd('');
 };
 const selectSlot=(slot:RoomSlot)=>{
  if(!slot.available)return;
  const nextStart=shortTime(slot.start_time);
  const availableEnds=contiguousEndOptions(byDate,nextStart);
  const currentLength=hourOf(endTime)-hourOf(startTime);
  const target=availableEnds.find(v=>hourOf(v)-hourOf(nextStart)===currentLength)||availableEnds[0]||shortTime(slot.end_time);
  onStart(nextStart);onEnd(target);
 };
 const selectedHour=(slot:RoomSlot)=>startTime&&endTime&&shortTime(slot.start_time)>=startTime&&shortTime(slot.end_time)<=endTime;
 return <section aria-labelledby="mva-availability-title" className="space-y-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4 sm:p-6">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div className="flex items-start gap-3">
    <div className="rounded-xl bg-navy-950 p-3 text-white"><CalendarDays className="h-5 w-5" aria-hidden/></div>
    <div>
     <h3 id="mva-availability-title" className="text-base font-bold tracking-tight text-navy-950">Escolha o dia e o horário</h3>
     <p className="mt-1 text-xs leading-relaxed text-slate-600">Disponibilidade da sala atualizada com as reservas existentes.</p>
    </div>
   </div>
   <button type="button" onClick={()=>{setReload(x=>x+1)}} disabled={loading}
    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-navy-900 hover:bg-slate-50 disabled:opacity-50">
    <RefreshCw className="h-4 w-4" aria-hidden/>Atualizar
   </button>
  </div>
  <div className="space-y-3">
   <div className="flex items-center justify-between gap-2">
    <span className="text-xs font-bold uppercase tracking-[.1em] text-slate-600">1. Selecione uma data</span>
    <div className="flex items-center gap-1">
     <button type="button" aria-label="Ver semana anterior" disabled={offset===0||loading}
      onClick={()=>setOffset(v=>Math.max(0,v-7))} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-navy-900 disabled:opacity-30"><ArrowLeft className="h-4 w-4"/></button>
     <button type="button" aria-label="Ver próxima semana" disabled={offset>=56||loading}
      onClick={()=>setOffset(v=>Math.min(56,v+7))} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-navy-900 disabled:opacity-30"><ArrowRight className="h-4 w-4"/></button>
    </div>
   </div>
   <p className="text-xs font-semibold capitalize text-navy-900">{dateText(from,{month:'long',year:'numeric'})}</p>
   <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="group" aria-label="Dias disponíveis para agendamento">
    {days.map(day=>{
     const daySlots=slots.filter(s=>s.booking_date===day);
     const free=daySlots.filter(s=>s.available).length;
     const disabled=loading||!!error||free===0;
     const selected=day===date;
     return <button key={day} type="button" disabled={disabled} aria-pressed={selected} aria-label={dateText(day,{weekday:'long',day:'numeric',month:'long'})+', '+(loading?'consultando':free?'disponível':'indisponível')}
      onClick={()=>selectDate(day)}
      className={`flex min-h-[78px] flex-col items-center justify-center gap-1 rounded-xl border px-0.5 py-2 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600
       ${selected&&!disabled?'border-orange-600 bg-navy-950 text-white shadow-sm':disabled?'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500':'border-slate-200 bg-white text-navy-900 hover:border-orange-500 hover:bg-orange-50'}`}>
       <span className={`text-[10px] font-semibold uppercase ${selected&&!disabled?'text-orange-200':'opacity-70'}`}>{dateText(day,{weekday:'short'}).replace('.','')}</span>
       <strong className="text-base tabular-nums">{dateText(day,{day:'2-digit'})}</strong>
       <span className={`text-[9px] font-bold ${selected&&!disabled?'text-white':free?'text-emerald-700':'text-slate-600'}`}>{loading?'…':free?'Livre':'Indisp.'}</span>
      </button>;
    })}
   </div>
   <p className="text-[11px] text-slate-600">Dias sem horários livres aparecem desabilitados. Consulte outras semanas pelas setas.</p>
  </div>
  <div className="border-t border-slate-200 pt-5">
   <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
    <span className="text-xs font-bold uppercase tracking-[.1em] text-slate-600">2. Escolha a hora de início</span>
    {updatedAt&&!loading&&!error&&<span className="text-[11px] text-slate-500">Verificado às {updatedAt}</span>}
   </div>
   {loading?<p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600" role="status">Consultando ocupação da sala…</p>:
    error?<div role="alert" className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
     <p className="flex gap-2"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</p>
     <button type="button" onClick={()=>void load()} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy-900">Tentar novamente</button>
    </div>:
    !days.includes(date)?<p className="rounded-xl bg-white p-4 text-sm text-slate-600">Escolha um dos dias acima.</p>:
    byDate.length===0?<p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Não há horários disponíveis para esse dia.</p>:
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-label="Horários da sala">
     {byDate.map(slot=>{
      const chosen=!!selectedHour(slot)&&slot.available;
      const isStart=shortTime(slot.start_time)===startTime&&valid;
      const busy=!slot.available;
      return <button key={slot.start_time} type="button" disabled={busy} aria-pressed={chosen}
       aria-label={shortTime(slot.start_time)+' às '+shortTime(slot.end_time)+': '+(busy?(slot.reason==='ocupado'?'ocupado':'encerrado'):(chosen?'selecionado':'livre'))}
       onClick={()=>selectSlot(slot)}
       className={`flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600
        ${chosen?'border-orange-600 bg-navy-950 text-white':busy?'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-500':'border-slate-200 bg-white text-navy-900 hover:border-orange-500 hover:bg-orange-50'}`}>
       <span className={`text-sm font-bold tabular-nums ${busy?'line-through decoration-slate-400':''}`}>{shortTime(slot.start_time)}</span>
       <span className={`text-[10px] font-semibold ${chosen?'text-orange-200':busy?'text-slate-600':'text-emerald-700'}`}>
        {slot.reason==='ocupado'?'Ocupado':slot.reason==='encerrado'?'Encerrado':isStart?'Início':chosen?'Selecionado':'Livre'}
       </span>
      </button>;
     })}
    </div>}
  </div>
  {byDate.length>0&&!loading&&!error&&<div className="rounded-xl border border-slate-200 bg-white p-4">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h4 className="flex items-center gap-2 text-sm font-bold text-navy-900"><Clock3 className="h-4 w-4 text-orange-600"/>3. Duração da reserva</h4>
     <p className="mt-1 text-xs text-slate-600">Somente períodos consecutivos livres são permitidos.</p></div>
    <label className="flex min-w-[150px] flex-col gap-1 text-xs font-semibold text-navy-900">Horas
     <select value={valid?endTime:''} disabled={!startTime||!ends.length}
      onChange={e=>onEnd(e.target.value)}
      className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-navy-900 focus:ring-2 focus:ring-orange-500">
      <option value="">Escolha um horário</option>
      {ends.map(end=><option value={end} key={end}>{hourOf(end)-hourOf(startTime)} {hourOf(end)-hourOf(startTime)===1?'hora':'horas'} · até {end}</option>)}
     </select>
    </label>
   </div>
   <div aria-live="polite" className={`mt-3 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold ${valid?'bg-emerald-50 text-emerald-900':'bg-slate-100 text-slate-600'}`}>
    {valid?<><Check className="h-4 w-4"/>Período selecionado: {startTime}–{endTime} ({hourOf(endTime)-hourOf(startTime)}h)</>:
     'Selecione um horário livre para continuar.'}
   </div>
  </div>}
  <div className="flex flex-wrap gap-4 border-t border-slate-200 pt-4 text-[11px] font-medium text-slate-700">
   <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-white ring-1 ring-emerald-600"/>Livre</span>
   <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-slate-300"/>Ocupado / Encerrado</span>
   <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-navy-950 ring-1 ring-orange-500"/>Selecionado</span>
  </div>
 </section>;
}
