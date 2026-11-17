import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { t } from '../../lib/preferences';
import { useCoworking, type ToastState } from '../../context/CoworkingContext';
import { StatusSymbol, type StatusKind } from './StatusBadge';

const presentation: Record<ToastState['type'], { status: StatusKind; title: string }> = {
  success: { status: 'approved', title: 'Concluído' },
  info: { status: 'info', title: 'Atualização' },
  error: { status: 'rejected', title: 'Não foi possível concluir' },
  waiting: { status: 'waiting', title: 'Aguardando' },
  analysis: { status: 'analysis', title: 'Em análise' },
  rejected: { status: 'rejected', title: 'Rejeitado' },
};

function ToastMessage({ toast }: { toast: ToastState }) {
  const { dismissToast } = useCoworking();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const remaining = useRef(Math.max(6500, Math.min(14000, toast.message.length * 60)));
  const { status, title } = presentation[toast.type];

  // Pause expiry while the message is being read or used.
  useEffect(() => {
    if (hovered || focused) return;
    const started = Date.now();
    const timer = window.setTimeout(() => dismissToast(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - started));
    };
  }, [toast.id, dismissToast, hovered, focused]);

  return <div className="mva-toast" data-status={status}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    {status !== 'info' && <div className="mva-toast-symbol">
      <StatusSymbol status={status} />
      <span className="mva-toast-signature" aria-hidden="true"><span /><span /></span>
    </div>}
    <div className="mva-toast-copy" role={toast.type === 'error' || toast.type === 'rejected' ? 'alert' : 'status'} aria-atomic="true">
      <p className="mva-toast-title">{t(title)}</p>
      <p className="mva-toast-message">{t(toast.message)}</p>
    </div>
    <button type="button" className="mva-toast-close" onClick={() => dismissToast(toast.id)}
      aria-label={t('Fechar notificação')} title={t('Fechar notificação')}>
      <X size={16} strokeWidth={1.5} aria-hidden="true" />
    </button>
  </div>;
}

export function ToastContainer() {
  const { toasts } = useCoworking();
  return <div className="mva-toast-stack no-print" role="region" aria-label={t('Notificações')}>
    {toasts.map(toast => <ToastMessage key={toast.id} toast={toast} />)}
  </div>;
}
