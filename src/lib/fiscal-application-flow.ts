/** Pure workflow rules shared by fiscal checkout and the administrative queues. */
export type FiscalTerm=1|12;
export type FiscalQueue='pending'|'approved'|'paid'|'rejected';
export type FiscalApplicationKey={
 id:string;
 plan_id:string;
 term_months:number;
 transfer_from:string|null;
};
export type FiscalCheckoutSelection={
 planId:string;
 termMonths:FiscalTerm;
 transfer:boolean;
 applicationId?:string;
};

/** A 1-month approval must never silently reopen a 12-month Stripe checkout. */
export function matchesFiscalApplication(application:FiscalApplicationKey,choice:FiscalCheckoutSelection):boolean{
 if(choice.applicationId&&application.id!==choice.applicationId)return false;
 if(application.plan_id!==choice.planId||application.term_months!==choice.termMonths)return false;
 const hasTransfer=application.term_months===12&&(application.transfer_from?.trim().length??0)>=3;
 return hasTransfer===(choice.termMonths===12&&choice.transfer);
}

/** A paid order belongs in the finance queue; payment itself never authorizes the address. */
export function fiscalApplicationQueue(status:string,paidLive:boolean):FiscalQueue{
 if(paidLive)return 'paid';
 if(status==='rejected')return 'rejected';
 if(status==='approved')return 'approved';
 return 'pending';
}
