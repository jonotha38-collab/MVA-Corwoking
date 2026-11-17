import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { t } from '../../lib/preferences';
import { StatusSymbol, type StatusKind } from './StatusBadge';

/** Persistent feedback: presentation only; callers own every business state. */
export function StatusNotice({ status, title, children, className = '', role = 'status', onDismiss,
  dismissLabel = 'Fechar notificação' }: {
  status: StatusKind; title: string; children?: ReactNode; className?: string;
  role?: 'status' | 'alert'; onDismiss?: () => void; dismissLabel?: string;
}) {
  return <div className={`mva-notice mva-status-notice ${className}`} data-status={status} role={role} aria-atomic="true">
    {status !== 'info' && <span className="mva-status-notice-icon"><StatusSymbol status={status} /></span>}
    <div className="mva-status-notice-copy">
      <p className="mva-status-notice-title">{t(title)}</p>
      {children && <div className="mva-status-notice-description">{typeof children === 'string' ? t(children) : children}</div>}
    </div>
    {onDismiss && <button type="button" className="mva-toast-close" onClick={onDismiss}
      aria-label={t(dismissLabel)} title={t(dismissLabel)}>
      <X size={16} strokeWidth={1.5} aria-hidden="true" />
    </button>}
  </div>;
}
