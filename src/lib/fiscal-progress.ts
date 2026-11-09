/** Derived, factual milestones; payment alone never means an address was authorized. */
export type FiscalMilestone={title:string;description:string;state:'done'|'current'|'waiting'|'problem';date?:string|null};
export type FiscalProgressInput={
 status:'submitted'|'under_review'|'approved'|'rejected';created_at:string;reviewed_at:string|null;
};
export function fiscalSteps(app:FiscalProgressInput,paid:boolean,active:boolean):FiscalMilestone[]{
 const approved=app.status==='approved';
 const rejected=app.status==='rejected';
 return [
  {title:'Solicitação recebida',description:'Cadastro registrado com segurança pela MVA.',state:'done',date:app.created_at},
  {title:'Análise cadastral',description:rejected?'A equipe apontou pendências. Consulte o parecer abaixo.':approved?'Cadastro aprovado para contratação.':'Equipe verificando dados, atividade e documentos.',state:rejected?'problem':approved?'done':'current',date:app.reviewed_at},
  {title:'Pagamento',description:paid?'Pagamento real confirmado pelo Stripe.':rejected?'Etapa indisponível até uma nova aprovação.':approved?'Elegibilidade aprovada: você já pode pagar.':'Liberado somente após aprovação cadastral.',state:paid?'done':rejected?'waiting':approved?'current':'waiting'},
  {title:'Formalização',description:active?'Contrato formalizado e liberado.':paid?'A MVA está conferindo e assinando os documentos.':'Contrato e documentação serão validados após o pagamento.',state:active?'done':paid?'current':'waiting'},
  {title:'Endereço autorizado',description:active?'Serviço autorizado conforme as condições e a vigência do contrato.':'O uso do endereço só é permitido após formalização pela MVA.',state:active?'done':'waiting'}
 ];
}
