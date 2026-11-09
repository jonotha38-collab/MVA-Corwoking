import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, CalendarClock, CheckCircle2, ClipboardCheck, ExternalLink, FileCheck2, FolderLock, RefreshCw, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fiscalApplicationQueue, type FiscalQueue } from '../../lib/fiscal-application-flow';
import { useCoworking } from '../../context/CoworkingContext';
import type { FiscalApplication } from '../fiscal/FiscalServiceCenter';

type Provider={id:string;owner_id:string;space_id:string;details:string;status:'submitted'|'approved'|'rejected';admin_notes:string;created_at:string};
type Unit={id:string;name:string;street_address:string;active:boolean;approved_at:string|null};
type Contract={id:string;user_id:string;company_name:string;cnpj:string;renewal_date:string;status:string;payment_status:string;payment_is_live:boolean;plan_id:string|null;formalized_at:string|null;application_id:string|null};
type Doc={id:string;request_id:string|null;contract_id:string|null;file_path:string;file_name:string;category:string;verified:boolean;publicly_verifiable:boolean;verification_code:string};
type FiscalOrder={resource_id:string;status:string;livemode:boolean;paid_at:string|null};
const FISCAL_QUEUES:{key:FiscalQueue;label:string}[]=[
 {key:'pending',label:'Em análise'},
 {key:'approved',label:'Aprovados'},
 {key:'paid',label:'Pagamento confirmado'},
 {key:'rejected',label:'Rejeitados'}
];
const labels:Record<string,string>={submitted:'Recebida',under_review:'Em análise',approved:'Aprovada',rejected:'Rejeitada'};
const daysUntil=(value:string)=>Math.ceil((new Date(value+'T12:00:00-03:00').getTime()-Date.now())/86400000);

export function FiscalOperationsCenter(){
 const {currentUser,showToast}=useCoworking();
 const [requests,setRequests]=useState<FiscalApplication[]>([]);
 const [providers,setProviders]=useState<Provider[]>([]);
 const [contracts,setContracts]=useState<Contract[]>([]);
 const [units,setUnits]=useState<Unit[]>([]);
 const [docs,setDocs]=useState<Doc[]>([]);
 const [orders,setOrders]=useState<FiscalOrder[]>([]);
 const [queue,setQueue]=useState<FiscalQueue>('pending');
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState<string|null>(null);
 const [search,setSearch]=useState('');
 const [notes,setNotes]=useState<Record<string,string>>({});
 const reload=useCallback(async()=>{
  if(!currentUser)return;
  setLoading(true);
  const [ar,pr,cr,ur,dr,orderRes]=await Promise.all([
    supabase.from('fiscal_applications').select('*').order('created_at',{ascending:false}).limit(500),
    supabase.from('fiscal_provider_requests').select('*').order('created_at',{ascending:false}).limit(200),
    supabase.from('fiscal_contracts').select('id,user_id,company_name,cnpj,renewal_date,status,payment_status,payment_is_live,plan_id,formalized_at,application_id').order('renewal_date').limit(500),
    supabase.from('fiscal_units').select('id,name,street_address,active,approved_at').order('name'),
    supabase.from('fiscal_private_documents').select('id,request_id,contract_id,file_path,file_name,category,verified,publicly_verifiable,verification_code').order('created_at',{ascending:false}).limit(500),
    supabase.from('mva_checkout_orders').select('resource_id,status,livemode,paid_at').eq('kind','fiscal').order('created_at',{ascending:false}).limit(500),
  ]);
  if(ar.error||pr.error||cr.error||ur.error||dr.error||orderRes.error)showToast('Não foi possível carregar todos os registros fiscais. Verifique suas permissões.','error');
  else{
   setRequests((ar.data||[]) as FiscalApplication[]);
   setProviders((pr.data||[]) as Provider[]);
   setContracts((cr.data||[]) as Contract[]);
   setUnits((ur.data||[]) as Unit[]);
   setDocs((dr.data||[]) as Doc[]);
   setOrders((orderRes.data||[]) as FiscalOrder[]);
  }
  setLoading(false);
 },[currentUser?.id,showToast]);
 useEffect(()=>{void reload()},[reload]);
  useEffect(()=>{
   if(!currentUser)return;
   const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void reload()},60000);
   const refresh=()=>{if(document.visibilityState==='visible')void reload()};
   document.addEventListener('visibilitychange',refresh);
   return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',refresh)};
  },[currentUser?.id,reload]);
 const review=async(id:string,status:'under_review'|'approved'|'rejected',provider=false)=>{
   if(!provider&&orders.some(o=>o.resource_id===id&&o.status==='paid'&&o.livemode)){
     showToast('Pagamento já confirmado. Alterações de elegibilidade exigem reconciliação administrativa.','error');
     return;
   }
   if(!provider&&status==='rejected'&&!(notes[id]||requests.find(r=>r.id===id)?.review_notes||'').trim()){
     showToast('Informe o motivo da rejeição no parecer da equipe.','error');
     return;
   }
   setBusy(id);
   const name=provider?'fiscal_provider_requests':'fiscal_applications';
   const data=provider?{status,admin_notes:(notes[id]||'').slice(0,2000)}:
     {status,review_notes:(notes[id]||'').slice(0,2000)};
   const {error}=await supabase.from(name).update(data).eq('id',id);
   if(error)showToast('Não foi possível alterar o estado. Confira o registro e a elegibilidade da unidade.','error');
   else {
     showToast('Análise registrada.','success');
     await reload();
     if(!provider)setQueue(status==='approved'?'approved':status==='rejected'?'rejected':'pending');
   }
   setBusy(null);
 };
 const openDoc=async(doc:Doc)=>{
   const {data,error}=await supabase.storage.from('fiscal-private').createSignedUrl(doc.file_path,60);
   if(error||!data?.signedUrl){showToast('Não foi possível acessar o documento.','error');return}
   window.open(data.signedUrl,'_blank','noopener,noreferrer');
 };
 const uploadContractDoc=async(contract:Contract,file:File|null,category:'contract'|'authorization')=>{
   if(!file||!currentUser)return;
   if(contract.status==='ativo'||contract.payment_status!=='paid'||contract.payment_is_live!==true){
     showToast('Arquivos assinados só podem ser anexados durante a formalização de contratos realmente pagos.','error');return;
   }
   const ext=file.name.split('.').pop()?.toLowerCase()||'';
   const mime='application/pdf';
   if(ext!=='pdf'||file.size>10*1024*1024||file.size<=0||file.type!==mime){showToast('Anexe somente PDF assinado de até 10 MB.','error');return}
   setBusy(contract.id);
   try{
     const path=`contracts/${contract.id}/${crypto.randomUUID()}.${ext}`;
     const {error:uploadError}=await supabase.storage.from('fiscal-private').upload(path,file,{contentType:mime,upsert:false});
     if(uploadError)throw uploadError;
     const {error:recordError}=await supabase.from('fiscal_private_documents').insert({
       request_id:null,contract_id:contract.id,uploader_id:currentUser.id,file_path:path,
       file_name:file.name.slice(0,180),category,verified:false,publicly_verifiable:false
     });
     if(recordError)throw recordError;
     showToast('Documento recebido. Ainda não está visível ao cliente; a liberação exige aprovação final.','success');
     await reload();
   }catch{showToast('Não foi possível anexar o documento.','error')}
   finally{setBusy(null)}
 };
 const finalizeContract=async(c:Contract)=>{
   if(busy!==null)return;
   if(!window.confirm('Confirma que verificou a atividade, a viabilidade, a identidade, as assinaturas do contrato e da declaração (quando exigida), e que autoriza o uso do endereço da MVA?'))return;
   setBusy(c.id);
   try{
     const {data,error}=await supabase.rpc('mva_finalize_fiscal_contract',{
       p_contract:c.id,p_confirm_review:true,p_notes:(notes[c.id]||'').slice(0,2000)
     });
     if(error||!data?.active)throw error||new Error('Não foi possível concluir a formalização.');
     showToast('Contrato ativado. Documentos assinados liberados automaticamente no painel do cliente.','success');
     await reload();
   }catch(e){showToast(e instanceof Error?e.message:'Falha ao formalizar contrato.','error')}
   finally{setBusy(null)}
 };
 const filtered=useMemo(()=>requests.filter(r=>
  [r.company_name,r.cnpj,r.cnae,r.contact_email].some(x=>x.toLowerCase().includes(search.trim().toLowerCase()))
 ),[requests,search]);
 const paidApplications=new Set(orders.filter(o=>o.status==='paid'&&o.livemode===true).map(o=>o.resource_id));
 const queueOf=(r:FiscalApplication):FiscalQueue=>fiscalApplicationQueue(r.status,paidApplications.has(r.id));
 const queueCounts:Record<FiscalQueue,number>={pending:0,approved:0,paid:0,rejected:0};
 requests.forEach(r=>{queueCounts[queueOf(r)]++});
 const visibleRequests=filtered.filter(r=>queueOf(r)===queue);
 const pending=queueCounts.pending;
  const awaitingFormalization=contracts.filter(c=>c.status!=='ativo'&&c.payment_status==='paid'&&c.payment_is_live).length;
 const upcoming=contracts.filter(c=>c.status==='ativo'&&daysUntil(c.renewal_date)<=30&&daysUntil(c.renewal_date)>=0).length;
 return <section className="space-y-6" aria-label="Administração do endereço fiscal">
  <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div><span className="text-xs font-bold uppercase tracking-widest text-orange-600">Operação MVA</span>
      <h2 className="mt-2 text-2xl font-bold text-navy-900">Gestão de endereço fiscal</h2>
      <p className="mt-1 text-sm text-slate-600">Análise de empresas, verificação de documentos, credenciamento e contratos.</p></div>
    <button type="button" onClick={()=>void reload()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-navy-900"><RefreshCw className="h-4 w-4"/>Atualizar</button>
   </div>
   <div className="mt-5 grid gap-3 sm:grid-cols-4">
     {[['Aguardando análise',pending],['Pagamentos aguardando formalização',awaitingFormalization],['Unidades disponíveis',units.filter(u=>u.active).length],['Vencimentos em 30 dias',upcoming]].map(([label,n])=>
       <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><strong className="mt-1 block text-2xl text-navy-900">{n}</strong></div>)}
   </div>
  </div>
  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
   <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h3 className="flex items-center gap-2 text-base font-bold text-navy-900"><ClipboardCheck className="h-5 w-5 text-orange-600"/>Solicitações de empresas</h3>
     <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar empresa, CNPJ, CNAE…" aria-label="Buscar solicitação" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:max-w-xs"/></div>
   <div role="tablist" aria-label="Etapas de endereço fiscal" className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
     {FISCAL_QUEUES.map(item=><button key={item.key} type="button" role="tab" aria-selected={queue===item.key}
      onClick={()=>setQueue(item.key)} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${queue===item.key?'border-navy-900 bg-navy-900 text-white':'border-slate-200 bg-white text-navy-900 hover:bg-slate-50'}`}>
      {item.label}<span className={`rounded-full px-2 py-0.5 text-[11px] ${queue===item.key?'bg-white/20 text-white':'bg-slate-100 text-slate-700'}`}>{queueCounts[item.key]}</span>
     </button>)}
    </div>
    {loading?<p className="text-sm text-slate-500">Carregando…</p>:visibleRequests.length===0?<p className="text-sm text-slate-500">Nenhuma solicitação nesta etapa.</p>:visibleRequests.map(r=>{
    const attached=docs.filter(d=>d.request_id===r.id);
    const payment=orders.find(o=>o.resource_id===r.id);
    const paid=paidApplications.has(r.id);
    return <article key={r.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
     <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><h4 className="break-words text-sm font-bold text-navy-900">{r.company_name}</h4>
        <p className="mt-1 text-xs text-slate-500">CNPJ {r.cnpj} · CNAE {r.cnae} · {r.term_months} meses</p>
        <p className="mt-1 text-xs text-slate-600">{r.responsible_name} · {r.contact_email}</p></div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paid?'bg-emerald-100 text-emerald-900':r.status==='rejected'?'bg-rose-100 text-rose-800':'bg-slate-100 text-navy-800'}`}>
        {paid?'Pagamento confirmado':r.status==='approved'?'Aprovada · Aguardando pagamento':labels[r.status]}
       </span>
     </div>
     <div className="flex flex-wrap gap-2">{attached.map(d=><button key={d.id} type="button" onClick={()=>void openDoc(d)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-blue-700"><FolderLock className="h-4 w-4"/>{d.file_name}</button>)}</div>
     {r.status==='approved'
       ? <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Parecer da equipe: {r.review_notes||'Sem observações.'}</p>
       : <label className="block space-y-1"><span className="text-xs font-semibold text-slate-600">Parecer da equipe</span>
          <textarea value={notes[r.id]??r.review_notes} onChange={e=>setNotes(v=>({...v,[r.id]:e.target.value}))}
            rows={2} maxLength={2000} className="w-full resize-y rounded-lg border border-slate-200 p-3 text-xs text-navy-900"
            placeholder="Motivo da rejeição, pendências documentais e observações de viabilidade…"/></label>}
     {(r.status==='submitted'||r.status==='under_review')&&<div className="flex flex-wrap gap-2">
       <button type="button" disabled={busy!==null} onClick={()=>void review(r.id,'under_review')} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Em análise</button>
       <button type="button" disabled={busy!==null} onClick={()=>void review(r.id,'approved')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"><CheckCircle2 className="mr-1 inline h-4 w-4"/>Aprovar elegibilidade</button>
       <button type="button" disabled={busy!==null} onClick={()=>void review(r.id,'rejected')} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"><XCircle className="mr-1 inline h-4 w-4"/>Rejeitar solicitação</button>
      </div>}
     {r.status==='rejected'&&<button type="button" disabled={busy!==null} onClick={()=>void review(r.id,'under_review')}
         className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-navy-900">Reabrir análise</button>}
     {r.status==='approved'&&<p role="status" className={`rounded-lg p-3 text-xs font-semibold ${paid?'bg-emerald-50 text-emerald-800':'bg-amber-50 text-amber-900'}`}>
       {paid
         ? `Pagamento real confirmado pelo Stripe${payment?.paid_at?' em '+new Date(payment.paid_at).toLocaleDateString('pt-BR'):''}. A liberação dos documentos continua sujeita à aprovação humana.`
         : payment?.status==='refunded'||payment?.status==='disputed'
         ? 'Pagamento revertido ou contestado. Verifique o caso antes de permitir nova cobrança.'
         : payment?.status==='pending'
         ? `Aguardando confirmação do Stripe · ${r.term_months===1?'1 mês':'12 meses'}.`
         : `Elegibilidade aprovada · ${r.term_months===1?'1 mês':'12 meses'}. O cliente já pode continuar para o pagamento seguro.`}
      </p>}
     <p className="text-[11px] text-slate-500">A análise cadastral não ativa contratos nem emite declarações. Pagamento e formalização são etapas independentes.</p>
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
   {contracts.length===0?<p className="text-sm text-slate-500">Nenhum pagamento fiscal real gerou contrato em formalização até agora.</p>:contracts.map(c=>{
     const valid=c.status==='ativo'&&c.payment_status==='paid'&&c.payment_is_live;
     const contractDocs=docs.filter(d=>d.contract_id===c.id);
     const requiresAuthorization=c.plan_id==='fiscal'||c.plan_id==='fiscal_ie';
     const hasContract=contractDocs.some(d=>d.category==='contract');
     const hasAuthorization=contractDocs.some(d=>d.category==='authorization');
     const canFinalize=!valid&&c.status!=='ativo'&&c.payment_status==='paid'&&c.payment_is_live&&hasContract&&(!requiresAuthorization||hasAuthorization);
     return <article key={c.id} className="space-y-4 rounded-xl border border-slate-200 p-4">
       <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="font-semibold text-navy-900">{c.company_name}</p>
          <p className="text-xs text-slate-500">CNPJ {c.cnpj} · {c.plan_id==='comercial'?'Endereço comercial':'Endereço fiscal'}</p>
          {valid&&<p className="mt-1 text-xs text-slate-600">Vencimento: {c.renewal_date.split('-').reverse().join('/')}</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${valid?'bg-emerald-50 text-emerald-800':'bg-amber-50 text-amber-800'}`}>
         {valid?'Liberado e vigente':c.payment_status!=='paid'?'Pagamento pendente ou revertido':'Pagamento confirmado · Formalização pendente'}
        </span>
       </div>
       {!valid&&c.payment_status==='paid'&&c.payment_is_live&&<div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-semibold text-amber-900">Anexe os documentos assinados; após conferir a regularidade jurídica, libere o cliente em uma única aprovação.</p>
        <div className="flex flex-wrap gap-2">
         {([{category:'contract',label:'Anexar contrato assinado (PDF)'},...(requiresAuthorization?[{category:'authorization',label:'Anexar declaração assinada (PDF)'}]:[])] as {category:'contract'|'authorization';label:string}[]).map(item=>
          <label key={item.category} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-navy-900 px-3 py-2.5 text-xs font-semibold text-white">
           <Upload className="h-4 w-4"/>{item.label}
           <input type="file" accept=".pdf,application/pdf" disabled={busy!==null} className="sr-only" onChange={e=>{void uploadContractDoc(c,e.target.files?.[0]||null,item.category);e.currentTarget.value=''}}/>
          </label>)}
        </div>
        <label className="block space-y-1">
         <span className="text-xs font-semibold text-amber-900">Observações internas da formalização (opcional)</span>
         <textarea rows={2} maxLength={2000} value={notes[c.id]||''} onChange={e=>setNotes(v=>({...v,[c.id]:e.target.value}))} className="w-full resize-y rounded-lg border border-amber-200 bg-white p-3 text-xs text-navy-900"/>
        </label>
        <button type="button" disabled={!canFinalize||busy!==null} onClick={()=>void finalizeContract(c)}
         className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
         <CheckCircle2 className="h-4 w-4"/>{busy===c.id?'Concluindo…':'Confirmar formalização e liberar documentos'}
        </button>
        {!canFinalize&&<p className="text-xs text-amber-900">Pendências: {!hasContract?'contrato assinado':'contrato anexado'}{requiresAuthorization?', '+(!hasAuthorization?'declaração assinada':'declaração anexada'):''}. O cliente ainda não pode utilizar o endereço.</p>}
       </div>}
       {contractDocs.length>0&&<div className="space-y-2">
        <p className="text-xs font-bold text-navy-900">Documentos vinculados</p>
        <div className="flex flex-wrap gap-2">{contractDocs.map(d=><div key={d.id} className="flex flex-wrap items-center gap-2">
         <button type="button" onClick={()=>void openDoc(d)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700"><FileCheck2 className="h-4 w-4"/>{d.category==='contract'?'Contrato':'Declaração'} · {d.file_name}</button>
         {valid&&d.verified&&d.category==='authorization'&&<a className="inline-flex items-center gap-1 text-xs text-emerald-700" target="_blank" rel="noopener noreferrer" href={`${window.location.origin}/?verify_fiscal=${encodeURIComponent(d.verification_code)}`}><ExternalLink className="h-3.5 w-3.5"/>Verificar autenticidade</a>}
        </div>)}</div>
       </div>}
       <p className="text-[11px] text-slate-500">Arquivos privados: entrega ao cliente somente após a confirmação humana. O código público confirma autenticidade e vigência sem revelar dados cadastrais.</p>
     </article>;
   })}
  </div>
  <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0"/>Aprovações administrativas não substituem licença municipal, assinatura contratual nem liquidação financeira verificada no servidor.</p>
 </section>;
}