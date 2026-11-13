const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/_shared/fiscal-plans.ts'),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText;
const mod={exports:{}};new Function('module','exports',compiled)(mod,mod.exports);
const {FISCAL_PLANS,quotePlan,NEW_FISCAL_PLAN_IDS}=mod.exports;
test('new MVA prices are explicitly fixed in BRL cents',()=>{
 assert.deepEqual([...NEW_FISCAL_PLAN_IDS],['mva_essencial','mva_profissional','mva_excellence']);
 assert.equal(FISCAL_PLANS.mva_essencial.monthlyCents,8990);
 assert.equal(FISCAL_PLANS.mva_profissional.monthlyCents,9990);
 assert.equal(FISCAL_PLANS.mva_excellence.monthlyCents,10990);
});
test('annual quote has 10 percent discount and charges once for twelve months',()=>{
 assert.equal(quotePlan(FISCAL_PLANS.mva_essencial,12,false).amount,97092);
 assert.equal(quotePlan(FISCAL_PLANS.mva_profissional,12,false).amount,107892);
 assert.equal(quotePlan(FISCAL_PLANS.mva_excellence,12,false).amount,118692);
 assert.equal(quotePlan(FISCAL_PLANS.mva_excellence,1,false).amount,10990);
});
test('transfer promotion is not added on top of annual percentage discount',()=>{
 const q=quotePlan(FISCAL_PLANS.mva_excellence,12,true);
 assert.equal(q.amount,87920);
 assert.equal(q.freeMonths,4);
 assert.equal(q.annualDiscountPercent,0);
});
test('benefits for rooms are tiered and Excellence bonuses never roll over',()=>{
 assert.deepEqual(NEW_FISCAL_PLAN_IDS.map(p=>FISCAL_PLANS[p].roomDiscountPercent),[0,5,10]);
 assert.equal(FISCAL_PLANS.mva_excellence.bonusHours,2);
 assert.equal(FISCAL_PLANS.mva_excellence.bonusMonths,3);
});
test('historical plans retain their prices and legacy annual terms',()=>{
 assert.equal(quotePlan(FISCAL_PLANS.comercial,1,false).amount,2990);
 assert.equal(quotePlan(FISCAL_PLANS.fiscal,12,false).amount,96000);
 assert.equal(quotePlan(FISCAL_PLANS.fiscal_ie,12,true).amount,96000);
});
