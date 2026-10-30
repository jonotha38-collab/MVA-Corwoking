import { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function FiscalVerificationView({ code }: {code:string}){
 const [status,setStatus]=useState<'checking'|'valid'|'not_verified'>('checking');
 useEffect(()=>{
   if(!/^[0-9a-f-]{36}$/i.test(code)){setStatus('not_verified');return}
   let active=true;
   void supabase.rpc('verify_fiscal_document',{p_code:code}).then(({data,error})=>{
     if(!active)return;
     const value=Array.isArray(data)?data[0]:null;
     setStatus(!error&&value?.authentic===true?'valid':'not_verified');
   });
   return()=>{active=false};
 },[code]);
 return <main id="conteudo" className="mx-auto grid min-h-[65vh] w-full max-w-xl place-content-center gap-5 px-5 py-12">
  <div className="text-center"><ShieldCheck className="mx-auto h-10 w-10 text-orange-600"/><h1 className="mt-4 text-2xl font-bold text-navy-900">Verificação de documento MVA</h1><p className="mt-2 text-sm text-slate-600">Confira a validade de uma declaração registrada pela administração.</p></div>
  <div role="status" aria-live="polite" className={`rounded-2xl border p-6 text-center ${status==='valid'?'border-emerald-200 bg-emerald-50':status==='not_verified'?'border-amber-200 bg-amber-50':'border-slate-200 bg-white'}`}>
   {status==='checking'?<p className="text-sm text-slate-600">Consultando autenticidade…</p>:status==='valid'?<>
    <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-700"/><h2 className="font-bold text-emerald-900">Documento autêntico e vigente</h2>
    <p className="mt-2 text-xs text-emerald-800">Declaração verificada pela MVA, vinculada a contrato ativo e pagamento registrado.</p>
   </>:<>
    <XCircle className="mx-auto mb-2 h-8 w-8 text-amber-700"/><h2 className="font-bold text-amber-900">Não foi possível confirmar a validade</h2>
    <p className="mt-2 text-xs text-amber-800">O código pode não existir, estar pendente de validação ou ter sua vigência encerrada. Consulte a administração.</p>
   </>}
  </div>
  <p className="text-center text-xs text-slate-500">Por privacidade, esta verificação não mostra CNPJ, nome da empresa, dados pessoais ou o conteúdo do arquivo.</p>
  <a className="mx-auto rounded-xl bg-navy-900 px-5 py-3 text-sm font-bold text-white" href="/">Voltar ao MVA Coworking</a>
 </main>;
}