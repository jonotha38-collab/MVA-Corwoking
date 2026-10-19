import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import { admin, body, endpoint, env, json, syncOrder, user, uuid } from '../_shared/payment-server.ts';
Deno.serve(endpoint(async req => {
  const account = await user(req);
  const input = await body(req);
  if (!uuid(input.contractId)) throw new Error('Esta declaração ainda não está disponível.');
  const db = admin();
  let { data: contract, error } = await db.from('fiscal_contracts').select('*').eq('id', input.contractId).eq('user_id', account.id).maybeSingle();
  if (error || !contract?.payment_order_id) throw new Error('Esta declaração ainda não está disponível.');
  const { data: order, error: orderError } = await db.from('fiscal_payment_orders').select('*').eq('id', contract.payment_order_id).eq('user_id', account.id).single();
  if (orderError || !order) throw new Error('Esta declaração ainda não está disponível.');
  const fresh = await syncOrder(order);
  if (fresh.order.status !== 'paid' || !fresh.order.livemode || fresh.order.contract_id !== contract.id) throw new Error('Esta declaração ainda não está disponível.');
  ({ data: contract, error } = await db.from('fiscal_contracts').select('*').eq('id', contract.id).single());
  const today = new Date().toISOString().slice(0, 10);
  if (error || !contract || contract.user_id !== account.id || contract.payment_status !== 'paid' || !contract.payment_is_live || contract.status !== 'ativo' || !['fiscal','fiscal_ie'].includes(contract.plan_id) || contract.renewal_date < today || contract.start_date > today || !contract.certificate_number) throw new Error('Esta declaração ainda não está disponível.');
  // Real issuer information is required. No fabricated registration or digital signature.
  const issuer = env('FISCAL_ISSUER_NAME');
  const issuerCnpj = env('FISCAL_ISSUER_CNPJ');
  const signatory = env('FISCAL_ISSUER_SIGNATORY');
  if (issuer.length > 180 || issuerCnpj.length > 30 || signatory.length > 120) throw new Error('Invalid issuer configuration');
  const dense = contract.company_name.length + contract.trading_name.length > 180;
  const pdf = await PDFDocument.create();
  pdf.setTitle('Declaração de domicílio fiscal'); pdf.setAuthor(issuer); pdf.setSubject(contract.certificate_number);
  const page = pdf.addPage([595.28,841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy=rgb(.04,.08,.14), ink=rgb(.09,.15,.24), muted=rgb(.37,.42,.49), orange=rgb(.72,.27,.07), line=rgb(.86,.89,.92);
  const clean = (value: unknown) => String(value ?? '').replace(/[\x00-\x1f\x7f]/g,' ').replace(/[^\x20-\xff]/g,'?');
  const text = (value: unknown,x: number,y: number,size=10,color=ink,strong=false) => page.drawText(clean(value),{x,y,size,font:strong?bold:font,color});
  const wrap = (value: unknown,y: number,size=10,color=ink,width=490,strong=false) => {
    const f=strong?bold:font; let current='';
    for(const word of clean(value).split(/\s+/)) {
      if (f.widthOfTextAtSize(current+(current?' ':'')+word,size)>width && current) { text(current,52,y,size,color,strong);y-=size*1.6;current=''; }
      if(f.widthOfTextAtSize(word,size)>width) { for(const char of word) { if(f.widthOfTextAtSize(current+char,size)>width) { text(current,52,y,size,color,strong);y-=size*1.6;current=''; } current+=char; } }
      else current+=(current?' ':'')+word;
    }
    if(current) {text(current,52,y,size,color,strong);y-=size*1.6;}return y;
  };
  page.drawRectangle({x:0,y:722,width:596,height:120,color:navy});
  text('MVA',52,784,29,rgb(1,1,1),true);text('COWORKING',135,787,11,rgb(.8,.85,.92));text('ESTRUTURA PARA CRESCER',135,770,8,rgb(.8,.85,.92));
  page.drawRectangle({x:52,y:744,width:40,height:3,color:orange});
  text('DECLARAÇÃO DE DOMICÍLIO FISCAL',52,681,19,ink,true);
  text('AUTORIZAÇÃO DE USO DE ENDEREÇO',52,658,10,orange,true);
  let y=wrap(`Registro: ${contract.certificate_number}`,628,8,muted);
  y=wrap(`${issuer} · CNPJ ${issuerCnpj}`,y-13,10,ink,490,true);
  y=wrap('Declara, para os devidos fins, que a empresa abaixo identificada possui contrato de prestação de serviços de domicílio fiscal vigente, com pagamento confirmado, e está autorizada a utilizar o endereço indicado durante a vigência contratual.',y-22,dense ? 10 : 11);
  y-=18;
  const rows=[['RAZÃO SOCIAL',contract.company_name],['NOME FANTASIA',contract.trading_name||contract.company_name],['CNPJ',contract.cnpj],['ENDEREÇO AUTORIZADO',contract.unit_address],['PLANO',contract.plan_name],['VIGÊNCIA',`${contract.start_date.split('-').reverse().join('/')} a ${contract.renewal_date.split('-').reverse().join('/')}`]];
  for(const [label,value] of rows) {
    text(label,52,y,8,muted,true);y=wrap(value,y-16,dense ? 9 : 10,ink,490,true);y-=dense ? 6 : 9;
  }
  page.drawLine({start:{x:52,y:y+1},end:{x:543,y:y+1},thickness:.7,color:line});
  y=wrap('Esta autorização refere-se ao uso do endereço conforme o plano contratado. Licenças, inscrições e alvarás permanecem sujeitos à análise dos órgãos competentes e às condições do contrato.',y-24,9,muted);
  y=wrap(`Emitido em Aracaju/SE, ${new Date().toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})}.`,y-17,10);
  y=wrap(signatory,y-23,11,ink,490,true);wrap(`Responsável pela emissão · ${issuer}`,y-4,9,muted);
  page.drawLine({start:{x:52,y:62},end:{x:543,y:62},thickness:.7,color:line});
  text('Documento gerado eletronicamente a partir do contrato e do pagamento verificados.',52,46,8,muted);
  text('MVA COWORKING',52,31,8,orange,true);text('1 / 1',520,31,8,muted);
  const bytes=await pdf.save();let raw='';for(const byte of bytes)raw+=String.fromCharCode(byte);
  return json(req,{pdf:btoa(raw),filename:`declaracao-fiscal-${contract.id}.pdf`});
}));
