import { useEffect, useState } from 'react';
import type { Booking } from '../types';

// The MVA headquarters operates in Aracaju (America/Maceio). Compare local
// calendar values instead of the visitor's browser timezone or UTC dates.
const tzFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Maceio',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export const mvaLocalDateTime = (nowMs: number): string => {
  const parts = tzFormatter.formatToParts(new Date(nowMs));
  const read = (part: string) => parts.find(p => p.type === part)?.value || '00';
  return `${read('year')}-${read('month')}-${read('day')}T${read('hour')}:${read('minute')}`;
};

/** A booking disappears from upcoming listings as soon as its end time is reached. */
export const isBookingUpcoming = (
  b: Pick<Booking,'date'|'endTime'|'status'>, nowMs = Date.now()
): boolean => b.status === 'confirmada'
  && `${b.date}T${b.endTime.slice(0,5)}` > mvaLocalDateTime(nowMs);

/** Includes bookings that have finished or were cancelled/concluded. */
export const isBookingArchived = (
  b: Pick<Booking,'date'|'endTime'|'status'>, nowMs = Date.now()
): boolean => !isBookingUpcoming(b, nowMs);

/** Keeps active booking lists accurate even when the page is left open. */
export const useBookingClock = (): number => {
  const [clock,setClock] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setClock(Date.now());
    const timer = window.setInterval(update, 15_000);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('focus', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('focus', update);
    };
  },[]);
  return clock;
};
