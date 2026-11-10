import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { t } from '../../lib/preferences';

type CalendarReport = {
  enabled:boolean;
  emailEnabled:boolean;
  credentialsConfigured:boolean;
  pending:number;
  sent:number;
  failed:number;
  domain:string;
  verified?:boolean;
  calendarName?:string;
  reason?:string;
};

export function AdminGoogleCalendarPanel() {
  const [report,setReport]=useState<CalendarReport|null>(null);
  const [loading,setLoading]=useState(true);
  const [checking,setChecking]=useState(false);
  const [error,setError]=useState('');
  const refresh=useCallback(async(verify=false)=>{
    if(verify)setChecking(true);else setLoading(true);
    setError('');
    try {
      const {data,error:invokeError}=await supabase.functions.invoke('mva-booking-calendar-status',{
        body:{action:verify?'verify':'status'}
      });
      if(invokeError||!data||typeof data.enabled!=='boolean')
        throw new Error('Não foi possível consultar o serviço de agenda.');
      setReport(prev=>({
        ...(data as CalendarReport),
        verified:verify?(data as CalendarReport).verified:prev?.verified,
        calendarName:verify?(data as CalendarReport).calendarName:prev?.calendarName,
        reason:verify?(data as CalendarReport).reason:prev?.reason,
      }));
    }catch(e){
      setError(e instanceof Error?e.message:'Falha ao consultar o Google Agenda.');
    }finally{
      setLoading(false);
      setChecking(false);
    }
  },[]);
  useEffect(()=>{
    void refresh();
    const handler=()=>{if(document.visibilityState==='visible')void refresh()};
    const interval=window.setInterval(handler,30_000);
    document.addEventListener('visibilitychange',handler);
    return ()=>{window.clearInterval(interval);document.removeEventListener('visibilitychange',handler)};
  },[refresh]);

  return <section className="space-y-5" aria-label={t('Integração Google Agenda')}>
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-700">
            <CalendarDays className="h-4 w-4" aria-hidden="true"/>{t('Integração Google Agenda')}
          </span>
          <h2 className="mt-2 text-2xl font-bold text-navy-950">{t('Reservas da MVA na agenda do Google')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {t('As novas reservas de clientes e salas internas são encaminhadas a cada minuto para a agenda administrativa da MVA. Cancelamentos removem o evento correspondente, sem apagar o histórico no site.')}
          </p>
        </div>
        <button type="button" onClick={()=>void refresh()} disabled={loading||checking}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`} aria-hidden="true"/>
          {t('Atualizar status')}
        </button>
      </div>
      {error&&<p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {loading&&!report?<p className="mt-5 text-sm text-slate-500">{t('Consultando integração…')}</p>:report&&<>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            [t('Na fila'),report.pending],
            [t('Sincronizados'),report.sent],
            [t('Falhas'),report.failed]
          ].map(([label,value])=><div key={String(label)} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
          </div>)}
        </div>
        <div className="mt-5 rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            {report.verified?<CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true"/>:
              <AlertCircle className="h-5 w-5 text-amber-600" aria-hidden="true"/>}
            {report.verified?t('Conta Google validada e autorizada a editar a agenda')
              :report.credentialsConfigured?t('Credenciais cadastradas — verifique a permissão da agenda')
              :t('Aguardando autorização da conta Google da MVA')}
          </div>
          {report.calendarName&&<p className="mt-2 text-xs text-slate-600">{t('Agenda de destino')}: {report.calendarName}</p>}
          {report.reason&&<p className="mt-2 text-xs text-amber-800">{report.reason}</p>}
          <p className="mt-2 text-xs text-slate-600">
            {report.enabled?t('Fila automática habilitada; aguarda autorização quando necessário.')
              :t('A fila está pausada no Supabase.')}
          </p>
          <button type="button" onClick={()=>void refresh(true)} disabled={checking}
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50">
            <ShieldCheck className="h-4 w-4" aria-hidden="true"/>
            {checking?t('Verificando autorização…'):t('Testar conexão Google Agenda')}
          </button>
        </div>
      </>}
    </div>
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h3 className="text-base font-bold text-navy-950">{t('Como conectar a agenda oficial')}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {t('Esta integração usa autorização OAuth de uma conta Google da MVA, com acesso à agenda mesmo quando ninguém está conectado ao site. As credenciais devem ficar somente nos segredos do Supabase.')}
      </p>
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-slate-700">
        <li>{t('Ative a Google Calendar API no Google Cloud e crie um cliente OAuth 2.0 para aplicativo Web.')}</li>
        <li>{t('Autorize a conta Google responsável pela agenda com o escopo de eventos e acesso off-line.')}</li>
        <li>{t('Cadastre as quatro variáveis abaixo nos segredos das Edge Functions do Supabase, sem colocá-las no código.')}</li>
        <li>{t('Clique em Testar conexão Google Agenda. Após a autorização, os agendamentos na fila serão sincronizados automaticamente.')}</li>
      </ol>
      <div className="mt-4 rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-700">{t('Segredos necessários no Supabase')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {['GOOGLE_CALENDAR_ID','GOOGLE_OAUTH_CLIENT_ID','GOOGLE_OAUTH_CLIENT_SECRET','GOOGLE_OAUTH_REFRESH_TOKEN'].map(name=>
            <code key={name} className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-700">{name}</code>)}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
          {t('Configurar Google Cloud')} <ExternalLink className="h-4 w-4" aria-hidden="true"/>
        </a>
        <a href="https://supabase.com/dashboard/project/yealdaokedpfpdgvslzj/settings/functions" target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
          {t('Abrir segredos do Supabase')} <ExternalLink className="h-4 w-4" aria-hidden="true"/>
        </a>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        {t('A sincronização administrativa não exige que os clientes conectem suas contas Google. Eventos de reserva não são comprovantes de pagamento. Notificações automáticas por e-mail permanecem desligadas.')}
      </p>
    </div>
  </section>;
}
