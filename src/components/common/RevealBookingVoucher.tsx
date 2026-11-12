import { useId, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useBookingVoucher } from '../../lib/booking-voucher';
import { t } from '../../lib/preferences';
import { BookingVoucherCode } from './BookingVoucherCode';

export function RevealBookingVoucher({ bookingId }: { bookingId: string }) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const { voucher, reload } = useBookingVoucher(expanded ? bookingId : undefined);

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded(open => !open)}
        className="no-print inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-900 hover:bg-slate-50"
      >
        <KeyRound className="h-4 w-4 text-orange-700" aria-hidden />
        {t(expanded ? 'Ocultar código da sala' : 'Mostrar código da sala')}
      </button>
      <div id={panelId} className="mt-2" hidden={!expanded}>
        {expanded && <BookingVoucherCode voucher={voucher} reload={reload} />}
      </div>
    </div>
  );
}
