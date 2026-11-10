import { useEffect, useState } from 'react';
import { ArrowRight, Download, FileCheck2, LoaderCircle, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { t, usePreferences } from '../../lib/preferences';
import { canIssueCertificate } from '../../lib/fiscal-eligibility';
import { supabase } from '../../lib/supabase';
import { rowToFiscal } from '../../lib/mappers';
import { useCoworking } from '../../context/CoworkingContext';
import type { FiscalContract } from '../../types';

export function CertificateDialog({ onClose, onChoosePlan }: { onClose: () => void; onChoosePlan: () => void }) {
 const { currentUser, currentCompany, setAuthModalOpen, setAuthModalTab } = useCoworking();
 usePreferences();
 const [freshContract,setFreshContract]=useState<FiscalContract|null>(null);
 const [checking,setChecking]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [document,setDocument]=useState<{url:string;filename:string}|null>(null);
 const company=freshContract||currentCompany;
 const eligible=!!freshContract&&canIssueCertificate(freshContract);

 useEffect(()=>{
  let alive=true;
  if(!currentUser){setChecking(false);return}
  void supabase.from('fiscal_contracts').select('*')
   .eq('user_id',currentUser.id).eq('status','ativo').eq('payment_status','paid')
   .eq('payment_is_live',true).in('plan_id',['fiscal','fiscal_ie','mva_essencial','mva_profissional','mva_excellence'])
   .gte('renewal_date',new Date().toISOString().slice(0,10))
   .order('created_at',{ascending:false}).limit(1).maybeSingle()
   .then(({data,error})=>{
    if(!alive)return;
    if(!error&&data)setFreshContract(rowToFiscal(data));
    setChecking(false);
   });
  return()=>{alive=false};
 },[currentUser?.id]);
 useEffect(()=>()=>{if(document)URL.revokeObjectURL(document.url)},[document]);

 const download=async()=>{
  if(!eligible||busy||!currentUser)return;
  setBusy(true);setError('');
  try{
   // RLS allows only an active paid contract and a signed, admin-verified document.
   const {data:record,error:queryError}=await supabase.from('fiscal_private_documents')
    .select('file_path,file_name').eq('contract_id',company.id).eq('category','authorization')
    .eq('verified',true).order('created_at',{ascending:false}).limit(1).maybeSingle();
   if(queryError||!record)throw new Error('A declaração assinada ainda não está disponível. Consulte a equipe da MVA.');
   const {data:blob,error:fileError}=await supabase.storage.from('fiscal-private').download(record.file_path);
   if(fileError||!blob)throw new Error('Não foi possível baixar o arquivo aprovado. Atualize a página e tente novamente.');
   setDocument({url:URL.createObjectURL(blob),filename:record.file_name});
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível abrir o documento.')}
  finally{setBusy(false)}
 };
 return <Dialog titleId="certificate-title" onClose={()=>{if(!busy)onClose()}} className="certificate-dialog">
  <div className="certificate-header"><div className="checkout-icon"><FileCheck2 size={23}/></div><button type="button" disabled={busy} onClick={onClose} className="checkout-close" aria-label={t('Fechar')}><X size={21}/></button></div>
  <span className="checkout-kicker">{t('DOCUMENTOS DA EMPRESA')}</span>
  <h2 id="certificate-title">{t('Sua declaração oficial, após a formalização.')}</h2>
  <p className="certificate-description">{t("A MVA confere a elegibilidade, verifica o pagamento, formaliza o contrato e anexa a declaração assinada. Somente depois disso o documento é liberado aqui.")}</p>
  <div className={`certificate-access ${eligible?'is-unlocked':''}`}>
   {eligible?<ShieldCheck size={23}/>:<LockKeyhole size={23}/>}
   <div><strong>{t(checking?'Consultando a contratação…':eligible?'Declaração assinada disponível':'Declaração ainda bloqueada')}</strong>
    <p>{t(!currentUser?'Entre na sua conta para consultar seus contratos.':
     checking?'Verificando vigência, aprovação e pagamento real…':
     eligible?'A MVA confirmou o contrato e o pagamento. O documento assinado é entregue pelo armazenamento privado.':
     company.planId==='comercial'?'O plano comercial não inclui declaração de domicílio fiscal.':
     company.paymentStatus==='paid'&&company.paymentIsLive===true?'Pagamento confirmado. Aguarde a formalização humana e a liberação dos documentos.':
     'A emissão depende da aprovação da empresa, da formalização do contrato e do pagamento real.')}</p>
   </div>
  </div>
  {eligible&&<dl className="certificate-company"><div><dt>{t("Empresa")}</dt><dd>{company.companyName}</dd></div><div><dt>{t("CNPJ")}</dt><dd>{company.cnpj}</dd></div><div><dt>{t("Endereço autorizado")}</dt><dd>{company.unitAddress}</dd></div><div><dt>{t("Vigência")}</dt><dd>{company.startDate.split('-').reverse().join('/')} — {company.renewalDate.split('-').reverse().join('/')}</dd></div></dl>}
  {error&&<p role="alert" className="checkout-error">{t(error)}</p>}
  {document?<><div className="checkout-notice" role="status"><FileCheck2 size={20}/><span>{t("Documento assinado e aprovado pela equipe MVA.")}</span></div>
    <a href={document.url} download={document.filename} className="action-primary checkout-submit"><Download size={18}/>{t("Baixar declaração assinada em PDF")}</a></>:
    eligible?<button type="button" onClick={()=>void download()} disabled={busy||checking} className="action-primary checkout-submit">
      {busy?<LoaderCircle size={18} className="animate-spin"/>:<Download size={18}/>}
      {t(busy?'Preparando download…':'Baixar declaração oficial assinada')}
     </button>:
    !currentUser?<button type="button" className="action-primary checkout-submit" onClick={()=>{setAuthModalTab('login');setAuthModalOpen(true)}}>{t("Entrar para consultar")}<ArrowRight size={17}/></button>:
    <button type="button" className="action-primary checkout-submit" onClick={onChoosePlan}>{t("Consultar contratação")}<ArrowRight size={17}/></button>}
  <p className="checkout-fineprint"><ShieldCheck size={15}/>{t("A MVA autoriza o uso do endereço somente após formalização e verificação dos documentos.")}</p>
 </Dialog>;
}
