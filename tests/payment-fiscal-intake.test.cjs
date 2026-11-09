const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../src/lib/fiscal-intake.ts'),'utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText;
const loaded={exports:{}};new Function('module','exports',output)(loaded,loaded.exports);
const {validCpf,validCep,validatePerson,validateBusiness,requiredBusinessDocuments}=loaded.exports;

const pf={full_name:'Maria Aparecida Silva',rg:'987654321',cpf:'529.982.247-25',
 address:'Rua Exemplo 123, Centro, Aracaju SE',cep:'49010-000',
 profession:'Arquiteta',marital_status:'Solteiro(a)',birth_date:'1991-05-13',
 phone:'79999990000',email:'maria@example.com',activity:'Arquitetura'};
const partner={name:'Maria Aparecida Silva',rg:'987654321',cpf:'52998224725',
 address:'Rua Exemplo 123, Centro, Aracaju SE',cep:'49010-000',activity:'Administração'};
const pj={company_name:'Empresa de Exemplo Ltda',cnpj:'11222333000181',activity:'Consultoria',
 phone:'79999990000',email:'contato@example.com',
 accountant_name:'João Contador',accountant_phone:'79999991111',accountant_crc:'SE-123456/O-0',
 has_amendments:false,signers:[partner]};

test('CPF and CEP are validated before collecting fiscal identity documents',()=>{
 assert.equal(validCpf('529.982.247-25'),true);
 assert.equal(validCpf('111.111.111-11'),false);
 assert.equal(validCpf('529.982.247-26'),false);
 assert.equal(validCep('49010-000'),true);
 assert.equal(validCep('49010000'),true);
 assert.equal(validCep('1234'),false);
});
test('natural person must provide all requested fields',()=>{
 assert.equal(validatePerson(pf),null);
 assert.match(validatePerson({...pf,rg:''}),/RG/);
 assert.match(validatePerson({...pf,cpf:'invalid'}),/CPF/);
 assert.match(validatePerson({...pf,activity:''}),/atividade/);
});
test('legal entity needs accountant, all signatories, and contract documents',()=>{
 assert.equal(validateBusiness(pj),null);
 assert.match(validateBusiness({...pj,accountant_crc:''}),/contador/);
 assert.match(validateBusiness({...pj,signers:[]}),/sócios/);
 assert.match(validateBusiness({...pj,signers:[{...partner,cep:''}]}),/sócio/);
 let docs=requiredBusinessDocuments(pj);
 assert.deepEqual(docs.map(x=>x.kind),['partner_rg','partner_cpf','partner_address','social_contract']);
 assert.equal(requiredBusinessDocuments({...pj,has_amendments:true}).length,5);
 assert.equal(requiredBusinessDocuments({...pj,signers:[partner,partner]}).length,7);
});
test('database migration requires private evidence before admin approval',()=>{
 const migration=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261109110000_fiscal_person_pf_pj_intake.sql'),'utf8');
 assert.match(migration,/before update of status/);
 assert.match(migration,/new\.status='approved'/);
 for(const kind of ['partner_rg','partner_cpf','partner_address','social_contract','contract_amendments'])
  assert.ok(migration.includes("'"+kind+"'"),kind);
 assert.match(migration,/storage\.objects/);
});
