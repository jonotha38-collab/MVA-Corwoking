const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const load = file => { const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText; const m={exports:{}};new Function('module','exports',compiled)(m,m.exports);return m.exports; };
const { getPlan, getTermMonths, quotePlan, validCnpj, validateCompany } = load('supabase/functions/_shared/fiscal-plans.ts');
const { canIssueCertificate } = load('src/lib/fiscal-eligibility.ts');

test('monthly and annual quotes: only annual transfers receive four free months',()=>{
 assert.equal(quotePlan(getPlan('comercial'),12,false).amount,35880);
 assert.equal(quotePlan(getPlan('fiscal'),12,false).amount,96000);
 assert.equal(quotePlan(getPlan('fiscal_ie'),12,false).amount,144000);
 assert.equal(quotePlan(getPlan('fiscal'),12,true).amount,64000);
 assert.equal(quotePlan(getPlan('fiscal_ie'),12,true).amount,96000);
 for(const [id,monthly] of [['comercial',2990],['fiscal',8000],['fiscal_ie',12000]]) {
  for(const transfer of [false,true]) { const q=quotePlan(getPlan(id),1,transfer); assert.equal(q.amount,monthly); assert.equal(q.discount,0); }
  assert.equal(quotePlan(getPlan(id),12,true).amount,monthly*8);
  assert.equal(quotePlan(getPlan(id),12,false).amount,monthly*12);
 }
 assert.equal(getTermMonths(undefined),12);
 for(const bad of [0,2,6,24,'1','12',null,false]) assert.throws(()=>getTermMonths(bad));
 for(const id of ['__proto__','constructor','multi','free',null])assert.throws(()=>getPlan(id));
});
test('accepts numeric/alphanumeric CNPJ with correct check digits; rejects malformed IDs',()=>{
 for(const cnpj of ['11.222.333/0001-81','12.ABC.345/01DE-35','00.000.000/E08G-12','Em abertura'])assert.equal(validCnpj(cnpj),true,cnpj);
 for(const cnpj of ['00.000.000/0000-00','11.222.333/0001-82','12.ABC.345/01DE-36','invalid','11.222.333/0001-81!!'])assert.equal(validCnpj(cnpj),false,cnpj);
 const company={companyName:'Empresa de teste',tradingName:'',cnpj:'11.222.333/0001-81',contactEmail:'test@example.com',contactPhone:'79999999999'};
 assert.equal(validateCompany(company).companyName,'Empresa de teste');
 assert.throws(()=>validateCompany({...company,contactEmail:'invalid'}));
 assert.throws(()=>validateCompany({...company,companyName:'x'.repeat(181)}));
});
test('official certificate requires live settled ownership data, fiscal plan and current term',()=>{
 const now=new Date('2026-10-19T12:00:00Z');
 const c={id:'contract',paymentStatus:'paid',paymentIsLive:true,status:'ativo',paymentOrderId:'order',planId:'fiscal',startDate:'2026-10-19',renewalDate:'2027-10-19'};
 assert.equal(canIssueCertificate(c,now),true);
 for(const patch of [{paymentStatus:'unpaid'},{paymentStatus:'refunded'},{paymentStatus:'disputed'},{paymentIsLive:false},{paymentOrderId:undefined},{status:'pendente_documento'},{planId:'comercial'},{planId:undefined},{renewalDate:'2026-10-18'},{startDate:'2026-10-20'},{id:''}])assert.equal(canIssueCertificate({...c,...patch},now),false,JSON.stringify(patch));
});
