import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Building2, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { useCoworking } from '../../context/CoworkingContext';
import { supabase } from '../../lib/supabase';

type Request={id:string;space_id:string;details:string;status:string;admin_notes:string};
export function FiscalPartnerAccreditation(){
 const {currentUser,spaces,showToast}=useCoworking();
 const [requests,setRequests]=useState<Request[]>([]);
 const [spaceId,setSpaceId]=useState('');
 const [details,setDetails]=useState('');
 const [busy,setBusy]=useState(false);
 const mine=spaces.filter(s=>s.ownerId===currentUser?.id&&!s.isMvaHeadquarters);
 const load=useCallback(async()=>{
  if(!currentUser)return;
  const {data,error}=await supabase.from('fiscal_provider_requests').select('id,space_id,details,status,admin_notes').eq('owner_id',currentUser.id);
  if(!error)setRequests((data||[]) as Request[]);
 },[currentUser?.id]);
 useEffect(()=>{void load()},[load]);
 const submit=async(e:FormEvent)=>{
  e.preventDefault();if(!currentUser||details.trim().length<15||!spaceId)return;
  setBusy(true);
  const {error}=await supabase.from('fiscal_provider_requests').insert({
   owner_id:currentUser.id,space_id:spaceId,details:details.trim(),
  });
  if(error)showToast('Não foi possível solicitar credenciamento. Confira os dados ou se já existe solicitação.','error');
  else{showToast('Solicitação recebida. A MVA verificará os requisitos da unidade.','success');setDetails('');setSpaceId('');await load()}
  setBusy(false);
 };
 if(!currentUser)return null;
 return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7" aria-label="Credenciamento para endereço fiscal">
  <div className="flex items-start gap-3"><Building2 className="mt-0.5 h-6 w-6 shrink-0 text-orange-600"/>
   <div><h2 className="text-lg font-bold text-navy-900">Oferecer endereço fiscal no seu coworking</h2><p className="mt-1 text-xs leading-relaxed text-slate-600">Solicite o credenciamento de uma unidade cadastrada. A MVA verificará os documentos, a regularidade do imóvel e a viabilidade da atividade antes de habilitar o serviço.</p></div>
  </div>
  {requests.length>0&&<div className="grid gap-2 sm:grid-cols-2">{requests.map(r=><div key={r.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
    <p className="text-xs font-semibold text-navy-900">{mine.find(s=>s.id===r.space_id)?.name||'Unidade cadastrada'}</p>
    <p className="mt-1 text-xs text-slate-600">Situação: <strong>{r.status==='approved'?'Credenciada':r.status==='rejected'?'Rejeitada':'Em análise'}</strong></p>
    {r.admin_notes&&<p className="mt-1 text-xs text-slate-500">{r.admin_notes}</p>}
   </div>)}</div>}
  <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_1.5fr_auto] md:items-end">
   <label className="space-y-1"><span className="block text-xs font-semibold text-navy-800">Unidade</span>
    <select required value={spaceId} onChange={e=>setSpaceId(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm">
     <option value="">Selecione a unidade</option>{mine.filter(s=>!requests.some(r=>r.space_id===s.id)).map(s=><option value={s.id} key={s.id}>{s.name}</option>)}
    </select></label>
   <label className="space-y-1"><span className="block text-xs font-semibold text-navy-800">Estrutura e documentos disponíveis</span>
    <textarea required minLength={15} maxLength={1500} rows={2} value={details} onChange={e=>setDetails(e.target.value)}
     placeholder="Descreva condições de uso do endereço e disponibilidade de documentação…" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label>
   <button type="submit" disabled={busy||!spaceId} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-xs font-bold text-white disabled:opacity-50"><ClipboardCheck className="h-4 w-4"/>Solicitar análise</button>
  </form>
  <p className="flex items-start gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0"/>Aprovação no marketplace não significa permissão automática para oferecer endereço fiscal.</p>
 </section>;
}