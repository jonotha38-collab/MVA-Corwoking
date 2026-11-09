/** MVA fiscal onboarding: client validation, with the final document gate enforced by Postgres. */
export type ApplicantType='pf'|'pj';
export type Partner={name:string;rg:string;cpf:string;address:string;cep:string;activity:string};
export type PersonDetails={
 full_name:string;rg:string;cpf:string;address:string;cep:string;profession:string;marital_status:string;
 birth_date:string;phone:string;email:string;activity:string;
};
export type BusinessDetails={
 company_name:string;cnpj:string;activity:string;phone:string;email:string;
 accountant_name:string;accountant_phone:string;accountant_crc:string;
 has_amendments:boolean;signers:Partner[];
};
export type FiscalDocumentKind='partner_rg'|'partner_cpf'|'partner_address'|'social_contract'|'contract_amendments';
export type RequiredDocument={kind:FiscalDocumentKind;signerIndex:number|null;label:string};
export const MAX_FISCAL_FILE_BYTES=10*1024*1024;
const trimmed=(s:string)=>s.trim().length;
export const validCep=(s:string)=>/^\d{5}-?\d{3}$/.test(s.replace(/\s+/g,''));
export const validPhone=(s:string)=>s.replace(/\D/g,'').length>=10&&s.replace(/\D/g,'').length<=13;
export const validEmail=(s:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
export function validCpf(value:string):boolean{
 const digits=value.replace(/\D/g,'');
 if(digits.length!==11||/^(\d)\1{10}$/.test(digits))return false;
 const calc=(count:number)=>{
  const sum=Array.from({length:count},(_,i)=>Number(digits[i])*(count+1-i)).reduce((a,b)=>a+b,0);
  return ((sum*10)%11)%10;
 };
 return calc(9)===Number(digits[9])&&calc(10)===Number(digits[10]);
}
export function validatePerson(d:PersonDetails):string|null{
 if(trimmed(d.full_name)<3)return 'Informe o nome completo.';
 if(trimmed(d.rg)<4)return 'Informe o RG.';
 if(!validCpf(d.cpf))return 'Informe um CPF válido.';
 if(trimmed(d.address)<8||!validCep(d.cep))return 'Informe endereço completo e CEP válido.';
 if(trimmed(d.profession)<2||trimmed(d.marital_status)<3)return 'Informe profissão e estado civil.';
 const date=Date.parse(d.birth_date+'T12:00:00');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d.birth_date)||!Number.isFinite(date)||date>Date.now())return 'Informe uma data de nascimento válida.';
 if(!validPhone(d.phone)||!validEmail(d.email))return 'Confira o telefone e o e-mail.';
 if(trimmed(d.activity)<3)return 'Informe o ramo de atividade.';
 return null;
}
export function validateBusiness(d:BusinessDetails):string|null{
 if(trimmed(d.company_name)<3)return 'Informe a razão social.';
 if(trimmed(d.cnpj)<14||d.cnpj.toLowerCase()==='em abertura')return 'Informe o CNPJ da pessoa jurídica.';
 if(trimmed(d.activity)<3||!validPhone(d.phone)||!validEmail(d.email))return 'Confira atividade, telefone e e-mail.';
 if(trimmed(d.accountant_name)<3||!validPhone(d.accountant_phone)||trimmed(d.accountant_crc)<4)return 'Informe nome, telefone e CRC do contador responsável.';
 if(!Array.isArray(d.signers)||!d.signers.length||d.signers.length>20)return 'Informe os sócios que assinam pela empresa.';
 for(const [i,p] of d.signers.entries()){
  if(trimmed(p.name)<3||trimmed(p.rg)<4||!validCpf(p.cpf)||trimmed(p.address)<8||!validCep(p.cep)||trimmed(p.activity)<3)
   return 'Confira nome, RG, CPF, endereço com CEP e área de atuação do sócio '+(i+1)+'.';
 }
 return null;
}
export function requiredBusinessDocuments(d:BusinessDetails):RequiredDocument[]{
 const perPartner=d.signers.flatMap((_,i):RequiredDocument[]=>[
  {kind:'partner_rg',signerIndex:i,label:`RG do sócio ${i+1}`},
  {kind:'partner_cpf',signerIndex:i,label:`CPF do sócio ${i+1}`},
  {kind:'partner_address',signerIndex:i,label:`Comprovante de endereço do sócio ${i+1}`}
 ]);
 return [...perPartner,{kind:'social_contract',signerIndex:null,label:'Contrato social atualizado'},
 ...(d.has_amendments?[{kind:'contract_amendments' as const,signerIndex:null,label:'Alterações contratuais'}]:[])];
}
export function fiscalFileError(file:File):string|null{
 const ext=file.name.split('.').pop()?.toLowerCase()||'';
 const validExt=['pdf','png','jpg','jpeg'].includes(ext);
 const validMime=['application/pdf','image/png','image/jpeg'].includes(file.type);
 if(!validExt||!validMime)return 'Formato inválido. Envie PDF, PNG ou JPG.';
 if(file.size<=0||file.size>MAX_FISCAL_FILE_BYTES)return 'Cada arquivo deve ter até 10 MB e não pode estar vazio.';
 return null;
}
