import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Building2, CalendarClock, FileCheck2, FilePlus2, FolderLock, LockKeyhole, ShieldCheck, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { t, usePreferences } from '../../lib/preferences';
import { useCoworking } from '../../context/CoworkingContext';
import { FISCAL_PLANS, type FiscalPlanId, validCnpj } from '../../lib/fiscal-payment';
import { rowToFiscal } from '../../lib/mappers';
import type { FiscalContract } from '../../types';

export type FiscalApplication = {
 id:string; user_id:string; company_name:string; trading_name:string; cnpj:string; cnae:string;
 responsible_name:string; contact_email:string; contact_phone:string; plan_id:FiscalPlanId;
 term_months:1|12; transfer_from:string; unit_id:string|null;
 status:'submitted'|'under_review'|'approved'|'rejected'; review_notes:string; created_at:string;
};
type DocumentRow={id:string;request_id:string|null;contract_id:string|null;file_path:string;file_name:string;category:string;verified:boolean;publicly_verifiable:boolean;verification_code:string};
type Unit={id:string;name:string;street_address:string;city:string;state:string};
type FiscalOrder={resource_id:string;status:string;livemode:boolean;paid_at:string|null};
const labels:Record<string,string>={submitted:'Recebida',under_review:'Em análise',approved:'Elegível para contratação',rejected:'Ajustes necessários'};
const PLAN_IDS: FiscalPlanId[]=['mva_essencial','mva_profissional','mva_excellence'];
const safeError=(e:unknown)=> e instanceof Error?e.message:'Não foi possível concluir. Tente novamente.';
const daysUntil=(date:string)=>Math.ceil((new Date(date+'T12:00:00-03:00').getTime()-Date.now())/86400000);

export function FiscalServiceCenter({ initialPlan='mva_profissional', initialTerm=12, requireTransfer=false, mode='full', onSubmitted, onCheckout }:{
 initialPlan?:FiscalPlanId; initialTerm?:1|12; requireTransfer?:boolean; mode?:'full'|'application'|'dashboard';
 onSubmitted?:()=>void; onCheckout:(id:FiscalPlanId,transfer:boolean)=>void;
}) {
 const {currentUser,setAuthModalOpen,setAuthModalTab,showToast}=useCoworking();
  const {language}=usePreferences();
 const [applications,setApplications]=useState<FiscalApplication[]>([]);
 const [documents,setDocuments]=useState<DocumentRow[]>([]);
 const [units,setUnits]=useState<Unit[]>([]);
 const [contracts,setContracts]=useState<FiscalContract[]>([]);
 const [orders,setOrders]=useState<FiscalOrder[]>([]);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(false);
 const [uploading,setUploading]=useState<string|null>(null);
 const [error,setError]=useState('');
 const [plan,setPlan]=useState<FiscalPlanId>(initialPlan);
 const [term,setTerm]=useState<1|12>(initialTerm);
 const [consent,setConsent]=useState(false);
 const [form,setForm]=useState({
   company_name:'',trading_name:'',cnpj:'em abertura',cnae:'',
   responsible_name:'',contact_email:'',contact_phone:'',transfer_from:'',unit_id:'',
 });
 const update=(key:keyof typeof form,value:string)=>setForm(v=>({...v,[key]:value}));
 useEffect(()=>{setPlan(initialPlan)},[initialPlan]);
 useEffect(()=>{setTerm(initialTerm)},[initialTerm]);
 useEffect(()=>{if(currentUser)setForm(v=>({...v,responsible_name:v.responsible_name||currentUser.name,contact_email:v.contact_email||currentUser.email}))},[currentUser?.id]);

 const load=useCallback(async()=>{
   setLoading(true);
   try {
     const [unitRes,reqRes,docRes,contractRes,orderRes]=await Promise.all([
       supabase.from('fiscal_units').select('id,name,street_address,city,state').order('name'),
       currentUser?supabase.from('fiscal_applications').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false}):Promise.resolve({data:[],error:null}),
       currentUser?supabase.from('fiscal_private_documents').select('id,request_id,contract_id,file_path,file_name,category,verified,publicly_verifiable,verification_code').order('created_at',{ascending:false}):Promise.resolve({data:[],error:null}),
       currentUser?supabase.from('fiscal_contracts').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false}):Promise.resolve({data:[],error:null}),
       currentUser?supabase.from('mva_checkout_orders').select('resource_id,status,livemode,paid_at').eq('user_id',currentUser.id).eq('kind','fiscal').order('created_at',{ascending:false}):Promise.resolve({data:[],error:null}),
     ]);
     if(unitRes.error||reqRes.error||docRes.error||contractRes.error||orderRes.error)throw new Error('Não foi possível carregar o painel de endereço fiscal.');
     setUnits((unitRes.data||[]) as Unit[]);
     setApplications((reqRes.data||[]) as FiscalApplication[]);
     setDocuments((docRes.data||[]) as DocumentRow[]);
     setContracts((contractRes.data||[]).map(rowToFiscal));
     setOrders((orderRes.data||[]) as FiscalOrder[]);
   } catch(e){setError(safeError(e))}
   finally {setLoading(false)}
 },[currentUser?.id]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{
   if(!currentUser||mode==='application')return;
   const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void load()},30000);
   const refresh=()=>{if(document.visibilityState==='visible')void load()};
   document.addEventListener('visibilitychange',refresh);
   return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',refresh)};
 },[currentUser?.id,mode,load]);
 const submit=async(e:FormEvent<HTMLFormElement>)=>{
   e.preventDefault();
   if(!currentUser){setAuthModalTab('login');setAuthModalOpen(true);return}
   if(!consent){setError('Leia e aceite as condições da solicitação.');return}
   if(requireTransfer && term===12 && form.transfer_from.trim().length<3){setError('Informe o endereço fiscal anterior para solicitar a condição especial de transferência.');return}
   if(form.company_name.trim().length<3||form.cnae.trim().length<3||!validCnpj(form.cnpj)){
     setError('Confira a razão social, o CNPJ (ou em abertura) e a atividade econômica.');return;
   }
   setBusy(true);setError('');
   try{
     const {error:insertError}=await supabase.from('fiscal_applications').insert({
       user_id:currentUser.id,company_name:form.company_name.trim(),trading_name:form.trading_name.trim(),
       cnpj:form.cnpj.trim(),cnae:form.cnae.trim(),responsible_name:form.responsible_name.trim(),
       contact_email:form.contact_email.trim(),contact_phone:form.contact_phone.trim(),plan_id:plan,
       term_months:term,transfer_from:form.transfer_from.trim(),
       unit_id:form.unit_id||null,terms_version:'2026-10-30',
     });
     if(insertError)throw insertError;
     showToast(t('Solicitação enviada. A equipe analisará o endereço e a atividade da empresa.'),'success');
     setConsent(false);await load();onSubmitted?.();
   }catch(e){setError('Não foi possível enviar a solicitação. Confira os dados e tente novamente.')}
   finally{setBusy(false)}
 };
 const uploadDocument=async(app:FiscalApplication,file:File|null)=>{
   if(!file||!currentUser)return;
   const ext=file.name.split('.').pop()?.toLowerCase()||'';
   if(!['pdf','png','jpg','jpeg'].includes(ext)||file.size>10*1024*1024){
     showToast(t('Escolha PDF, PNG ou JPG de até 10 MB.'),'error');return;
   }
   const mime=ext==='pdf'?'application/pdf':ext==='png'?'image/png':'image/jpeg';
   if(file.type!==mime){showToast(t('O formato do arquivo não corresponde à extensão.'),'error');return}
   setUploading(app.id);
   try{
     const filePath=`requests/${app.id}/${crypto.randomUUID()}.${ext}`;
     const {error:uploadError}=await supabase.storage.from('fiscal-private').upload(filePath,file,{contentType:mime,upsert:false});
     if(uploadError)throw uploadError;
     const {error:metaError}=await supabase.from('fiscal_private_documents').insert({
       request_id:app.id,contract_id:null,uploader_id:currentUser.id,file_path:filePath,
       file_name:file.name.slice(0,180),category:'registration',
     });
     if(metaError)throw metaError;
     showToast(t('Documento enviado de forma privada para análise.'),'success');await load();
   }catch{showToast(t('Não foi possível enviar o documento. Confira sua sessão e tente novamente.'),'error')}
   finally{setUploading(null)}
 };
 const openFile=async(d:DocumentRow)=>{
   const {data,error:err}=await supabase.storage.from('fiscal-private').createSignedUrl(d.file_path,60);
   if(err||!data?.signedUrl){showToast(t('Não foi possível abrir o documento.'),'error');return}
   window.open(data.signedUrl,'_blank','noopener,noreferrer');
 };
 const input=(key:keyof typeof form,label:string,required=true)=><label className="block min-w-0 space-y-1.5" key={key}>
  <span className="text-xs font-semibold text-navy-900">{t(label)}</span>
  <input required={required} value={form[key]} onChange={e=>update(key,e.target.value)}
    maxLength={key==='cnae'?120:key==='contact_email'?254:180}
    className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-navy-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"/>
 </label>;
 return <section id="gestao-endereco-fiscal" className="min-w-0 scroll-mt-36 space-y-6" aria-label={t('Área de gestão de endereço fiscal')}>
  {mode==='full'&&<header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
   <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-600"><FolderLock className="h-4 w-4"/>{t("Gestão digital")}</div>
   <h2 id="fiscal-center-title" className="text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">{t("Meu endereço fiscal")}</h2>
   <p className="max-w-3xl text-sm leading-relaxed text-slate-600">{t("Solicite a análise cadastral, acompanhe a aprovação, envie documentos e administre suas empresas. A autorização de uso do endereço depende de viabilidade, contrato e pagamento confirmado.")}</p>
   <div className="grid gap-3 sm:grid-cols-3">
    {[{icon:ShieldCheck,label:'Análise de atividade'},{icon:FileCheck2,label:'Documentos protegidos'},{icon:CalendarClock,label:'Vigência e renovação'}].map(({icon:Icon,label})=><div key={label} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-medium text-navy-800"><Icon className="h-4 w-4 shrink-0 text-orange-600"/>{t(label)}</div>)}
   </div>
  </header>}
  {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{t(error)}</div>}
  {mode!=='application'&&currentUser && <div className="space-y-4">
    <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-navy-900">{t("Minhas empresas e solicitações")}</h3><button type="button" onClick={()=>void load()} className="text-xs font-semibold text-orange-700 hover:underline">{t("Atualizar")}</button></div>
    {loading?<p className="text-sm text-slate-500">{t("Carregando solicitações…")}</p>:applications.length===0?<p className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">{t("Você ainda não solicitou um endereço fiscal. Preencha o formulário abaixo para começar.")}</p>:<div className="grid gap-3 lg:grid-cols-2">
      {applications.map(app=>{
        const docs=documents.filter(d=>d.request_id===app.id);
        const contract=contracts.find(c=>c.applicationId===app.id);
        const order=orders.find(o=>o.resource_id===app.id&&o.livemode);
        const paid=order?.status==='paid'||(contract?.paymentStatus==='paid'&&contract.paymentIsLive===true);
        const delivered=contract?.status==='ativo'&&contract.paymentStatus==='paid'&&contract.paymentIsLive===true;
        const canUpload=app.status==='submitted'||app.status==='under_review';
        return <article key={app.id} className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0"><h4 className="break-words text-sm font-bold text-navy-900">{app.company_name}</h4><p className="mt-1 text-xs text-slate-500">CNPJ {app.cnpj} · {FISCAL_PLANS[app.plan_id].name}</p></div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${app.status==='approved'?'bg-emerald-50 text-emerald-800':app.status==='rejected'?'bg-rose-50 text-rose-800':'bg-amber-50 text-amber-800'}`}>{t(labels[app.status])}</span>
          </div>
          <p className="text-xs text-slate-500">{t('Solicitação')} {new Date(app.created_at).toLocaleDateString(language==='pt'?'pt-BR':language==='en'?'en-US':'es-ES')} · {t(app.term_months===12?'12 meses':'1 mês')}</p>
          {app.review_notes&&<p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">{app.review_notes}</p>}
          <div className="space-y-2">
            <p className="text-xs font-bold text-navy-900">{t("Documentos")}</p>
            {docs.length===0&&<p className="text-xs text-slate-500">{t("Nenhum documento anexado.")}</p>}
            {docs.map(doc=><button key={doc.id} type="button" onClick={()=>void openFile(doc)} className="flex max-w-full items-center gap-2 text-left text-xs text-blue-700 hover:underline"><FileCheck2 className="h-4 w-4 shrink-0"/><span className="min-w-0 truncate">{doc.file_name}</span></button>)}
            {canUpload&&<label className="inline-flex max-w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-navy-900 hover:bg-slate-50">
              <Upload className="h-4 w-4"/>{t(uploading===app.id?'Enviando…':'Anexar documento')}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={uploading!==null} className="sr-only" onChange={e=>{void uploadDocument(app,e.target.files?.[0]||null);e.currentTarget.value=''}}/>
            </label>}
          </div>
          {app.status==='approved'&&<div role="status" className={`space-y-2 rounded-xl border p-3 ${paid?'border-emerald-200 bg-emerald-50':'border-amber-200 bg-amber-50'}`}>
            <p className={`text-xs font-bold ${paid?'text-emerald-900':'text-amber-900'}`}>
              {t(delivered?'Documentos liberados para download':
               paid?'Pagamento confirmado — formalização em andamento':
               order?.status==='refunded'||order?.status==='disputed'?'Pagamento interrompido — fale com a MVA':
               'Elegibilidade aprovada — aguardando pagamento')}
            </p>
            <p className={`text-xs leading-relaxed ${paid?'text-emerald-800':'text-amber-800'}`}>
              {t(delivered?(app.plan_id==='comercial'?'A MVA concluiu a formalização. O contrato assinado está disponível abaixo.':'A MVA concluiu a conferência humana. A declaração e o contrato assinados estão disponíveis abaixo.'):
               paid?'A MVA está preparando e validando o contrato e os documentos pertinentes. O uso do endereço ainda não está autorizado; o acesso será liberado após aprovação final.':
               'O pagamento será realizado pelo Stripe. Você só poderá utilizar o endereço após a formalização e a autorização da MVA.')}
            </p>
            {!paid&&order?.status!=='refunded'&&order?.status!=='disputed'&&<button type="button" onClick={()=>onCheckout(app.plan_id,!!app.transfer_from)}
             className="rounded-lg bg-navy-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-navy-800">
             {t(order?.status==='pending'?'Continuar pagamento seguro':'Ir para pagamento seguro')}
            </button>}
          </div>}
        </article>;
      })}
    </div>}
    {contracts.filter(c=>c.userId===currentUser.id&&c.id).map(c=>{
       const remaining=daysUntil(c.renewalDate);
       const docs=documents.filter(d=>d.contract_id===c.id);
       return <article key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5">
         <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-navy-900">{c.companyName} · {t('Contrato')}</h3>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${c.status==='ativo'?'bg-emerald-50 text-emerald-800':'bg-amber-50 text-amber-800'}`}>
            {c.status==='ativo'?`${t('Vigência:')} ${remaining<0?t('encerrada'):`${remaining} ${t('dias restantes')}`}`:t('Aguardando formalização')}
          </span>
         </div>
         {c.status==='ativo'
          ? <p className="mt-2 text-xs text-slate-600">{t('Autorização formalizada pela MVA. Renovação prevista:')} {c.renewalDate.split('-').reverse().join('/')} {t('O vencimento não gera cobrança automática.')}</p>
          : <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{t("Pagamento recebido; aguarde a conferência e assinatura dos documentos. Ainda não é permitido utilizar o endereço.")}</p>}
         {c.status==='ativo'&&remaining<=30&&<p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{t("Consulte a MVA para renovar e manter o serviço regularizado.")}</p>}
         <div className="mt-3 flex flex-wrap gap-2">{docs.map(d=><button type="button" key={d.id} onClick={()=>void openFile(d)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-navy-800"><FileCheck2 className="mr-1 inline h-4 w-4"/>{d.category==='contract'?t('Contrato assinado'):d.category==='authorization'?t('Declaração assinada'):d.file_name}</button>)}</div>
         {c.status==='ativo'&&docs.length>0&&<p className="mt-2 text-xs font-medium text-emerald-700">{t("Documentos aprovados disponíveis em acesso privado, para consulta e download.")}</p>}
          {c.status==='ativo'&&c.paymentStatus==='paid'&&c.paymentIsLive===true&&c.planId==='mva_excellence'&&remaining>=0&&
           <div className="mt-4 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-bold text-emerald-900">{t("Benefício Excellence: 1 consulta gratuita com contador")}</p>
            <p className="text-xs text-emerald-800">{t("Uma consulta incluída nesta contratação, mediante agendamento com a equipe MVA.")}</p>
            <a className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800" href={`mailto:contato@mvacoworking.com.br?subject=${encodeURIComponent('Agendar consulta com contador — MVA Excellence')}&body=${encodeURIComponent('Olá, gostaria de utilizar a consulta gratuita incluída no MVA Excellence. Contrato: '+c.id)}`}>{t("Solicitar minha consulta gratuita")}</a>
           </div>}
       </article>;
    })}
  </div>}
  {mode!=='dashboard'&&<form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <div className="flex items-start gap-3"><Building2 className="mt-0.5 h-6 w-6 shrink-0 text-orange-600"/><div><h3 className="text-lg font-bold text-navy-900">{t("Solicitar análise para contratação")}</h3><p className="mt-1 text-xs leading-relaxed text-slate-600">{t("Uma solicitação por empresa. Para cadastrar outra empresa, envie um novo formulário.")}</p></div></div>
    <div className="grid gap-4 md:grid-cols-2">{input('company_name','Razão social')}{input('trading_name','Nome fantasia',false)}{input('cnpj','CNPJ ou "em abertura"')}{input('cnae','Atividade / CNAE')}{input('responsible_name','Responsável legal')}{input('contact_email','E-mail para contato')}{input('contact_phone','Telefone',false)}</div>
    <div className="grid gap-4 md:grid-cols-3">
      <label className="space-y-1.5"><span className="block text-xs font-semibold">{t("Plano pretendido")}</span><select value={plan} onChange={e=>setPlan(e.target.value as FiscalPlanId)} className="w-full rounded-xl border border-slate-200 p-3 text-sm">{PLAN_IDS.map(id=><option key={id} value={id}>{FISCAL_PLANS[id].name}</option>)}</select></label>
      <label className="space-y-1.5"><span className="block text-xs font-semibold">{t("Vigência")}</span><select value={term} onChange={e=>setTerm(Number(e.target.value) as 1|12)} className="w-full rounded-xl border border-slate-200 p-3 text-sm"><option value={1}>{t('1 mês')}</option><option value={12}>{t('12 meses')}</option></select></label>
      <label className="space-y-1.5"><span className="block text-xs font-semibold">{t("Unidade para análise")}</span><select value={form.unit_id} onChange={e=>update('unit_id',e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm"><option value="">{t('Indicação da MVA')}</option>{units.map(u=><option key={u.id} value={u.id}>{u.name} · {u.city}/{u.state}</option>)}</select></label>
    </div>
    <label className="block space-y-1.5"><span className="text-xs font-semibold">{t('Endereço anterior')} {t(requireTransfer&&term===12?'(obrigatório para campanha)':'(se estiver transferindo)')}</span><input required={requireTransfer&&term===12} value={form.transfer_from} onChange={e=>update('transfer_from',e.target.value)} maxLength={180} placeholder={t('Opcional')} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm"/></label>
    <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-0.5 accent-orange-600"/>
      <span>{t('Declaro que os dados são verdadeiros e autorizo a análise cadastral (termos versão 30/10/2026). Entendo que a solicitação')} <strong>{t('não concede uso imediato do endereço')}</strong>{t(', não substitui a viabilidade municipal e não constitui contrato assinado ou pagamento.')}</span>
    </label>
    <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-60 sm:w-auto">
      <FilePlus2 className="h-4 w-4"/>{t(busy?'Enviando…':currentUser?'Enviar solicitação para análise':'Entrar para solicitar')}
    </button>
    <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500"><LockKeyhole className="h-4 w-4 shrink-0"/>{t("Arquivos ficam em armazenamento privado; o acesso é concedido à empresa titular e à administração. Declarações são disponibilizadas somente após aprovação, contrato e pagamento válidos.")}</p>
  </form>}
 </section>;
}
