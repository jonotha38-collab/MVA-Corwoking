const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/lib/fiscal-progress.ts'),'utf8');
const transpiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText;
const mod={exports:{}};new Function('module','exports',transpiled)(mod,mod.exports);
const {fiscalSteps}=mod.exports;
const req=(status)=>({status,created_at:'2026-11-09T12:00:00Z',reviewed_at:null});
test('submitted applications are still in review and never shown as paid',()=>{
 const s=fiscalSteps(req('submitted'),false,false);
 assert.equal(s[1].state,'current');assert.equal(s[2].state,'waiting');assert.equal(s[4].state,'waiting');
});
test('rejection carries an explicit problem and blocks the payment stage',()=>{
 const s=fiscalSteps(req('rejected'),false,false);
 assert.equal(s[1].state,'problem');assert.equal(s[2].state,'waiting');
});
test('approval alone does not imply payment nor authorization',()=>{
 const s=fiscalSteps(req('approved'),false,false);
 assert.equal(s[1].state,'done');assert.equal(s[2].state,'current');assert.equal(s[4].state,'waiting');
});
test('paid applications await human formalization before authorization',()=>{
 const s=fiscalSteps(req('approved'),true,false);
 assert.equal(s[2].state,'done');assert.equal(s[3].state,'current');assert.equal(s[4].state,'waiting');
});
test('active contracts complete the full timeline',()=>{
 const s=fiscalSteps(req('approved'),true,true);
 assert.equal(s.every(x=>x.state==='done'),true);
});

test('expired contract must never be presented as an active authorized address',()=>{
 const s=fiscalSteps(req('approved'),true,false,true);
 assert.equal(s[3].state,'done');assert.equal(s[4].state,'problem');
 assert.match(s[4].description,/vigência/);
});
