import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { isAdmin } from '../../lib/auth';
import { useCoworking } from '../../context/CoworkingContext';

/** Avisos de reservas persistem no banco, com leitura independente para cada administrador. */
export function AdminBookingBadge() {
  const { currentUser } = useCoworking();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!currentUser || !isAdmin(currentUser)) { setUnread(0); return; }
    let alive = true;
    const id = currentUser.id;
    const refresh = async () => {
      if (document.visibilityState === 'hidden') return;
      const [notices, read] = await Promise.all([
        supabase.from('admin_booking_notifications').select('id')
          .order('created_at', { ascending: false }).limit(80),
        supabase.from('admin_booking_notice_reads').select('notification_id').eq('admin_id', id),
      ]);
      if (!alive || notices.error || read.error) return;
      const seen = new Set((read.data || []).map(r => Number(r.notification_id)));
      setUnread((notices.data || []).filter(n => !seen.has(Number(n.id))).length);
    };
    void refresh();
    const onRefresh = () => { void refresh(); };
    const timer = window.setInterval(onRefresh, 30_000);
    window.addEventListener('mva-admin-notices-updated', onRefresh);
    document.addEventListener('visibilitychange', onRefresh);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener('mva-admin-notices-updated', onRefresh);
      document.removeEventListener('visibilitychange', onRefresh);
    };
  }, [currentUser?.id, currentUser?.isAdmin]);
  if (!unread) return null;
  return <span aria-label={`${unread} avisos de reserva não lidos`}
    className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white">
    <Bell className="h-3 w-3" aria-hidden />{unread > 79 ? '79+' : unread}
  </span>;
}
