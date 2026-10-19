import type { FiscalContract } from '../types';
/** Presentation gate; server verification remains mandatory on every document request. */
export function canIssueCertificate(company: FiscalContract, now = new Date()): boolean {
  const day = now.toISOString().slice(0, 10);
  return !!company.id && company.paymentStatus === 'paid' && company.paymentIsLive === true && company.status === 'ativo' && !!company.paymentOrderId && ['fiscal', 'fiscal_ie'].includes(company.planId || '') && company.startDate <= day && company.renewalDate >= day;
}
