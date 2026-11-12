import { useEffect, useState } from 'react';
import type { Booking } from '../types';
import { supabase } from './supabase';

export type BookingVoucher =
  | { status: 'available'; code: string; coverage: 'paid' | 'credit' | 'bonus' | 'complimentary' }
  | { status: 'pending' | 'used' | 'canceled' | 'expired' | 'error' };

export type VoucherCheckIn =
  | { status: 'invalid' }
  | {
    status: 'checked_in' | 'used' | 'canceled' | 'expired' | 'early' | 'pending';
    room: string;
    responsible: string;
    date: string;
    startTime: string;
    endTime: string;
  };

export function isComplimentaryBooking(booking?: Booking) {
  return booking?.adminComplimentary === true && booking.totalPrice === 0;
}

export function normalizeVoucherInput(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/[\s-]/g, '');
  if (/^\d{6}$/.test(digits)) return digits;
  if (/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(trimmed)) return trimmed;
  return null;
}

export function formatVoucherCode(code: string) {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

export function useBookingVoucher(bookingId?: string, refreshKey = false) {
  const [result, setResult] = useState<{ id: string; voucher: BookingVoucher } | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!bookingId) {
      setResult(null);
      return;
    }
    let active = true;
    let request = 0;
    const load = async () => {
      const current = ++request;
      try {
        const { data, error } = await supabase.rpc('mva_booking_voucher', { p_booking_id: bookingId });
        if (error || !data) throw error;
        if (active && current === request) setResult({ id: bookingId, voucher: data as BookingVoucher });
      } catch {
        if (active && current === request) setResult({ id: bookingId, voucher: { status: 'error' } });
      }
    };
    void load();
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [bookingId, refreshKey, retry]);

  return {
    voucher: result?.id === bookingId ? result?.voucher : undefined,
    reload: () => {
      setResult(null);
      setRetry(previous => previous + 1);
    },
  };
}
