import type { Booking, Space, UserAccount } from '../types';
import { supabase } from './supabase';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const ZONE = 'America/Maceio';
const prefix = 'mva:google-calendar:';

type CalendarEvent = {
  id: string;
  summary: string;
  location: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  reminders: { useDefault: false; overrides: Array<{ method: 'popup' | 'email'; minutes: number }> };
};

export type CalendarSyncResult = 'saved' | 'permission_required' | 'not_connected';
type ConnectionRequest = { userId: string; email: string; bookingId?: string };

const key = (uid: string) => prefix + uid;
const eventKey = (uid: string, bookingId: string) => prefix + uid + ':event:' + bookingId;
const connectKey = 'mva:google-calendar:oauth-pending';

export function calendarEnabled(userId: string): boolean {
  try { return localStorage.getItem(key(userId)) === 'yes'; } catch { return false; }
}

function enableCalendar(userId: string) {
  try { localStorage.setItem(key(userId), 'yes'); } catch { /* preference not persisted */ }
}

export function disconnectGoogleCalendar(userId: string) {
  // Revoga a preferência de sincronização no site. A revogação do acesso OAuth
  // pode ser feita pelo próprio usuário em myaccount.google.com/permissions.
  try { localStorage.removeItem(key(userId)); } catch { /* ignore */ }
}

export function pendingCalendarConnection(): ConnectionRequest | null {
  try {
    const raw = sessionStorage.getItem(connectKey);
    if (!raw) return null;
    const decoded: unknown = JSON.parse(raw);
    if (decoded && typeof decoded === 'object'
        && 'userId' in decoded && typeof decoded.userId === 'string'
        && 'email' in decoded && typeof decoded.email === 'string') {
      return decoded as ConnectionRequest;
    }
  } catch { /* ignore invalid local state */ }
  return null;
}

export function clearPendingCalendarConnection(): void {
  try { sessionStorage.removeItem(connectKey); } catch { /* ignore */ }
}

export async function connectGoogleCalendar(user: UserAccount, bookingId?: string) {
  if (user.provider !== 'google') {
    throw new Error('Para a sincronização automática, entre usando a mesma conta Google.');
  }
  try {
    sessionStorage.setItem(connectKey, JSON.stringify({
      userId: user.id, email: user.email.toLowerCase(), bookingId,
    } satisfies ConnectionRequest));
  } catch { throw new Error('Seu navegador bloqueou o retorno da autorização.'); }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      scopes: CALENDAR_SCOPE,
      queryParams: { prompt: 'consent select_account', access_type: 'online' },
    },
  });
  if (error) { clearPendingCalendarConnection(); throw new Error('Não foi possível abrir a autorização do Google Agenda.'); }
}

export function calendarEventId(bookingId: string) {
  // Google IDs use base32hex (a-v, 0-9); UUID hex is a valid subset.
  const uuid = bookingId.replace(/-/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(uuid)) throw new Error('Identificador de reserva inválido.');
  return 'mva' + uuid;
}

export function calendarEventPayload(booking: Booking, space?: Space): CalendarEvent {
  const date = booking.date;
  const start = booking.startTime.slice(0, 5);
  const end = booking.endTime.slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)
      || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start)
      || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) {
    throw new Error('Data ou horário inválidos.');
  }
  return {
    id: calendarEventId(booking.id),
    summary: `Reserva MVA · ${booking.spaceName}`,
    location: space?.address || booking.coworkingName,
    description: `Reserva de espaço confirmada na MVA Coworking.\nCódigo: ${booking.id}\nConfira os detalhes em https://coworking-mva-du8c.vercel.app/\nHorário local: Brasília (UTC-3).`,
    start: { dateTime: `${date}T${start}:00-03:00`, timeZone: ZONE },
    end: { dateTime: `${date}T${end}:00-03:00`, timeZone: ZONE },
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 30 }, { method: 'email', minutes: 60 }],
    },
  };
}

export function manualGoogleCalendarLink(booking: Booking, space?: Space): string {
  const compact = (v: string) => v.replace(/[-:]/g, '');
  const start = `${compact(booking.date)}T${compact(booking.startTime.slice(0, 5))}00`;
  const end = `${compact(booking.date)}T${compact(booking.endTime.slice(0, 5))}00`;
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Reserva MVA · ${booking.spaceName}`,
    dates: `${start}/${end}`,
    ctz: ZONE,
    details: `Reserva MVA confirmada. Código: ${booking.id}. Ative os lembretes desejados no Google Agenda.`,
    location: space?.address || booking.coworkingName,
  });
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}

export function recordedCalendarEventUrl(userId: string, bookingId: string) {
  try {
    const url = localStorage.getItem(eventKey(userId, bookingId));
    return url?.startsWith('https://calendar.google.com/') ? url : null;
  } catch { return null; }
}

export async function saveGoogleCalendarEvent(booking: Booking, userId: string, space?: Space, force = false): Promise<CalendarSyncResult> {
  if (!force && !calendarEnabled(userId)) return 'not_connected';
  const { data } = await supabase.auth.getSession();
  if (!data.session || data.session.user.id !== userId || !data.session.provider_token) return 'permission_required';
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${data.session.provider_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(calendarEventPayload(booking, space)),
  });
  if (response.status === 401 || response.status === 403) return 'permission_required';
  if (!response.ok && response.status !== 409) throw new Error('Google Agenda não respondeu. Sua reserva continua confirmada.');
  if (response.ok) {
    const event = await response.json() as { htmlLink?: string };
    if (typeof event.htmlLink === 'string' && event.htmlLink.startsWith('https://calendar.google.com/')) {
      try { localStorage.setItem(eventKey(userId, booking.id), event.htmlLink); } catch { /* ignore */ }
    }
  }
  enableCalendar(userId);
  return 'saved';
}

export async function finishGoogleCalendarConnection(user: UserAccount, bookings: Booking[], spaces: Space[]) {
  const pending = pendingCalendarConnection();
  if (!pending) return { kind: 'none' as const };
  clearPendingCalendarConnection();
  if (pending.userId !== user.id || pending.email !== user.email.toLowerCase()) {
    return { kind: 'wrong-account' as const };
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session?.provider_token) return { kind: 'no-token' as const };
  enableCalendar(user.id);
  const future = bookings.filter(b => b.userId === user.id && b.status === 'confirmada'
    && `${b.date}T${b.endTime.slice(0, 5)}` > new Date().toLocaleString('sv-SE', { timeZone: ZONE }).replace(' ', 'T').slice(0, 16));
  const batch = pending.bookingId
    ? future.filter(b => b.id === pending.bookingId)
    : future.slice(0, 20);
  let saved = 0;
  let failed = 0;
  for (const booking of batch) {
    try {
      const result = await saveGoogleCalendarEvent(booking, user.id, spaces.find(s => s.id === booking.spaceId), true);
      if (result === 'saved') saved++;
      else failed++;
    } catch { failed++; }
  }
  return { kind: failed ? 'partial' as const : 'connected' as const, saved, failed };
}

export async function removeGoogleCalendarEvent(bookingId: string, userId: string): Promise<boolean> {
  if (!calendarEnabled(userId)) return false;
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id !== userId || !data.session.provider_token) return false;
  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/' + calendarEventId(bookingId), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${data.session.provider_token}` },
    });
    if (response.status === 204 || response.status === 404) {
      try { localStorage.removeItem(eventKey(userId, bookingId)); } catch { /* ignore */ }
      return true;
    }
  } catch { /* leave reservation canceled and allow user to remove event */ }
  return false;
}
