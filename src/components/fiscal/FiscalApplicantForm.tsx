import { useEffect, useState, type FormEvent } from 'react';
import { Building2, CheckCircle2, FileText, LoaderCircle, Plus, ShieldCheck, Trash2, UploadCloud, UserRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { validCnpj, type FiscalPlanId } from '../../lib/fiscal-payment';
import {
 fiscalFileError, requiredBusinessDocuments, validateBusiness, validatePerson,
 type ApplicantType, type BusinessDetails, type FiscalDocumentKind, type Partner, type PersonDetails, type RequiredDocument
} from '../../lib/fiscal-intake';

export type CreatedFiscalApplication={
 id:string;company_name:string;plan_id:string;term_months:number;transfer_from:string;status:'submitted'|'under_review'|'approved'|'rejected';
 applicant_type:ApplicantType;intake_details:PersonDetails|BusinessDetails;
};
const emptyPartner=():Partner=>({name:'',rg:'',cpf:'',address:'',cep:'',activity:''});
const fieldClass='w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-navy-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100';
const keyFor=(r:RequiredDocument)=>r.kind+':'+(r.signerIndex??'none');
const validPdfOrImage=(file:File)=>fiscalFileError(file);
type DocRow={id:string;file_name:string;document_kind:FiscalDocumentKind|null;signer_index:number|null};
type Account={id:string;name:string;email:string};
type FieldProps={title:string;value:string;onChange:(value:string)=>void;placeholder?:string;type?:string;autoComplete?:string;maxLength?:number};
function Field({title,value,onChange,placeholder='',type='text',autoComplete='off',maxLength=180}:FieldProps){
 return <label className="block min-w-0 space-y-1.5"><span className="block text-xs font-semibold text-navy-900">{title} <span className="text-rose-600">*</span></span>
  <input className={fieldClass} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
   type={type} autoComplete={autoComplete} maxLength={maxLength} required/>
 </label>;
}
async function uploadDoc(appId:string,userId:string,kind:FiscalDocumentKind,signerIndex:number|null,file:File){
 const validation=validPdfOrImage(file);
 if(validation)throw new Error(validation);
 const ext=file.name.split('.').pop()?.toLowerCase();
 const path='requests/'+appId+'/'+crypto.randomUUID()+'.'+ext;
 const {error:storageError}=await supabase.storage.from('fiscal-private')
  .upload(path,file,{upsert:false,contentType:file.type,cacheControl:'0'});
 if(storageError)throw new Error('Não foi possível enviar '+file.name+'. Tente novamente.');
 const {error:recordError}=await supabase.from('fiscal_private_documents').insert({
  request_id:appId,contract_id:null,uploader_id:userId,
  file_path:path,file_name:file.name.slice(0,180),
  category:kind==='partner_address'?'proof':'registration',
  document_kind:kind,signer_index:signerIndex,verified:false,publicly_verifiable:false
 });
 if(recordError)throw new Error('O arquivo foi recebido, mas não foi possível registrar '+file.name+'. Contate a MVA.');
}
export function FiscalApplicantForm({account,planId,term,transfer,onSubmitted}:{
 account:Account;planId:FiscalPlanId;term:1|12;transfer:boolean;onSubmitted:(app:CreatedFiscalApplication)=>void;
}){
 const [type,setType]=useState<ApplicantType>('pf');
 const [pf,setPf]=useState<PersonDetails>({
  full_name:account.name||'',rg:'',cpf:'',address:'',cep:'',profession:'',marital_status:'',
  birth_date:'',phone:'',email:account.email||'',activity:''
 });
 const [pj,setPj]=useState<BusinessDetails>({
  company_name:'',cnpj:'',activity:'',phone:'',email:account.email||'',
  accountant_name:'',accountant_phone:'',accountant_crc:'',has_amendments:false,signers:[emptyPartner()]
 });
 const [transferFrom,setTransferFrom]=useState('');
 const [termsAccepted,setTermsAccepted]=useState(false);
 const [files,setFiles]=useState<Record<string,File[]>>({});
 const [completed,setCompleted]=useState<string[]>([]);
 const [created,setCreated]=useState<CreatedFiscalApplication|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [progress,setProgress]=useState('');
 const setPerson=(key:keyof PersonDetails,value:string)=>{setPf(s=>({...s,[key]:value}));setError('')};
 const setBusiness=(key:Exclude<keyof BusinessDetails,'signers'|'has_amendments'>,value:string)=>{setPj(s=>({...s,[key]:value}));setError('')};
 const setPartner=(idx:number,key:keyof Partner,value:string)=>setPj(s=>({...s,signers:s.signers.map((p,i)=>i===idx?{...p,[key]:value}:p)}));
 const updateFiles=(requirement:RequiredDocument,selected:File[])=>{
  setFiles(prev=>({...prev,[keyFor(requirement)]:selected}));
  setError('');
 };
 const requirements=type==='pj'?requiredBusinessDocuments(pj):[];
 const uploadEntries=requirements.flatMap(req=>{
  const filesForKind=files[keyFor(req)]||[];
  return filesForKind.map((file,index)=>({req,file,key:keyFor(req)+':'+index}));
 });
 const submit=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();
  if(busy)return;
  const validation=type==='pf'?validatePerson(pf):validateBusiness(pj);
  if(validation){setError(validation);return}
  if(type==='pj'&&!validCnpj(pj.cnpj)){setError('O CNPJ informado não é válido.');return}
  if(transfer&&transferFrom.trim().length<3){setError('Informe o endereço anterior para avaliar o desconto de transferência.');return}
  if(!termsAccepted){setError('Aceite as condições de análise e tratamento dos documentos.');return}
  if(type==='pj'){
   for(const req of requirements){
    if(!(files[keyFor(req)]?.length)){setError('Anexe: '+req.label+'.');return}
   }
   for(const item of uploadEntries){const problem=validPdfOrImage(item.file);if(problem){setError(item.req.label+': '+problem);return}}
  }
  setBusy(true);setError('');
  try{
   let app=created;
   if(!app){
    const contact=type==='pf'?pf:pj;
    const {data,error:insertError}=await supabase.from('fiscal_applications').insert({
     user_id:account.id,company_name:type==='pf'?pf.full_name.trim():pj.company_name.trim(),
     cnpj:type==='pf'?'em abertura':pj.cnpj.trim(),cnae:contact.activity.trim(),
     responsible_name:type==='pf'?pf.full_name.trim():pj.signers[0].name.trim(),
     contact_email:contact.email.trim(),contact_phone:contact.phone.trim(),
     plan_id:planId,term_months:term,transfer_from:transfer?transferFrom.trim():'',
     applicant_type:type,intake_details:type==='pf'?pf:pj,terms_version:'2026-11-09'
    }).select('id,company_name,plan_id,term_months,transfer_from,status,applicant_type,intake_details').single();
    if(insertError||!data)throw new Error('Não foi possível registrar o pedido. Confira os dados e tente novamente.');
    app=data as CreatedFiscalApplication;
    setCreated(app);
   }
   if(type==='pj'){
    for(const item of uploadEntries){
     if(completed.includes(item.key))continue;
     setProgress('Enviando '+item.req.label+'…');
     await uploadDoc(app.id,account.id,item.req.kind,item.req.signerIndex,item.file);
     setCompleted(prev=>[...prev,item.key]);
    }
   }
   setProgress('');
   onSubmitted(app);
  }catch(e){setError(e instanceof Error?e.message:'Falha ao enviar a solicitação.');setProgress('');}
  finally{setBusy(false)}
 };
 const locked=created!==null;
 return <form onSubmit={e=>{void submit(e)}} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
  <div className="space-y-1"><p className="text-sm font-bold text-navy-900">Identificação do contratante</p>
   <p className="text-xs leading-5 text-slate-600">Selecione quem fará a contratação. Os campos mudam automaticamente conforme a opção.</p>
  </div>
  <fieldset disabled={locked} className="grid gap-3 sm:grid-cols-2">
   <legend className="sr-only">Tipo de pessoa contratante</legend>
   {([{value:'pf',title:'Pessoa Física',caption:'Contratação em nome próprio',icon:UserRound},
      {value:'pj',title:'Pessoa Jurídica',caption:'Empresa com CNPJ e documentos societários',icon:Building2}] as const).map(option=>{
    const Icon=option.icon;
    return <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${type===option.value?'border-orange-600 bg-orange-50':'border-slate-200 bg-white hover:border-slate-400'}`}>
     <input type="radio" name="applicant-type" value={option.value} checked={type===option.value}
      onChange={()=>{setType(option.value);setError('')}} className="mt-1 accent-orange-600"/>
     <Icon className="mt-0.5 h-5 w-5 shrink-0 text-orange-700"/>
     <span><strong className="block text-sm text-navy-950">{option.title}</strong><span className="mt-1 block text-xs text-slate-600">{option.caption}</span></span>
    </label>;
   })}
  </fieldset>
  <fieldset disabled={locked} className="space-y-5">
   {type==='pf'?<>
    <div className="border-b border-slate-200 pb-2"><h3 className="text-sm font-bold text-navy-900">Dados da Pessoa Física</h3></div>
    <div className="grid gap-4 sm:grid-cols-2">
     <Field title="Nome completo" value={pf.full_name} onChange={v=>setPerson('full_name',v)} autoComplete="name"/>
     <Field title="RG" value={pf.rg} onChange={v=>setPerson('rg',v)} placeholder="Número do documento"/>
     <Field title="CPF" value={pf.cpf} onChange={v=>setPerson('cpf',v)} placeholder="000.000.000-00" maxLength={14}/>
     <Field title="Data de nascimento" value={pf.birth_date} onChange={v=>setPerson('birth_date',v)} type="date"/>
     <Field title="Endereço completo (rua, número, bairro, cidade/UF)" value={pf.address} onChange={v=>setPerson('address',v)} autoComplete="street-address" maxLength={280}/>
     <Field title="CEP atualizado" value={pf.cep} onChange={v=>setPerson('cep',v)} placeholder="00000-000" autoComplete="postal-code" maxLength={9}/>
     <Field title="Profissão" value={pf.profession} onChange={v=>setPerson('profession',v)}/>
     <label className="block space-y-1.5"><span className="text-xs font-semibold text-navy-900">Estado civil <span className="text-rose-600">*</span></span>
      <select required className={fieldClass} value={pf.marital_status} onChange={e=>setPerson('marital_status',e.target.value)}>
       <option value="">Selecione</option><option>Solteiro(a)</option><option>Casado(a)</option>
       <option>União estável</option><option>Divorciado(a)</option><option>Viúvo(a)</option><option>Separado(a)</option>
      </select></label>
     <Field title="Número telefônico" value={pf.phone} onChange={v=>setPerson('phone',v)} type="tel" autoComplete="tel" maxLength={20}/>
     <Field title="E-mail" value={pf.email} onChange={v=>setPerson('email',v)} type="email" autoComplete="email" maxLength={254}/>
    </div>
    <Field title="Ramo de atividade" value={pf.activity} onChange={v=>setPerson('activity',v)} placeholder="Descreva sua atividade profissional" maxLength={120}/>
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-900">Para a contratação por Pessoa Física, o uso fiscal vinculado a CNPJ dependerá de posterior regularização e análise da MVA. A seleção não substitui documentos societários exigidos para uma empresa.</div>
   </>:<>
    <div className="border-b border-slate-200 pb-2"><h3 className="text-sm font-bold text-navy-900">Dados da Pessoa Jurídica</h3></div>
    <div className="grid gap-4 sm:grid-cols-2">
     <Field title="Razão social" value={pj.company_name} onChange={v=>setBusiness('company_name',v)} autoComplete="organization"/>
     <Field title="CNPJ" value={pj.cnpj} onChange={v=>setBusiness('cnpj',v)} placeholder="00.000.000/0000-00" maxLength={30}/>
     <Field title="Área de atuação / CNAE da empresa" value={pj.activity} onChange={v=>setBusiness('activity',v)} maxLength={120}/>
     <Field title="Telefone da empresa" value={pj.phone} onChange={v=>setBusiness('phone',v)} type="tel" maxLength={20}/>
     <Field title="E-mail para contato" value={pj.email} onChange={v=>setBusiness('email',v)} type="email" maxLength={254}/>
    </div>
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
     <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h4 className="text-sm font-bold text-navy-900">Sócios que assinam pela empresa</h4>
       <p className="mt-1 text-xs text-slate-600">Cadastre todos os signatários e anexe os documentos de cada um.</p></div>
      <button type="button" disabled={locked||pj.signers.length>=20} onClick={()=>setPj(s=>({...s,signers:[...s.signers,emptyPartner()]}))}
       className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-navy-900"><Plus className="h-4 w-4"/> Adicionar sócio</button>
     </div>
     {pj.signers.map((partner,i)=><div key={i} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between"><h5 className="text-sm font-semibold text-navy-900">Sócio signatário {i+1}</h5>
       {pj.signers.length>1&&<button type="button" disabled={locked}
        onClick={()=>{setPj(s=>({...s,signers:s.signers.filter((_,j)=>j!==i)}));setFiles({});}}
        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700"><Trash2 className="h-4 w-4"/>Remover</button>}</div>
      <div className="grid gap-3 sm:grid-cols-2">
       <Field title="Nome completo" value={partner.name} onChange={v=>setPartner(i,'name',v)}/>
       <Field title="RG" value={partner.rg} onChange={v=>setPartner(i,'rg',v)}/>
       <Field title="CPF" value={partner.cpf} onChange={v=>setPartner(i,'cpf',v)} maxLength={14}/>
       <Field title="Área de atuação" value={partner.activity} onChange={v=>setPartner(i,'activity',v)}/>
       <Field title="Endereço completo" value={partner.address} onChange={v=>setPartner(i,'address',v)} maxLength={280}/>
       <Field title="CEP atualizado" value={partner.cep} onChange={v=>setPartner(i,'cep',v)} maxLength={9}/>
      </div>
     </div>)}
    </div>
    <div className="space-y-3">
     <h4 className="text-sm font-bold text-navy-900">Contador responsável</h4>
     <div className="grid gap-4 sm:grid-cols-3">
      <Field title="Nome do contador" value={pj.accountant_name} onChange={v=>setBusiness('accountant_name',v)}/>
      <Field title="Telefone do contador" value={pj.accountant_phone} onChange={v=>setBusiness('accountant_phone',v)} type="tel" maxLength={20}/>
      <Field title="CRC do contador" value={pj.accountant_crc} onChange={v=>setBusiness('accountant_crc',v)} placeholder="Ex.: SE-000000/O-0" maxLength={50}/>
     </div>
    </div>
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
     <div className="flex items-start gap-2"><FileText className="mt-0.5 h-5 w-5 text-orange-600"/>
      <div><h4 className="text-sm font-bold text-navy-900">Documentação societária obrigatória</h4>
       <p className="text-xs text-slate-600">RG, CPF e comprovante de endereço de cada sócio, além do contrato social. PDF, PNG ou JPG (até 10 MB por arquivo).</p></div></div>
     <label className="block text-xs font-semibold text-navy-900">A empresa possui alterações contratuais?
      <select className={`mt-2 ${fieldClass}`} value={pj.has_amendments?'yes':'no'}
       onChange={e=>{setPj(s=>({...s,has_amendments:e.target.value==='yes'}));setError('')}}>
       <option value="no">Não — somente contrato social original/atual</option>
       <option value="yes">Sim — anexarei todas as alterações contratuais</option>
      </select>
     </label>
     <div className="grid gap-3 sm:grid-cols-2">
      {requirements.map(req=><label key={keyFor(req)} className="block space-y-1.5 rounded-xl border border-slate-200 bg-white p-3">
       <span className="block text-xs font-semibold text-navy-900">{req.label} <span className="text-rose-600">*</span></span>
       <input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        multiple={req.kind==='contract_amendments'} onChange={e=>updateFiles(req,Array.from(e.target.files||[]))}
        className="block w-full max-w-full text-xs text-slate-700 file:mr-2 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:font-bold file:text-orange-800"/>
       {files[keyFor(req)]?.length>0&&<span className="block text-[11px] text-emerald-700"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5"/>{files[keyFor(req)].length} arquivo(s) selecionado(s)</span>}
      </label>)}
     </div>
    </div>
   </>}
   {transfer&&<Field title="Endereço anterior para transferência (condição anual)" value={transferFrom} onChange={setTransferFrom} maxLength={180}/>}
   <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
    <input type="checkbox" checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)} className="mt-1 accent-orange-600" required/>
    <span>Declaro que os dados e documentos são verdadeiros e autorizo seu tratamento para análise de elegibilidade, contratação e formalização pela MVA, conforme as informações de privacidade aplicáveis. Compreendo que o pagamento e a autorização de uso do endereço dependem da aprovação da equipe.</span>
   </label>
  </fieldset>
  {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{error}</p>}
  {progress&&<p role="status" className="flex items-center gap-2 text-xs font-semibold text-navy-900"><LoaderCircle className="h-4 w-4 animate-spin"/>{progress}</p>}
  {created&&error&&<p className="text-xs leading-5 text-amber-900">O pedido foi registrado. Tente enviar novamente os anexos, sem criar outra solicitação.</p>}
  <button type="submit" disabled={busy} className="action-primary checkout-submit">
   {busy?<LoaderCircle className="mr-2 inline h-4 w-4 animate-spin"/>:<ShieldCheck className="mr-2 inline h-4 w-4"/>}
   {busy?'Enviando documentação…':created?'Tentar concluir envio':'Enviar solicitação para análise'}
  </button>
 </form>;
}

/** Enables an applicant to finish uploading documents after refreshing or reopening the checkout. */
export function FiscalMissingDocuments({application,accountId}:{
 application:CreatedFiscalApplication;accountId:string;
}){
 const details=application.intake_details as BusinessDetails;
 const required=requiredBusinessDocuments(details);
 const [uploaded,setUploaded]=useState<DocRow[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState('');
 const [error,setError]=useState('');
 const refresh=async()=>{
  const {data,error:loadError}=await supabase.from('fiscal_private_documents')
   .select('id,file_name,document_kind,signer_index').eq('request_id',application.id);
  if(loadError){setError('Não foi possível conferir os documentos enviados.');return}
  setUploaded((data||[]) as DocRow[]);setLoading(false);
 };
 // Read only the applicant's private metadata. The RLS policy protects the query.
 useEffect(()=>{setUploaded([]);setLoading(true);void refresh()},[application.id]);
 const missing=required.filter(req=>!uploaded.some(d=>d.document_kind===req.kind&&d.signer_index===req.signerIndex));
 const upload=async(req:RequiredDocument,files:File[])=>{
  if(!files.length)return;
  setBusy(keyFor(req));setError('');
  try{
   for(const file of files)await uploadDoc(application.id,accountId,req.kind,req.signerIndex,file);
   await refresh();
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível anexar o documento.')}
  finally{setBusy('')}
 };
 return <div className="space-y-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
  <p className="text-sm font-bold text-navy-900"><UploadCloud className="mr-2 inline h-4 w-4"/>Documentação da Pessoa Jurídica</p>
  <p className="text-xs leading-5 text-slate-700">{loading?'Conferindo anexos…':missing.length===0?'Todos os tipos de comprovantes foram recebidos. Aguarde a conferência humana.':`Faltam ${missing.length} tipo(s) de comprovante(s). Envie os arquivos para permitir a análise.`}</p>
  {error&&<p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
  {!loading&&missing.map(req=><label key={keyFor(req)} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
   <span className="text-xs font-semibold text-navy-900">{req.label}</span>
   <input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
    multiple={req.kind==='contract_amendments'} disabled={busy!==''} onChange={e=>{void upload(req,Array.from(e.target.files||[]));e.currentTarget.value=''}}
    className="block min-w-0 max-w-full text-xs text-slate-700 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold"/>
  </label>)}
  {busy&&<p role="status" className="text-xs text-orange-800">Enviando arquivo com segurança…</p>}
 </div>;
}
