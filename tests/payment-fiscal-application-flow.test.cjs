const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname,'../src/lib/fiscal-application-flow.ts'),'utf8');
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText;
const mod = {exports:{}};
new Function('module','exports',compiled)(mod,mod.exports);
const { matchesFiscalApplication, fiscalApplicationQueue } = mod.exports;

test('approved monthly application always opens its own 1-month checkout',()=>{
 const monthly={id:'approved-monthly',plan_id:'comercial',term_months:1,transfer_from:''};
 assert.equal(matchesFiscalApplication(monthly,{planId:'comercial',termMonths:1,transfer:false,applicationId:monthly.id}),true);
 assert.equal(matchesFiscalApplication(monthly,{planId:'comercial',termMonths:12,transfer:false,applicationId:monthly.id}),false);
 assert.equal(matchesFiscalApplication(monthly,{planId:'comercial',termMonths:1,transfer:false,applicationId:'different-request'}),false);
 assert.equal(matchesFiscalApplication(monthly,{planId:'fiscal',termMonths:1,transfer:false,applicationId:monthly.id}),false);
});
test('annual transfer discount may not be applied to an approved full-price application',()=>{
 const annual={id:'annual',plan_id:'fiscal',term_months:12,transfer_from:''};
 const transfer={...annual,id:'transfer',transfer_from:'Endereço anterior'};
 assert.equal(matchesFiscalApplication(annual,{planId:'fiscal',termMonths:12,transfer:false}),true);
 assert.equal(matchesFiscalApplication(annual,{planId:'fiscal',termMonths:12,transfer:true}),false);
 assert.equal(matchesFiscalApplication(transfer,{planId:'fiscal',termMonths:12,transfer:true}),true);
 assert.equal(matchesFiscalApplication(transfer,{planId:'fiscal',termMonths:12,transfer:false}),false);
});
test('admin fiscal queues use payment evidence and keep rejected applications separate',()=>{
 assert.equal(fiscalApplicationQueue('submitted',false),'pending');
 assert.equal(fiscalApplicationQueue('under_review',false),'pending');
 assert.equal(fiscalApplicationQueue('approved',false),'approved');
 assert.equal(fiscalApplicationQueue('rejected',false),'rejected');
 assert.equal(fiscalApplicationQueue('approved',true),'paid');
 assert.equal(fiscalApplicationQueue('rejected',true),'paid');
});
