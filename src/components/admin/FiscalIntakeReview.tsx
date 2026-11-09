import { FileCheck2, FolderLock } from 'lucide-react';
import type { FiscalApplication } from '../fiscal/FiscalServiceCenter';
import { requiredBusinessDocuments, type BusinessDetails, type FiscalDocumentKind, type PersonDetails } from '../../lib/fiscal-intake';

export type IntakeDoc={
 id:string;file_name:string;document_kind:FiscalDocumentKind|null;signer_index:number|null;
};
const names:Record<FiscalDocumentKind,string>={
 partner_rg:'RG do sócio',partner_cpf:'CPF do sócio',
 partner_address:'Comprovante de endereço',social_contract:'Contrato social',
 contract_amendments:'Alteração contratual'
};
export function missingFiscalDocuments(application:FiscalApplication,docs:IntakeDoc[]):string[]{
 if(application.applicant_type!=='pj')return [];
 const b=application.intake_details as BusinessDetails|undefined;
 if(!b||!Array.isArray(b.signers)||b.signers.length===0)return ['Dados dos sócios signatários'];
 return requiredBusinessDocuments(b).filter(req=>!docs.some(d=>d.document_kind===req.kind&&d.signer_index===req.signerIndex)).map(r=>r.label);
}
export function FiscalIntakeReview({application,docs,onOpen}:{
 application:FiscalApplication;docs:IntakeDoc[];onOpen:(doc:IntakeDoc)=>void;
}){
 const kind=application.applicant_type;
 const missing=missingFiscalDocuments(application,docs);
 const entries=(pairs:[string,string|undefined][])=>pairs.map(([label,value])=>
  <p key={label} className="min-w-0 break-words text-xs text-slate-700"><strong className="text-navy-900">{label}:</strong> {value||'Não informado'}</p>);
 const d=(application.intake_details||{}) as Partial<PersonDetails & BusinessDetails>;
 return <div className="space-y-3">
  <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
   <summary className="cursor-pointer text-xs font-bold text-navy-900">
    Cadastro de {kind==='pf'?'Pessoa Física':kind==='pj'?'Pessoa Jurídica':'formato anterior'} e comprovantes ({docs.length})
   </summary>
   <div className="mt-4 space-y-4">
    {kind==='pf'&&<div className="grid gap-2 sm:grid-cols-2">
      {entries([['Nome completo',d.full_name],['RG',d.rg],['CPF',d.cpf],
       ['Endereço',d.address],['CEP',d.cep],['Profissão',d.profession],
       ['Estado civil',d.marital_status],['Data de nascimento',d.birth_date],
       ['Telefone',d.phone],['E-mail',d.email],['Ramo de atividade',d.activity]])}
     </div>}
    {kind==='pj'&&<div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
       {entries([['Razão social',d.company_name],['CNPJ',d.cnpj],['Atividade',d.activity],
        ['Telefone',d.phone],['E-mail',d.email],['Contador',d.accountant_name],
        ['Telefone do contador',d.accountant_phone],['CRC do contador',d.accountant_crc],
        ['Alterações contratuais',d.has_amendments?'Sim':'Não']])}
      </div>
      {(Array.isArray(d.signers)?d.signers:[]).map((p,i)=><div key={i}
       className="rounded-lg border border-slate-200 bg-white p-3">
       <p className="mb-2 text-xs font-bold text-navy-900">Sócio signatário {i+1}: {p.name}</p>
       <div className="grid gap-2 sm:grid-cols-2">
        {entries([['RG',p.rg],['CPF',p.cpf],['Endereço',p.address],['CEP',p.cep],['Área de atuação',p.activity]])}
       </div>
      </div>)}
     </div>}
    {kind==='legacy'&&<p className="text-xs text-slate-600">Solicitação cadastrada antes do novo formulário de Pessoa Física e Jurídica.</p>}
    <div className="space-y-2">
     <h5 className="text-xs font-bold text-navy-900">Comprovantes privados</h5>
     {docs.length===0&&<p className="text-xs text-slate-500">Nenhum documento enviado.</p>}
     <div className="flex flex-wrap gap-2">{docs.map(doc=><button key={doc.id} type="button"
      onClick={()=>onOpen(doc)} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-blue-800">
       <FolderLock className="h-4 w-4 shrink-0"/><span className="break-all">{doc.document_kind
        ?names[doc.document_kind]+(doc.signer_index!==null?' · Sócio '+(doc.signer_index+1):'')
        :doc.file_name}</span>
      </button>)}</div>
    </div>
   </div>
  </details>
  {missing.length>0&&<div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
   <FileCheck2 className="mr-1 inline h-4 w-4"/>Documentação pendente: {missing.join(', ')}. A solicitação não pode ser aprovada até que os comprovantes sejam enviados.
  </div>}
 </div>;
}
