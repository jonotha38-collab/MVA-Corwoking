const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../src/lib/booking-slot-rules.ts'),'utf8');
const transpiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023}}).outputText;
const mod={exports:{}};new Function('module','exports',transpiled)(mod,mod.exports);
const {contiguousEndOptions}=mod.exports;
const slot=(start,end,available,reason=available?'livre':'ocupado')=>({booking_date:'2026-11-10',start_time:start+':00',end_time:end+':00',available,reason});
test('a booked hour cannot be selected and blocks longer consecutive reservations',()=>{
 const slots=[slot('08:00','09:00',true),slot('09:00','10:00',false),slot('10:00','11:00',true),slot('11:00','12:00',true)];
 assert.deepEqual(contiguousEndOptions(slots,'08:00'),['09:00']);
 assert.deepEqual(contiguousEndOptions(slots,'09:00'),[]);
 assert.deepEqual(contiguousEndOptions(slots,'10:00'),['11:00','12:00']);
});
test('a missing interval breaks contiguous durations',()=>{
 const slots=[slot('08:00','09:00',true),slot('10:00','11:00',true)];
 assert.deepEqual(contiguousEndOptions(slots,'08:00'),['09:00']);
});
test('the slot matrix may not leak personal details',()=>{
 const sql=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261109130000_room_availability_public_matrix.sql'),'utf8');
 assert.match(sql,/mva_room_availability/);
 assert.match(sql,/b\.status='confirmada'/);
 assert.match(sql,/s\.approval='aprovado'/);
 assert.match(sql,/grant execute/);
 assert.ok(!/return next.*user_id/.test(sql));
});
