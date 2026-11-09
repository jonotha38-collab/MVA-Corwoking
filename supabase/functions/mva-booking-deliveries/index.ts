// Agenda administrativa e email transacional da MVA.
// Chamado exclusivamente pelo banco via pg_net / pg_cron. Nunca expor segredos ao navegador.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

type Job = {
  id: number; source: 'commercial' | 'intern'; action: 'created' | 'canceled';
  channel: 'calendar' | 'email'; reservation_id: string; attempts: number;
};
type BookingInfo = {
  id: string; source: 'commercial' | 'intern'; status: string;
  name: string; email: string; room: string; location: string;
  date: string; start: string; end: string; isAllDay: boolean;
};
const env = (key: string) => (Deno.env.get(key) || '').trim();
const ZONE = 'America/Maceio';
const PROJECT_URL = 'https://coworking-mva-du8c.vercel.app/';

function constantEqual(a: string, b: string) {
  if (a.length !== b.length || !a) return false;
  let diff = 0;
  for (let i=0; i<a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff===0;
}
const htmlEscape = (s: string) => s.replace(/[&<>"']/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c] || c));
const nextDate = (ymd: string) => {
  const d = new Date(ymd + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate()+1);
  return d.toISOString().slice(0,10);
};
function eventId(booking: BookingInfo) {
  // Google IDs só podem conter dígitos e a-v; UUID sem hífens atende à regra.
  return 'mva' + (booking.source==='intern' ? '1' : '0') + booking.id.replaceAll('-','').toLowerCase();
}
function eventData(booking: BookingInfo) {
  const base = {
    id: eventId(booking),
    summary: `MVA · ${booking.room} · ${booking.name}`.slice(0,200),
    location: booking.location,
    description: `Reserva ${booking.source==='intern'?'interna':'comercial'} MVA Coworking\nParticipante: ${booking.name}\nE-mail: ${booking.email}\nCódigo: ${booking.id}\nConsulte a recepção em ${PROJECT_URL}`,
    visibility: 'private',
    reminders: { useDefault: false, overrides: [{ method:'popup',minutes:30 }] },
  };
  if(booking.isAllDay) return {
    ...base,start: { date: booking.date },end: { date: nextDate(booking.date) }
  };
  return { ...base,
    start:{ dateTime: `${booking.date}T${booking.start.slice(0,5)}:00-03:00`,timeZone:ZONE },
    end:{ dateTime: `${booking.date}T${booking.end.slice(0,5)}:00-03:00`,timeZone:ZONE }
  };
}
function emailMarkup(booking: BookingInfo, canceled: boolean) {
  const row = (label: string, val:string) =>
    `<tr><td style="padding:12px;color:#64748b;font-size:13px;width:130px">${htmlEscape(label)}</td><td style="padding:12px;color:#10213b;font-size:14px;font-weight:600">${htmlEscape(val)}</td></tr>`;
  const humanDate=new Date(booking.date+'T12:00:00Z').toLocaleDateString('pt-BR',{
    weekday:'long',day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'
  });
  const schedule=booking.isAllDay ? 'Dia de trabalho' : `${booking.start.slice(0,5)} às ${booking.end.slice(0,5)} (Brasília)`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"></head><body style="margin:0;background:#f2f5f9;font-family:Arial,sans-serif;color:#10213b">
  <div style="max-width:600px;margin:30px auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
    <div style="background:#0a192f;color:#fff;padding:28px 32px">
      <div style="font-weight:bold;letter-spacing:2px;font-size:12px;color:#fbbf24">MVA COWORKING</div>
      <h1 style="font-size:25px;margin:12px 0 0;color:white">${canceled?'Agendamento cancelado':'Agendamento confirmado!'}</h1>
    </div>
    <div style="padding:30px 32px">
      <p style="font-size:15px;line-height:1.7">Olá, <strong>${htmlEscape(booking.name)}</strong>.</p>
      <p style="font-size:14px;color:#475569;line-height:1.7">${canceled?'Sua reserva foi cancelada. Confira abaixo os detalhes do agendamento cancelado.':'Sua reserva foi registrada com sucesso! Nossa equipe já poderá visualizar seu agendamento na agenda administrativa.'}</p>
      <table cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e2e8f0;border-radius:12px;margin:20px 0;overflow:hidden;border-collapse:separate;border-spacing:0">
       ${row('Sala / espaço',booking.room)}
       ${row('Data',humanDate)}
       ${row('Horário',schedule)}
       ${row('Local',booking.location)}
       ${row('Código',booking.id)}
      </table>
      <a href="${PROJECT_URL}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;border-radius:9px;padding:12px 22px;font-size:14px;font-weight:bold">Ver minhas reservas</a>
      <p style="font-size:12px;color:#64748b;line-height:1.6;margin-top:26px">Esta é uma mensagem automática referente a uma reserva realizada na MVA Coworking. O agendamento não constitui comprovante de pagamento.</p>
    </div>
    <div style="background:#f8fafc;padding:17px 32px;font-size:12px;color:#64748b">MVA Coworking · Confirmação automática de reservas</div>
  </div></body></html>`;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const reply=(code:number, body: Record<string,unknown>) =>
    new Response(JSON.stringify(body), {status:code,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  if(req.method!=='POST') return reply(405,{error:'Method not allowed'});
  const supabaseUrl=env('SUPABASE_URL');
  const serviceKey=env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');
  if(!supabaseUrl || !serviceKey) return reply(503,{error:'Server configuration unavailable'});
  const supabase=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:setting,error:settingError}=await supabase.from('booking_delivery_config')
    .select('webhook_secret').eq('id',1).single();
  if(settingError || !constantEqual(req.headers.get('x-mva-delivery-key')||'',setting?.webhook_secret||'')){
    return reply(401,{error:'Unauthorized'});
  }
  // Na falta das integrações, as entregas ficam pendentes, sem informar falso sucesso.
  const mailReady=Boolean(env('RESEND_API_KEY')&&env('BOOKING_EMAIL_FROM'));
  const calendarReady=Boolean(env('GOOGLE_CALENDAR_ID')&&env('GOOGLE_OAUTH_CLIENT_ID')
    &&env('GOOGLE_OAUTH_CLIENT_SECRET')&&env('GOOGLE_OAUTH_REFRESH_TOKEN'));
  const channels=[...(mailReady?['email']:[]),...(calendarReady?['calendar']:[])];
  if(!channels.length)return reply(200,{state:'awaiting_provider_configuration',email:false,calendar:false});
  const {data:jobs,error:claimError}=await supabase.rpc('claim_mva_delivery_jobs',{
    p_channels:channels,p_limit:12
  });
  if(claimError) return reply(500,{error:'Unable to claim jobs'});
  let processed=0,failed=0,skipped=0;
  let cachedGoogleToken='';
  async function token() {
    if(cachedGoogleToken) return cachedGoogleToken;
    const body=new URLSearchParams({client_id:env('GOOGLE_OAUTH_CLIENT_ID'),
      client_secret:env('GOOGLE_OAUTH_CLIENT_SECRET'),refresh_token:env('GOOGLE_OAUTH_REFRESH_TOKEN'),
      grant_type:'refresh_token'});
    const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body});
    if(!r.ok) throw new Error('Google OAuth token renewal failed ('+r.status+')');
    const j=await r.json() as {access_token?:string};
    if(!j.access_token) throw new Error('Google OAuth response missing token');
    cachedGoogleToken=j.access_token;
    return cachedGoogleToken;
  }
  async function getBooking(job: Job):Promise<BookingInfo|null> {
    const table=job.source==='intern'?'intern_room_reservations':'bookings';
    const {data:record,error:e}=await supabase.from(table).select('*').eq('id',job.reservation_id).maybeSingle();
    if(e)throw new Error('Booking lookup failed');
    if(!record)return null;
    const userId=String(record.user_id||'');
    const {data:u,error:ue}=await supabase.auth.admin.getUserById(userId);
    if(ue || !u.user)throw new Error('User lookup failed');
    const email=u.user.email||'';
    // Notificações apenas para endereços pertencentes à identidade autenticada.
    if(!email || !u.user.email_confirmed_at)throw new Error('Recipient has no verified email');
    if(job.source==='commercial')return {
      id:job.reservation_id,source:'commercial',status:String(record.status),
      name:String(record.responsible_name||u.user.user_metadata?.name||'Cliente'),
      email,room:String(record.space_name||'Sala reservada'),location:String(record.coworking_name||'MVA Coworking'),
      date:String(record.booking_date),start:String(record.start_time),end:String(record.end_time),isAllDay:false
    };
    const {data:room,error:re}=await supabase.from('intern_rooms').select('name').eq('id',record.room_id).maybeSingle();
    if(re)throw new Error('Internal room lookup failed');
    const {data:profile}=await supabase.from('profiles').select('name').eq('id',userId).maybeSingle();
    return {
      id:job.reservation_id,source:'intern',status:String(record.status),
      name:String(profile?.name||u.user.user_metadata?.name||'Colaborador'),
      email,room:String(room?.name||'Sala de trabalho'),location:'Salas de trabalho · MVA Coworking',
      date:String(record.reservation_date),start:'',end:'',isAllDay:true
    };
  }
  async function syncCalendar(job:Job,b:BookingInfo) {
    const accessToken=await token();
    const url='https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(env('GOOGLE_CALENDAR_ID'))+
      '/events/'+eventId(b);
    if(job.action==='canceled'){
      const response=await fetch(url,{method:'DELETE',headers:{Authorization:'Bearer '+accessToken}});
      if(response.status!==204 && response.status!==404)
        throw new Error('Google Calendar delete failed ('+response.status+')');
      return eventId(b);
    }
    const response=await fetch('https://www.googleapis.com/calendar/v3/calendars/'+
      encodeURIComponent(env('GOOGLE_CALENDAR_ID'))+'/events?sendUpdates=none',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessToken},
        body:JSON.stringify(eventData(b))
      });
    if(!response.ok && response.status!==409)
      throw new Error('Google Calendar create failed ('+response.status+')');
    return eventId(b);
  }
  async function sendMail(job:Job,b:BookingInfo) {
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',headers:{Authorization:'Bearer '+env('RESEND_API_KEY'),
        'Content-Type':'application/json','Idempotency-Key':`mva-${job.source}-${job.reservation_id}-${job.action}`},
      body:JSON.stringify({
        from:env('BOOKING_EMAIL_FROM'),to:[b.email],
        subject:job.action==='created'
          ? `Reserva confirmada · ${b.room} · MVA Coworking`
          : `Reserva cancelada · ${b.room} · MVA Coworking`,
        html:emailMarkup(b,job.action==='canceled')
      })
    });
    if(!response.ok)throw new Error('Email provider failed ('+response.status+')');
    const result=await response.json() as {id?:string};
    return result.id||null;
  }
  for(const raw of jobs||[]){
    const job=raw as Job;
    try {
      const booking=await getBooking(job);
      if(!booking || (job.action==='created' && booking.status==='cancelada')){
        const {error}=await supabase.from('booking_delivery_jobs').update({
          status:'skipped',locked_at:null,delivered_at:new Date().toISOString(),last_error:null,
        }).eq('id',job.id);
        if(error)throw error;
        skipped++;
        continue;
      }
      const externalId=job.channel==='calendar'
        ? await syncCalendar(job,booking) : await sendMail(job,booking);
      const {error}=await supabase.from('booking_delivery_jobs').update({
        status:'sent',external_id:externalId,locked_at:null,delivered_at:new Date().toISOString(),last_error:null
      }).eq('id',job.id);
      if(error)throw error;
      processed++;
    } catch(error) {
      failed++;
      const delay=Math.min(120,Math.pow(2,Math.min(job.attempts,7)));
      // Nunca registrar conteúdo privado/tokens no banco ou logs.
      const description=error instanceof Error ? error.message.slice(0,130) : 'Delivery failed';
      await supabase.from('booking_delivery_jobs').update({
        status:job.attempts>=8?'failed':'pending',locked_at:null,
        next_attempt_at:new Date(Date.now()+delay*60_000).toISOString(),
        last_error:description
      }).eq('id',job.id);
    }
  }
  return reply(200,{state:'processed',processed,skipped,failed,email:mailReady,calendar:calendarReady});
});
