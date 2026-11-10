/** Shared, canonical catalog. Prices are integer BRL cents; only the server authorizes charges. */
export const FISCAL_PLANS = {
  // Historic products are still recognized for previously approved applications.
  comercial: { id:'comercial',name:'Endereço Comercial',monthlyCents:2990,fiscal:false,meetingHours:0,roomDiscountPercent:0,accountantConsultations:0,annualDiscountPercent:0 },
  fiscal: { id:'fiscal',name:'Endereço Fiscal',monthlyCents:8000,fiscal:true,meetingHours:0,roomDiscountPercent:0,accountantConsultations:0,annualDiscountPercent:0 },
  fiscal_ie: { id:'fiscal_ie',name:'Endereço Fiscal com Inscrição Estadual',monthlyCents:12000,fiscal:true,meetingHours:2,roomDiscountPercent:0,accountantConsultations:0,annualDiscountPercent:0 },

  // New MVA-branded fiscal-address plans (amounts are mirrored from DB catalog).
  mva_essencial: { id:'mva_essencial',name:'MVA Essencial',monthlyCents:8500,fiscal:true,meetingHours:0,roomDiscountPercent:0,accountantConsultations:0,annualDiscountPercent:10 },
  mva_profissional: { id:'mva_profissional',name:'MVA Profissional',monthlyCents:9500,fiscal:true,meetingHours:0,roomDiscountPercent:5,accountantConsultations:0,annualDiscountPercent:10 },
  mva_excellence: { id:'mva_excellence',name:'MVA Excellence',monthlyCents:11000,fiscal:true,meetingHours:2,roomDiscountPercent:10,accountantConsultations:1,annualDiscountPercent:10 },
} as const;
export type FiscalPlanId = keyof typeof FISCAL_PLANS;
export type FiscalPlan = typeof FISCAL_PLANS[FiscalPlanId];
export const HEADQUARTERS = 'Rua Dom José Thomaz, 565 - São José, Aracaju - SE, CEP 49015-090';
export function getPlan(id: unknown): FiscalPlan {
  if (typeof id !== 'string' || !Object.hasOwn(FISCAL_PLANS, id)) throw new Error('Plano inválido.');
  return FISCAL_PLANS[id as FiscalPlanId];
}
export type FiscalTermMonths = 1 | 12;
export function getTermMonths(value: unknown = 12): FiscalTermMonths {
  if (value !== 1 && value !== 12) throw new Error('Escolha um período de 1 ou 12 meses.');
  return value;
}
export function quotePlan(plan: FiscalPlan, termMonths: FiscalTermMonths, transfer: boolean) {
  const months = getTermMonths(termMonths);
  const freeMonths = months === 12 && transfer ? 4 : 0;
  const fullAmount = plan.monthlyCents * months;
  // The four-free-month transfer campaign replaces (not stacks with) the
  // standard annual discount, exactly as enforced by Stripe on the server.
  const amount = months === 12
    ? (freeMonths > 0 ? plan.monthlyCents * (months-freeMonths)
      : Math.round(fullAmount * (100-plan.annualDiscountPercent)/100))
    : fullAmount;
  return { amount, fullAmount, discount:fullAmount-amount,
    termMonths:months,freeMonths,currency:'brl' as const };
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
