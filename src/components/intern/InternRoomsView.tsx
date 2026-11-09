import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, DoorOpen, LoaderCircle, RefreshCcw, Users, UserRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCoworking } from '../../context/CoworkingContext';

type RoomAvailability = {
  room_id: string;
  room_code: string;
  room_name: string;
  room_description: string;
  room_capacity: number;
  room_active: boolean;
  places_taken: number;
};
type MyReservation = { id: string; room_id: string; reservation_date: string };
type RoomOccupant = { room_id: string; display_name: string; is_mine: boolean };

function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function friendlyDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function InternRoomsView() {
  const { currentUser, internAuthorized, showToast } = useCoworking();
  const [date, setDate] = useState(localToday);
  const [rooms, setRooms] = useState<RoomAvailability[]>([]);
  const [myReservation, setMyReservation] = useState<MyReservation | null>(null);
  const [occupants, setOccupants] = useState<RoomOccupant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const requestNumber = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!currentUser || !internAuthorized) return;
    const request = ++requestNumber.current;
    if (!silent) setLoading(true);
    setError('');
    const [availability, booking, people] = await Promise.all([
      supabase.rpc('get_intern_room_availability', { p_date: date }),
      supabase.from('intern_room_reservations')
        .select('id, room_id, reservation_date')
        .eq('user_id', currentUser.id).eq('reservation_date', date).eq('status', 'ativa')
        .maybeSingle(),
      supabase.rpc('get_intern_room_occupants', { p_date: date }),
    ]);
    if (request !== requestNumber.current) return;
    if (availability.error || booking.error || people.error) {
      console.error('Erro ao carregar as salas internas:', availability.error || booking.error || people.error);
      setError('Não foi possível consultar as salas. Confira a conexão e se o SQL das salas internas foi instalado no Supabase.');
      setRooms([]);
      setMyReservation(null);
      setOccupants([]);
    } else {
      setRooms((availability.data || []) as RoomAvailability[]);
      setMyReservation((booking.data || null) as MyReservation | null);
      setOccupants((people.data || []) as RoomOccupant[]);
    }
    setLoading(false);
  }, [currentUser?.id, internAuthorized, date]);

  useEffect(() => { void load(); return () => { requestNumber.current++; }; }, [load]);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') void load(true); };
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(onVisible, 30_000);
    return () => { document.removeEventListener('visibilitychange', onVisible); window.clearInterval(interval); };
  }, [load]);

  const reserve = async (room: RoomAvailability) => {
    if (!currentUser || myReservation || saving || !room.room_active || room.places_taken >= room.room_capacity) return;
    setSaving(true);
    try {
      const { error: insertError } = await supabase.from('intern_room_reservations').insert({
        user_id: currentUser.id, room_id: room.room_id, reservation_date: date,
      });
      if (insertError) {
        console.error(insertError);
        showToast(
          ['P0001', '23505'].includes(insertError.code)
            ? 'Esta vaga não está mais disponível, ou você já possui uma reserva nesse dia.'
            : 'Não foi possível reservar. Verifique sua permissão e tente novamente.',
          'error',
        );
      } else {
        showToast(`Sua vaga em ${room.room_name} foi confirmada para ${friendlyDate(date)}!`);
      }
      await load();
    } finally { setSaving(false); }
  };

  const cancel = async () => {
    if (!myReservation || saving || !window.confirm('Cancelar sua reserva nesta data?')) return;
    setSaving(true);
    try {
      const { error: cancelError } = await supabase.from('intern_room_reservations')
        .update({ status: 'cancelada' }).eq('id', myReservation.id);
      if (cancelError) {
        console.error(cancelError);
        showToast('Não foi possível cancelar a reserva.', 'error');
      } else {
        showToast('Reserva cancelada. Você já pode escolher outra sala.', 'info');
      }
      await load();
    } finally { setSaving(false); }
  };

  const selected = rooms.find(room => room.room_id === myReservation?.room_id);
  return (
    <div className="space-y-7 pb-16">
      <header className="overflow-hidden rounded-2xl border border-navy-800 bg-navy-900 p-6 text-white sm:p-9">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-300">
          <DoorOpen className="h-4 w-4" aria-hidden /> MVA · Uso interno
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Salas de trabalho</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
          Consulte a ocupação e reserve sua estação para o dia selecionado.
          Esta área é exclusiva dos colaboradores autorizados.
        </p>
        <p className="mt-3 text-xs text-slate-400">Conectado como {currentUser?.email}</p>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label htmlFor="intern-room-date" className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy-900">
            <CalendarDays className="h-4 w-4 text-orange-600" aria-hidden /> Dia de trabalho
          </label>
          <input id="intern-room-date" type="date" required min={localToday()} value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-navy-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:w-64" />
          <p className="mt-2 text-xs text-slate-500">{date ? friendlyDate(date) : 'Selecione uma data.'}</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading || saving || !date}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCcw className="h-4 w-4" /> Atualizar disponibilidade
        </button>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /> {error}
        </div>
      )}
      {myReservation && (
        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
            <div>
              <h2 className="text-base font-bold text-emerald-900">Sua reserva está confirmada</h2>
              <p className="mt-1 text-sm text-emerald-800">{selected?.room_name || 'Sala de trabalho'} · {friendlyDate(date)}</p>
              <p className="mt-1 text-xs font-semibold text-emerald-800">Reservado por {occupants.find(person => person.is_mine)?.display_name || currentUser?.name || 'Você'}</p>
              <p className="mt-1 text-xs text-emerald-700">Para trocar de sala, cancele esta reserva e escolha outra vaga disponível.</p>
            </div>
          </div>
          <button type="button" disabled={saving} onClick={() => void cancel()}
            className="shrink-0 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50">
            Cancelar reserva
          </button>
        </section>
      )}

      <section aria-label="Salas disponíveis" className="grid gap-5 md:grid-cols-2">
        {loading ? (
          <div className="col-span-full flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin" /> Consultando vagas…
          </div>
        ) : rooms.map((room, index) => {
          const free = Math.max(0, room.room_capacity - room.places_taken);
          const bookedPeople = occupants.filter(person => person.room_id === room.room_id);
          const mine = myReservation?.room_id === room.room_id;
          const bookable = room.room_active && free > 0 && !myReservation && !saving && date >= localToday();
          return (
            <article key={room.room_id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${mine ? 'border-emerald-400' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between bg-navy-900 p-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10"><DoorOpen className="h-6 w-6 text-orange-300" /></div>
                  <div>
                    <span className="text-xs font-medium text-slate-300">Sala {index + 1}</span>
                    <h3 className="text-lg font-bold">{room.room_name}</h3>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${mine ? 'bg-emerald-100 text-emerald-900' : !room.room_active || free === 0 ? 'bg-rose-100 text-rose-900' : 'bg-emerald-100 text-emerald-900'}`}>
                  {mine ? 'Sua sala' : !room.room_active ? 'Indisponível' : free === 0 ? 'Lotada' : `${free} ${free === 1 ? 'vaga' : 'vagas'}`}
                </span>
              </div>
              <div className="space-y-5 p-6">
                <p className="min-h-10 text-sm leading-relaxed text-slate-600">{room.room_description}</p>
                <div className="space-y-3 border-y border-slate-100 py-4 text-sm">
                  <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600"><Users className="h-4 w-4 text-orange-600" /> Ocupação</span>
                  <strong className="text-navy-900">{room.places_taken} / {room.room_capacity}</strong>
                  </div>
                  <div role="meter" aria-label={`Ocupação de ${room.room_name}`} aria-valuemin={0} aria-valuemax={room.room_capacity} aria-valuenow={room.places_taken} className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-orange-600 transition-[width] duration-200" style={{ width: `${Math.min(100, room.places_taken / room.room_capacity * 100)}%` }} />
                  </div>
                </div>
                <section aria-label={`Pessoas com reserva em ${room.room_name}`} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-navy-900">
                      <UserRound className="h-4 w-4 text-orange-600" aria-hidden />
                      Quem reservou
                    </h4>
                    <span className="text-[11px] font-medium text-slate-500">
                      {bookedPeople.length} {bookedPeople.length === 1 ? 'pessoa' : 'pessoas'}
                    </span>
                  </div>
                  {bookedPeople.length > 0 ? (
                    <ul className="grid min-w-0 gap-2" aria-live="polite">
                      {bookedPeople.map((person, personIndex) => (
                        <li key={`${room.room_id}-${personIndex}`} className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy-100 text-xs font-bold text-navy-900">
                            {person.display_name.trim().charAt(0).toLocaleUpperCase('pt-BR') || '•'}
                          </span>
                          <span className="min-w-0 flex-1 break-words text-sm font-semibold text-navy-900">{person.display_name}</span>
                          {person.is_mine && <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800">Você</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs leading-relaxed text-slate-500">
                      Ninguém reservou uma vaga nesta sala para o dia selecionado.
                    </p>
                  )}
                  <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Visível somente para a equipe autorizada.</p>
                </section>
                <button type="button" disabled={!bookable} onClick={() => void reserve(room)}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${mine ? 'bg-emerald-50 text-emerald-800' : bookable ? 'bg-orange-600 text-white hover:bg-orange-500' : 'cursor-not-allowed bg-slate-100 text-slate-500'}`}>
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : mine ? <CheckCircle2 className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
                  {mine ? 'Reserva confirmada' : myReservation ? 'Já reservou outra sala' : !room.room_active ? 'Sala indisponível' : free === 0 ? 'Sem vagas para esta data' : 'Reservar minha vaga'}
                </button>
              </div>
            </article>
          );
        })}
      </section>
      {!loading && !error && rooms.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-7 text-center text-sm text-slate-600">Nenhuma sala interna está cadastrada.</div>
      )}
      <p className="text-center text-xs text-slate-500">Reservas internas são por dia e não incluem cobrança online. A capacidade e os e-mails autorizados são administrados no Supabase.</p>
    </div>
  );
}
