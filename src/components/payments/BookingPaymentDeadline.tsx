import { useEffect, useState } from 'react';
import { StatusNotice } from '../common/StatusNotice';
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
    <StatusNotice status={canceled ? 'canceled' : 'waiting'}
      title={canceled ? 'Reserva cancelada por falta de pagamento.' : 'Prazo para pagamento'}>
      {!canceled && <>
          <time dateTime={deadline} className="font-semibold">{deadlineLabel}</time> ({t('horário de Brasília')})
          <span className="mt-1 block">{t(closed
            ? 'Prazo encerrado. Estamos verificando se o pagamento foi recebido.'
            : 'Sem pagamento até esse horário, a reserva será cancelada automaticamente e o horário será liberado.')}</span>
      </>}
    </StatusNotice>
  );
}
