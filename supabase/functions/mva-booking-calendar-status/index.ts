// Status / permission diagnostics for the MVA administrative calendar.
// No Google secrets or refresh tokens are returned to the frontend.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

const env=(name:string)=>(Deno.env.get(name)||'').trim();
const allowedOrigins=['https://mvacoworking.com.br','https://www.mvacoworking.com.br'];
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('origin')||'';
  const corsOrigin=allowedOrigins.includes(origin)?origin:allowedOrigins[0];
  const headers:Record<string,string>={
    'Content-Type':'application/json','Cache-Control':'no-store',
    'Access-Control-Allow-Origin':corsOrigin,
    'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
    'Access-Control-Allow-Methods':'POST,OPTIONS',
    Vary:'Origin'
  };
  const reply=(status:number,body:Record<string,unknown>)=>
    new Response(JSON.stringify(body),{status,headers});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
  const url=env('SUPABASE_URL');
  const secret=env('SUPABASE_SERVICE_ROLE_KEY')||env('SUPABASE_SECRET_KEY');
  const anon=env('SUPABASE_ANON_KEY')||env('SUPABASE_PUBLISHABLE_KEY');
  if(!url||!secret||!anon)return reply(503,{error:'Server configuration unavailable'});
  const authHeader=req.headers.get('authorization')||'';
  const token=authHeader.match(/^Bearer (.+)$/i)?.[1]||'';
  if(!token)return reply(401,{error:'Authentication required'});
  const service=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:identity,error:userError}=await service.auth.getUser(token);
  if(userError||!identity.user)return reply(401,{error:'Invalid session'});
  const scoped=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},
    global:{headers:{Authorization:'Bearer '+token}}});
  const {data:isAdmin,error:adminError}=await scoped.rpc('is_admin');
  if(adminError||isAdmin!==true)return reply(403,{error:'Admin permission required'});
  let body:{action?:string}={};
  try{body=await req.json()}catch{return reply(400,{error:'Invalid JSON'})}
  if(!['status','verify'].includes(body.action||''))return reply(400,{error:'Unknown action'});

  const {data:config,error:cfgError}=await service.from('booking_delivery_config')
    .select('enabled,calendar_enabled,email_enabled').eq('id',1).single();
  if(cfgError||!config)return reply(503,{error:'Calendar configuration unavailable'});
  const credentialsConfigured=Boolean(env('GOOGLE_CALENDAR_ID')&&env('GOOGLE_OAUTH_CLIENT_ID')
    &&env('GOOGLE_OAUTH_CLIENT_SECRET')&&env('GOOGLE_OAUTH_REFRESH_TOKEN'));
  const count=async(states:string[])=>{
    const {count,error}=await service.from('booking_delivery_jobs')
      .select('id',{count:'exact',head:true}).eq('channel','calendar').in('status',states);
    if(error)throw error;
    return count??0;
  };
  try{
    const [pending,sent,failed]=await Promise.all([
      count(['pending','processing']),count(['sent']),count(['failed'])
    ]);
    const status={
      enabled:config.enabled===true&&config.calendar_enabled===true,
      emailEnabled:config.email_enabled===true,
      credentialsConfigured,
      pending,sent,failed,
      domain:'https://mvacoworking.com.br',
    };
    if(body.action==='status')return reply(200,status);
    if(!credentialsConfigured)return reply(200,{...status,verified:false,reason:'Credenciais Google ainda não configuradas no Supabase.'});
    const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',
      body:new URLSearchParams({client_id:env('GOOGLE_OAUTH_CLIENT_ID'),
        client_secret:env('GOOGLE_OAUTH_CLIENT_SECRET'),
        refresh_token:env('GOOGLE_OAUTH_REFRESH_TOKEN'),grant_type:'refresh_token'})});
    if(!tokenResponse.ok)return reply(200,{...status,verified:false,
      reason:'A autorização Google não pôde ser renovada (HTTP '+tokenResponse.status+'). Reconecte a conta.'});
    const tokenBody=await tokenResponse.json() as {access_token?:string};
    if(!tokenBody.access_token)return reply(200,{...status,verified:false,reason:'O Google não retornou acesso válido.'});
    const verifyResponse=await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList/'
      +encodeURIComponent(env('GOOGLE_CALENDAR_ID')),{headers:{Authorization:'Bearer '+tokenBody.access_token}});
    if(!verifyResponse.ok)return reply(200,{...status,verified:false,
      reason:'Não foi possível acessar a agenda indicada (HTTP '+verifyResponse.status+').'});
    const googleCalendar=await verifyResponse.json() as {accessRole?:string,summary?:string};
    if(!['owner','writer'].includes(googleCalendar.accessRole||''))
      return reply(200,{...status,verified:false,reason:'A conta conectada não tem permissão para criar eventos na agenda.'});
    return reply(200,{...status,verified:true,calendarName:googleCalendar.summary||'Google Agenda'});
  }catch{
    return reply(500,{error:'Falha ao consultar o status do Google Agenda.'});
  }
});
