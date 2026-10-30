import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, CalendarClock, CheckCircle2, ClipboardCheck, ExternalLink, FileCheck2, FolderLock, RefreshCw, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCoworking } from '../../context/CoworkingContext';
import type { FiscalApplication } from '../fiscal/FiscalServiceCenter';

type Provider={id:string;owner_id:string;space_id:string;details:string;status:'submitted'|'approved'|'rejected';admin_notes:string;created_at:string};
type Unit={id:string;name:string;street_address:string;active:boolean;approved_at:string|null};
type Contract={id:string;user_id:string;company_name:string;cnpj:string;renewal_date:string;status:string;payment_status:string;payment_is_live:boolean};
type Doc={id:string;request_id:string|null;contract_id:string|null;file_path:string;file_name:string;category:string;verified:boolean;publicly_verifiable:boolean;verification_code:string};
const labels:Record<string,string>={submitted:'Recebida',under_review:'Em análise',approved:'Aprovada',rejected:'Rejeitada'};
const daysUntil=(value:string)=>Math.ceil((new Date(value+'T12:00:00-03:00').getTime()-Date.now())/86400000);

export function FiscalOperationsCenter(){
 const {currentUser,showToast}=useCoworking();
 const [requests,setRequests]=useState<FiscalApplication[]>([]);
 const [providers,setProviders]=useState<Provider[]>([]);
 const [contracts,setContracts]=useState<Contract[]>([]);
 const [units,setUnits]=useState<Unit[]>([]);
 const [docs,setDocs]=useState<Doc[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState<string|null>(null);
 const [search,setSearch]=useState('');
 const [notes,setNotes]=useState<Record<string,string>>({});
 const reload=useCallback(async()=>{
  if(!currentUser)return;
  setLoading(true);
  const [ar,pr,cr,ur,dr]=await Promise.all([
    supabase.from('fiscal_applications').select('*').order('created_at',{ascending:false}).limit(500),
    supabase.from('fiscal_provider_requests').select('*').order('created_at',{ascending:false}).limit(200),
    supabase.from('fiscal_contracts').select('id,user_id,company_name,cnpj,renewal_date,status,payment_status,payment_is_live').order('renewal_date').limit(500),
    supabase.from('fiscal_units').select('id,name,street_address,active,approved_at').order('name'),
    supabase.from('fiscal_private_documents').select('id,request_id,contract_id,file_path,file_name,category,verified,publicly_verifiable,verification_code').order('created_at',{ascending:false}).limit(500),
  ]);
  if(ar.error||pr.error||cr.error||ur.error||dr.error)showToast('Não foi possível carregar todos os registros fiscais. Verifique suas permissões.','error');
  else{
   setRequests((ar.data||[]) as FiscalApplication[]);
   setProviders((pr.data||[]) as Provider[]);
   setContracts((cr.data||[]) as Contract[]);
   setUnits((ur.data||[]) as Unit[]);
   setDocs((dr.data||[]) as Doc[]);
  }
  setLoading(false);
 },[currentUser?.id,showToast]);
 useEffect(()=>{void reload()},[reload]);
 const review=async(id:string,status:'under_review'|'approved'|'rejected',provider=false)=>{
   setBusy(id);
   const name=provider?'fiscal_provider_requests':'fiscal_applications';
   const data=provider?{status,admin_notes:(notes[id]||'').slice(0,2000)}:
     {status,review_notes:(notes[id]||'').slice(0,2000)};
   const {error}=await supabase.from(name).update(data).eq('id',id);
   if(error)showToast('Não foi possível alterar o estado. Confira o registro e a elegibilidade da unidade.','error');
   else {showToast('Análise registrada.','success');await reload()}
   setBusy(null);
 };
 const openDoc=async(doc:Doc)=>{
   const {data,error}=await supabase.storage.from('fiscal-private').createSignedUrl(doc.file_path,60);
   if(error||!data?.signedUrl){showToast('Não foi possível acessar o documento.','error');return}
   window.open(data.signedUrl,'_blank','noopener,noreferrer');
 };
 const uploadContractDoc=async(contract:Contract,file:File|null)=>{
   if(!file||!currentUser)return;
   if(contract.status!=='ativo'||contract.payment_status!=='paid'||contract.payment_is_live!==true){
     showToast('Declarações só podem ser anexadas a contratos ativos com pagamento real confirmado.','error');return;
   }
   const ext=file.name.split('.').pop()?.toLowerCase()||'';
   const mime=ext==='pdf'?'application/pdf':ext==='png'?'image/png':ext==='jpg'||ext==='jpeg'?'image/jpeg':'';
   if(!mime||file.size>10*1024*1024||file.type!==mime){showToast('Arquivo inválido. PDF, JPG ou PNG, até 10 MB.','error');return}
   setBusy(contract.id);
   try{
     const path=`contracts/${contract.id}/${crypto.randomUUID()}.${ext}`;
     const {error:uploadError}=await supabase.storage.from('fiscal-private').upload(path,file,{contentType:mime,upsert:false});
     if(uploadError)throw uploadError;
     const {error:recordError}=await supabase.from('fiscal_private_documents').insert({
       request_id:null,contract_id:contract.id,uploader_id:currentUser.id,file_path:path,
       file_name:file.name.slice(0,180),category:'authorization',verified:false,publicly_verifiable:false
     });
     if(recordError)throw recordError;
     showToast('Documento armazenado. Revise e valide antes de disponibilizar a verificação pública.','success');
     await reload();
   }catch{showToast('Não foi possível anexar o documento.','error')}
   finally{setBusy(null)}
 };
 const verifyDoc=async(d:Doc)=>{
   if(!window.confirm('Você conferiu a assinatura, o contrato e o pagamento real? Validar autenticidade deste documento?'))return;
   const {error}=await supabase.from('fiscal_private_documents').update({verified:true,publicly_verifiable:true}).eq('id',d.id);
   if(error)showToast('Não foi possível validar o documento.','error');
   else {showToast('Documento validado para consulta de autenticidade.','success');await reload()}
 };
 const filtered=useMemo(()=>requests.filter(r=>
  [r.company_name,r.cnpj,r.cnae,r.contact_email].some(x=>x.toLowerCase().includes(search.trim().toLowerCase()))
 ),[requests,search]);
 const pending=requests.filter(r=>r.status==='submitted'||r.status==='under_review').length;
 const upcoming=contracts.filter(c=>daysUntil(c.renewal_date)<=30 && daysUntil(c.renewal_date)>=0).length;
 return <section className="space-y-6" aria-label="Administração do endereço fiscal">
  <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div><span className="text-xs font-bold uppercase tracking-widest text-orange-600">Operação MVA</span>
      <h2 className="mt-2 text-2xl font-bold text-navy-900">Gestão de endereço fiscal</h2>
      <p className="mt-1 text-sm text-slate-600">Análise de empresas, verificação de documentos, credenciamento e contratos.</p></div>
    <button type="button" onClick={()=>void reload()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-navy-900"><RefreshCw className="h-4 w-4"/>Atualizar</button>
   </div>
   <div className="mt-5 grid gap-3 sm:grid-cols-3">
     {[['Aguardando análise',pending],['Unidades disponíveis',units.filter(u=>u.active).length],['Vencimentos em 30 dias',upcoming]].map(([label,n])=>
       <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><strong className="mt-1 block text-2xl text-navy-900">{n}</strong></div>)}
   </div>
  </div>
  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
   <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h3 className="flex items-center gap-2 text-base font-bold text-navy-900"><ClipboardCheck className="h-5 w-5 text-orange-600"/>Solicitações de empresas</h3>
     <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar empresa, CNPJ, CNAE…" aria-label="Buscar solicitação" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:max-w-xs"/></div>
   {loading?<p className="text-sm text-slate-500">Carregando…</p>:filtered.length===0?<p className="text-sm text-slate-500">Nenhuma solicitação encontrada.</p>:filtered.map(r=>{
    const attached=docs.filter(d=>d.request_id===r.id);
    return <article key={r.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
     <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><h4 className="break-words text-sm font-bold text-navy-900">{r.company_name}</h4>
        <p className="mt-1 text-xs text-slate-500">CNPJ {r.cnpj} · CNAE {r.cnae} · {r.term_months} meses</p>
        <p className="mt-1 text-xs text-slate-600">{r.responsible_name} · {r.contact_email}</p></div>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-navy-800">{labels[r.status]}</span>
     </div>
     <div className="flex flex-wrap gap-2">{attached.map(d=><button key={d.id} type="button" onClick={()=>void openDoc(d)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-blue-700"><FolderLock className="h-4 w-4"/>{d.file_name}</button>)}</div>
     <label className="block space-y-1"><span className="text-xs font-semibold text-slate-600">Parecer da equipe</span>
      <textarea value={notes[r.id]??r.review_notes} onChange={e=>setNotes(v=>({...v,[r.id]:e.target.value}))} rows={2} maxLength={2000} className="w-full resize-y rounded-lg border border-slate-200 p-3 text-xs" placeholder="Pendências documentais, observações de viabilidade…"/></label>
     <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy!==null} onClick={()=>void review(r.id,'under_review')} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Em análise</button>
      <button type="button" disabled={busy!==null} onClick={()=>void review(r.id,'approved')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"><CheckCircle2 className="mr-1 inline h-4 w-4"/>Aprovar elegibilidade</button>
      <button type="button" disabled={busy!==null} onClick={()=>void review(r.id,'rejected')} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"><XCircle className="mr-1 inline h-4 w-4"/>Solicitar ajustes</button>
     </div>
     <p className="text-[11px] text-slate-500">Aprovar a análise não ativa contratos nem emite declarações. Confirme a viabilidade municipal e a documentação da unidade.</p>
    </article>;
   })}
  </div>
  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
   <h3 className="flex items-center gap-2 font-bold text-navy-900"><Building2 className="h-5 w-5 text-orange-600"/>Coworkings parceiros</h3>
   {providers.length===0?<p className="text-sm text-slate-500">Nenhuma unidade solicitou credenciamento.</p>:providers.map(p=><article key={p.id} className="space-y-2 rounded-xl border border-slate-200 p-4">
     <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-navy-900">Solicitação de unidade · {new Date(p.created_at).toLocaleDateString('pt-BR')}</p><span className="text-xs text-slate-500">{labels[p.status]}</span></div>
     <p className="break-words text-xs text-slate-600">{p.details}</p>
     <textarea rows={2} maxLength={2000} value={notes[p.id]??p.admin_notes} onChange={e=>setNotes(v=>({...v,[p.id]:e.target.value}))} placeholder="Parecer de credenciamento" className="w-full rounded-lg border border-slate-200 p-3 text-xs"/>
     {p.status==='submitted'&&<div className="flex flex-wrap gap-2">
       <button type="button" disabled={busy!==null} onClick={()=>void review(p.id,'approved',true)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Credenciar unidade</button>
       <button type="button" disabled={busy!==null} onClick={()=>void review(p.id,'rejected',true)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">Rejeitar</button>
     </div>}
    </article>)}
   <div className="grid gap-2 sm:grid-cols-2">{units.map(u=><div key={u.id} className="rounded-xl bg-slate-50 p-3 text-xs"><strong className="block break-words text-navy-900">{u.name}</strong><span className="block text-slate-500">{u.street_address}</span><span className="mt-1 block font-semibold text-emerald-700">{u.active?'Habilitada':'Suspensa'}</span></div>)}</div>
  </div>
  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
   <h3 className="flex items-center gap-2 font-bold text-navy-900"><CalendarClock className="h-5 w-5 text-orange-600"/>Contratos, documentos e vigência</h3>
   {contracts.length===0?<p className="text-sm text-slate-500">Nenhum contrato fiscal foi ativado. Não é possível emitir declarações sem contrato e pagamento legítimo.</p>:contracts.map(c=>{
     const valid=c.status==='ativo'&&c.payment_status==='paid'&&c.payment_is_live;
     const contractDocs=docs.filter(d=>d.contract_id===c.id);
     return <article key={c.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
       <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-navy-900">{c.company_name}</p><p className="text-xs text-slate-500">CNPJ {c.cnpj} · Vence em {c.renewal_date.split('-').reverse().join('/')}</p></div>
       <span className={`rounded-full px-3 py-1 text-xs font-semibold ${valid?'bg-emerald-50 text-emerald-800':'bg-amber-50 text-amber-800'}`}>{valid?'Contrato ativo e pago':'Pendente de confirmação'}</span></div>
       {contractDocs.map(d=><div key={d.id} className="flex flex-wrap items-center gap-2">
         <button type="button" onClick={()=>void openDoc(d)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700"><FileCheck2 className="h-4 w-4"/>{d.file_name}</button>
         {valid&&!d.verified&&<button type="button" onClick={()=>void verifyDoc(d)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold">Validar autenticidade</button>}
         {d.verified&&<a className="inline-flex items-center gap-1 text-xs text-emerald-700" target="_blank" rel="noopener noreferrer" href={`${window.location.origin}/?verify_fiscal=${encodeURIComponent(d.verification_code)}`}><ExternalLink className="h-3.5 w-3.5"/>Link de verificação</a>}
       </div>)}
       {valid&&<label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white">
         <Upload className="h-4 w-4"/>{busy===c.id?'Enviando…':'Anexar documento assinado'}
         <input type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={busy!==null} className="sr-only" onChange={e=>{void uploadContractDoc(c,e.target.files?.[0]||null);e.currentTarget.value=''}}/>
       </label>}
       <p className="text-[11px] text-slate-500">Arquivos privados. O código público confirma autenticidade e vigência sem revelar dados da empresa.</p>
     </article>;
   })}
  </div>
  <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0"/>Aprovações administrativas não substituem licença municipal, assinatura contratual nem liquidação financeira verificada no servidor.</p>
 </section>;
}