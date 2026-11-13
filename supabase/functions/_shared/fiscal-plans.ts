/** Shared, canonical catalog. Prices are integer BRL cents; only the server authorizes charges. */
/** Shared canonical catalog; Stripe always uses the server-owned database values. */
export const FISCAL_PLANS = {
  // Legacy plans remain readable/payable only for applications submitted before this relaunch.
  comercial: { id:'comercial',name:'Endereço Comercial (plano anterior)',monthlyCents:2990,fiscal:false,meetingHours:0,annualDiscountPercent:0,roomDiscountPercent:0,bonusHours:0,bonusMonths:0 },
  fiscal: { id:'fiscal',name:'Endereço Fiscal (plano anterior)',monthlyCents:8000,fiscal:true,meetingHours:0,annualDiscountPercent:0,roomDiscountPercent:0,bonusHours:0,bonusMonths:0 },
  fiscal_ie: { id:'fiscal_ie',name:'Endereço Fiscal com Inscrição Estadual (plano anterior)',monthlyCents:12000,fiscal:true,meetingHours:2,annualDiscountPercent:0,roomDiscountPercent:0,bonusHours:0,bonusMonths:0 },
  mva_essencial: { id:'mva_essencial',name:'MVA Essencial',monthlyCents:8990,fiscal:true,meetingHours:0,annualDiscountPercent:10,roomDiscountPercent:0,bonusHours:0,bonusMonths:0 },
  mva_profissional: { id:'mva_profissional',name:'MVA Profissional',monthlyCents:9990,fiscal:true,meetingHours:0,annualDiscountPercent:10,roomDiscountPercent:5,bonusHours:0,bonusMonths:0 },
  mva_excellence: { id:'mva_excellence',name:'MVA Excellence',monthlyCents:10990,fiscal:true,meetingHours:2,annualDiscountPercent:10,roomDiscountPercent:10,bonusHours:2,bonusMonths:3 },
} as const;
export const NEW_FISCAL_PLAN_IDS = ['mva_essencial','mva_profissional','mva_excellence'] as const;
export type FiscalPlanId=keyof typeof FISCAL_PLANS;
export type FiscalPlan=typeof FISCAL_PLANS[FiscalPlanId];
export const HEADQUARTERS='Rua Dom José Thomaz, 565 - São José, Aracaju - SE, CEP 49015-090';
export function getPlan(id:unknown):FiscalPlan{
  if(typeof id!=='string'||!Object.hasOwn(FISCAL_PLANS,id))throw new Error('Plano inválido.');
  return FISCAL_PLANS[id as FiscalPlanId];
}
export type FiscalTermMonths=1|12;
export function getTermMonths(value:unknown=12):FiscalTermMonths{
  if(value!==1&&value!==12)throw new Error('Escolha um período de 1 ou 12 meses.');
  return value;
}
export function quotePlan(plan:FiscalPlan,termMonths:FiscalTermMonths,transfer:boolean){
  const months=getTermMonths(termMonths);
  const fullAmount=plan.monthlyCents*months;
  // The legacy 4-month transfer campaign replaces, rather than stacks with,
  // the standard 10% annual discount. Ordinary annual purchases get 10% off.
  const freeMonths=months===12&&transfer?4:0;
  const discount=freeMonths>0?plan.monthlyCents*freeMonths:
    months===12?Math.round(fullAmount*plan.annualDiscountPercent/100):0;
  return {amount:fullAmount-discount,fullAmount,discount,termMonths:months,
    freeMonths,annualDiscountPercent:months===12&&!transfer?plan.annualDiscountPercent:0,currency:'brl' as const};
}
export interface FiscalCompanyInput { companyName: string; tradingName: string; cnpj: string; contactEmail: string; contactPhone: string; }
export function validCnpj(value: string): boolean {
  if (value.trim().toLowerCase() === 'em abertura') return true;
  const digits = value.toUpperCase().replace(/[.\/\-\s]/g, '');
  if (!/^[A-Z0-9]{12}\d{2}$/.test(digits) || /^(\d)\1+$/.test(digits)) return false;
  const check = (length: number) => { let sum = 0; let weight = length - 7; for (let i = 0; i < length; i++) { sum += (digits.charCodeAt(i) - 48) * weight--; if (weight < 2) weight = 9; } const mod = sum % 11; return mod < 2 ? 0 : 11 - mod; };
  return check(12) === Number(digits[12]) && check(13) === Number(digits[13]);
}
export function validateCompany(value: unknown): FiscalCompanyInput {
  if (!value || typeof value !== 'object') throw new Error('Informe os dados da empresa.');
  const data = value as Record<string, unknown>;
  const field = (key: string, max: number) => { const v = data[key]; if (typeof v !== 'string' || v.trim().length > max) throw new Error('Confira os dados da empresa.'); return v.trim(); };
  const company = { companyName: field('companyName', 180), tradingName: field('tradingName', 180), cnpj: field('cnpj', 30), contactEmail: field('contactEmail', 254), contactPhone: field('contactPhone', 30) };
  if (company.companyName.length < 3 || !validCnpj(company.cnpj) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.contactEmail) || (company.contactPhone.replace(/\D/g, '').length < 10 || company.contactPhone.replace(/\D/g, '').length > 15)) throw new Error('Confira a razão social, o CNPJ, o e-mail e o telefone.');
  return company;
}
