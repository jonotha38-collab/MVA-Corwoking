import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { t, usePreferences } from '../../lib/preferences';

export function useBookingPaymentWindow(deadline?: string | null) {
  const [elapsedDeadline, setElapsedDeadline] = useState<string>();

  useEffect(() => {
    if (!deadline) return;
    const delay = Date.parse(deadline) - Date.now();
    if (delay <= 0) return;
    const timer = window.setTimeout(() => setElapsedDeadline(deadline), delay);
    return () => window.clearTimeout(timer);
  }, [deadline]);

  return !!deadline && (elapsedDeadline === deadline || Date.parse(deadline) <= Date.now());
}

export function BookingPaymentDeadline({ deadline, closed, canceled }: {
  deadline?: string | null;
  closed: boolean;
  canceled?: boolean;
}) {
  const { language } = usePreferences();
  if (!deadline) return null;
  const locale = { pt: 'pt-BR', en: 'en-GB', es: 'es' }[language];
  const deadlineLabel = new Intl.DateTimeFormat(locale, {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Maceio',
  }).format(new Date(deadline));

  return (
    <div role="status" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
      <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        {canceled ? <strong>{t('Reserva cancelada por falta de pagamento.')}</strong> : <>
          <strong>{t('Prazo para pagamento')}</strong>
          <time dateTime={deadline} className="ml-1 font-bold">{deadlineLabel}</time> ({t('horário de Brasília')})
          <p>{t(closed
            ? 'Prazo encerrado. Estamos verificando se o pagamento foi recebido.'
            : 'Sem pagamento até esse horário, a reserva será cancelada automaticamente e o horário será liberado.')}</p>
        </>}
      </div>
    </div>
  );
}
