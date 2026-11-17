import type { ReactNode } from 'react';
import { CircleCheck, CircleX, Clock, FileSearch, type LucideIcon } from 'lucide-react';

export type StatusKind = 'approved' | 'waiting' | 'analysis' | 'rejected' | 'canceled' | 'info';
const symbols: Record<Exclude<StatusKind, 'info'>, LucideIcon> = {
  approved: CircleCheck, waiting: Clock, analysis: FileSearch, rejected: CircleX, canceled: CircleX,
};

/** Decorative only: the accompanying label always carries the actual status. */
export function StatusSymbol({ status, className = '' }: { status: StatusKind; className?: string }) {
  if (status === 'info') return null;
  const Icon = symbols[status];
  return <span aria-hidden="true" className={`mva-status-symbol ${className}`}>
    <Icon size={20} strokeWidth={1.5} aria-hidden="true" focusable="false" />
  </span>;
}

export function StatusBadge({ status, children, className = '' }: {
  status: StatusKind; children: ReactNode; className?: string;
}) {
  return <span className={`mva-status-badge ${className}`} data-status={status}>
    <StatusSymbol status={status} /><span className="min-w-0">{children}</span>
  </span>;
}
