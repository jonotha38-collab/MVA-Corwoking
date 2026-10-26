import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell, CalendarDays, Check, CheckCircle2, Clock3, Filter, Mail,
  MapPin, RefreshCw, Search, ShieldCheck, Users, XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { isAdmin } from '../../lib/auth';
import { rowToBooking } from '../../lib/mappers';
import { useCoworking } from '../../context/CoworkingContext';
import type { Booking } from '../../types';

type InternReservationRow = {
  id: string; user_id: string; room_id: string; reservation_date: string;
  status: 'ativa' | 'cancelada'; created_at: string;
};
type InternRoom = { id: string; name: string; code: string };
type Profile = { id: string; name: string; email: string };
type NoticeRow = {
  id: number; source: 'commercial' | 'intern'; reservation_id: string;
  action: 'created' | 'canceled'; created_at: string;
};
type AgendaItem = {
  id: string; type: 'commercial' | 'intern'; name: string; email: string;
  phone: string; company: string; room: string; location: string;
  date: string; time: string; status: string; createdAt: string;
  checkIn: boolean; booking?: Booking;
};
const formatDate = (s: string) => s ? s.split('-').reverse().join('/') : '—';
const localToday = () => new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Maceio',
}).format(new Date());
const actionLabel = (notice: NoticeRow) =>
  `${notice.action === 'created' ? 'Nova reserva' : 'Reserva cancelada'} · ${notice.source === 'intern' ? 'Sala interna' : 'Coworking'}`;

export function AdminBookingAgenda() {
  const { currentUser, checkInBooking, showToast } = useCoworking();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [date, setDate] = useState(localToday);
  const [scope, setScope] = useState<'day' | 'upcoming' | 'all'>('upcoming');
  const [type, setType] = useState<'all' | 'commercial' | 'intern'>('all');
  const [search, setSearch] = useState('');
  const [markingRead, setMarkingRead] = useState(false);
  const counter = useRef(0);

  const load = useCallback(async (initial = false) => {
    if (!currentUser || !isAdmin(currentUser)) return;
    const request = ++counter.current;
    if (initial) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      // Apenas administradores podem obter estas linhas; RLS valida no banco.
      const [commercial, intern, roomRows, noticeRows] = await Promise.all([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(1000),
        supabase.from('intern_room_reservations')
          .select('id,user_id,room_id,reservation_date,status,created_at')
          .order('created_at', { ascending: false }).limit(1000),
        supabase.from('intern_rooms').select('id,name,code'),
        supabase.from('admin_booking_notifications')
          .select('id,source,reservation_id,action,created_at')
          .order('created_at', { ascending: false }).limit(80),
      ]);
      const issue = commercial.error || intern.error || roomRows.error || noticeRows.error;
      if (issue) throw issue;

      const internList = (intern.data || []) as InternReservationRow[];
      const profileIds = Array.from(new Set(internList.map(row => row.user_id)));
      const [profiles, reads] = await Promise.all([
        profileIds.length
          ? supabase.from('profiles').select('id,name,email').in('id', profileIds)
          : Promise.resolve({ data: [] as Profile[], error: null }),
        supabase.from('admin_booking_notice_reads')
          .select('notification_id')
          .eq('admin_id', currentUser.id),
      ]);
      if (profiles.error || reads.error) throw profiles.error || reads.error;
      if (counter.current !== request) return;
      const people = new Map(((profiles.data || []) as Profile[]).map(row => [row.id, row]));
      const rooms = new Map(((roomRows.data || []) as InternRoom[]).map(row => [row.id, row]));
      const commercialItems: AgendaItem[] = (commercial.data || []).map(raw => {
        const b = rowToBooking(raw);
        return {
          id: b.id, type: 'commercial', name: b.responsibleName,
          email: b.responsibleEmail, phone: b.responsiblePhone,
          company: b.companyName, room: b.spaceName, location: b.coworkingName,
          date: b.date, time: `${b.startTime}–${b.endTime}`, status: b.status,
          createdAt: String(raw.created_at), checkIn: b.checkIn, booking: b,
        };
      });
      const internItems: AgendaItem[] = internList.map(r => ({
        id: r.id, type: 'intern',
        name: people.get(r.user_id)?.name || 'Colaborador cadastrado',
        email: people.get(r.user_id)?.email || '—',
        phone: '', company: 'Equipe interna',
        room: rooms.get(r.room_id)?.name || 'Sala interna',
        location: 'MVA Coworking · Salas internas',
        date: r.reservation_date, time: 'Dia de trabalho',
        status: r.status === 'ativa' ? 'confirmada' : 'cancelada',
        createdAt: r.created_at, checkIn: false,
      }));
      setItems([...commercialItems, ...internItems].sort((a, b) =>
        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)));
      setNotices((noticeRows.data || []) as NoticeRow[]);
      setReadIds(new Set((reads.data || []).map(row => Number(row.notification_id))));
    } catch (err) {
      console.error('Agenda administrativa:', err);
      if (counter.current === request) setError('Não foi possível atualizar a agenda. Verifique sua conexão e tente novamente.');
    } finally {
      if (counter.current === request) { setLoading(false); setRefreshing(false); }
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void load(true);
    const update = () => { if (document.visibilityState === 'visible') void load(); };
    const timer = window.setInterval(update, 30_000);
    document.addEventListener('visibilitychange', update);
    return () => { counter.current++; window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR');
    const today = localToday();
    return items.filter(item => {
      if (scope === 'day' && item.date !== date) return false;
      if (scope === 'upcoming' && (item.date < today || item.status === 'cancelada')) return false;
      if (type !== 'all' && item.type !== type) return false;
      if (!q) return true;
      return [item.name, item.email, item.phone, item.company, item.room, item.location, item.id]
        .some(value => value.toLocaleLowerCase('pt-BR').includes(q));
    });
  }, [items, scope, date, type, search]);
  const unread = notices.filter(n => !readIds.has(n.id));
  const todayCount = items.filter(i => i.date === localToday() && i.status !== 'cancelada').length;
  const futureCount = items.filter(i => i.date >= localToday() && i.status !== 'cancelada').length;

  const markRead = async () => {
    if (!currentUser || !unread.length || markingRead) return;
    setMarkingRead(true);
    const ids = unread.map(n => n.id);
    const { error: readError } = await supabase.from('admin_booking_notice_reads')
      .upsert(ids.map(notification_id => ({ notification_id, admin_id: currentUser.id })),
        { onConflict: 'notification_id,admin_id', ignoreDuplicates: true });
    if (readError) showToast('Não foi possível marcar os avisos como lidos.', 'error');
    else {
      setReadIds(previous => new Set([...previous, ...ids]));
      window.dispatchEvent(new Event('mva-admin-notices-updated'));
    }
    setMarkingRead(false);
  };

  return (
    <section className="space-y-5" aria-label="Agenda administrativa de reservas">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.15em] text-orange-700">
              <CalendarDays className="h-4 w-4" /> Controle de ocupação
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-navy-950">Agenda de reservas</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-600">Identifique quem vai chegar, a sala reservada, a data e o horário. Inclui reservas do marketplace e salas dos estagiários.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-navy-900 transition-colors hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Atualizar agenda
          </button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Hoje', value: todayCount, icon: Clock3 },
            { label: 'Próximas reservas', value: futureCount, icon: CalendarDays },
            { label: 'Salas internas', value: items.filter(i => i.type === 'intern' && i.status !== 'cancelada' && i.date >= localToday()).length, icon: Users },
            { label: 'Avisos não lidos', value: unread.length, icon: Bell },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2 text-slate-500">
                <span className="text-xs font-medium">{label}</span><Icon className="h-4 w-4 text-slate-500" />
              </div>
              <strong className="mt-2 block text-2xl font-bold tabular-nums text-navy-950">{value}</strong>
            </div>
          ))}
        </div>
      </div>

      <section aria-label="Notificações dos agendamentos" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-navy-900">
            <Bell className="h-4 w-4 text-orange-600" /> Novos agendamentos
            {unread.length > 0 && <span className="rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-bold text-white">{unread.length}</span>}
          </h3>
          <button type="button" onClick={() => void markRead()} disabled={!unread.length || markingRead}
            className="text-xs font-semibold text-navy-900 hover:text-orange-700 disabled:opacity-40">
            <Check className="mr-1 inline-block h-3.5 w-3.5" /> Marcar como lidos
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {unread.length ? unread.slice(0, 8).map(n => {
            const item = items.find(i => i.id === n.reservation_id && i.type === n.source);
            return <div key={n.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-xs font-bold text-navy-900">{actionLabel(n)}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {item ? `${item.name} · ${item.room} · ${formatDate(item.date)}` : 'Consulte o histórico completo da agenda'}
                </p>
              </div>
              <time className="shrink-0 text-[11px] text-slate-400">
                {new Date(n.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Maceio', day: '2-digit', month: '2-digit' })}
              </time>
            </div>;
          }) : <p className="px-5 py-5 text-xs text-slate-500">Nenhum aviso pendente. Novas reservas e cancelamentos aparecerão aqui.</p>}
        </div>
      </section>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-100 p-5 lg:grid-cols-[1fr_auto_auto_auto]">
          <label className="relative flex items-center gap-2">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
            <span className="sr-only">Buscar participante, e-mail ou sala</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar pessoa, empresa ou sala…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Filter className="h-4 w-4" />
            <span className="sr-only">Período</span>
            <select value={scope} onChange={e => setScope(e.target.value as typeof scope)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800">
              <option value="upcoming">Próximos</option><option value="day">Por data</option><option value="all">Histórico</option>
            </select>
          </label>
          {scope === 'day' && <input type="date" aria-label="Data da agenda" value={date} onChange={e => setDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800" />}
          <select value={type} onChange={e => setType(e.target.value as typeof type)} aria-label="Tipo de espaço"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800">
            <option value="all">Todas as salas</option><option value="commercial">Marketplace</option><option value="intern">Salas internas</option>
          </select>
        </div>
        {error && <div role="alert" className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">{error}</div>}
        {loading ? <p className="px-6 py-12 text-center text-sm text-slate-500">Carregando agenda administrativa…</p> :
          filtered.length === 0
          ? <div className="px-6 py-14 text-center"><CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">Nenhuma reserva encontrada</p>
              <p className="mt-1 text-xs text-slate-500">Altere a data ou os filtros para consultar outros agendamentos.</p>
            </div>
          : <div className="divide-y divide-slate-100">{filtered.map(item =>
              <article key={item.type + item.id} className="grid gap-4 p-5 transition-colors hover:bg-slate-50/60 lg:grid-cols-[115px_minmax(0,1fr)_minmax(0,1.1fr)_auto] lg:items-center">
                <div>
                  <div className="text-sm font-bold tabular-nums text-navy-900">{formatDate(item.date)}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-600"><Clock3 className="h-3.5 w-3.5" />{item.time}</div>
                </div>
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-bold text-navy-950">{item.room}</h4>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />{item.location}
                  </p>
                  <span className="mt-1.5 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {item.type === 'intern' ? 'Sala dos estagiários' : 'Reserva de cliente'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-navy-900">{item.name}</p>
                  <p className="truncate text-xs text-slate-600">{item.company}</p>
                  <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500"><Mail className="h-3.5 w-3.5 shrink-0" />{item.email}</p>
                  {item.phone && <p className="truncate text-xs text-slate-500">{item.phone}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {item.status === 'cancelada'
                    ? <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700"><XCircle className="h-3.5 w-3.5" />Cancelada</span>
                    : <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />{item.checkIn ? 'Check-in feito' : 'Confirmada'}</span>}
                  {item.type === 'commercial' && item.status === 'confirmada' && !item.checkIn &&
                    <button type="button" onClick={() => void checkInBooking(item.id).then(() => load())}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-navy-900 hover:bg-slate-100">
                      Check-in
                    </button>}
                </div>
              </article>,
            )}</div>}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          <span>Exibindo {filtered.length} agendamento(s) · Somente administradores</span>
          <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Atualização a cada 30 segundos</span>
        </div>
      </div>
    </section>
  );
}
