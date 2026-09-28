import React from 'react';
import { useCoworking } from '../../context/CoworkingContext';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts } = useCoworking();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 right-3 sm:left-auto sm:right-5 lg:bottom-5 z-50 flex flex-col gap-2 sm:max-w-md sm:w-full pointer-events-none no-print">
      {toasts.map(toast => {
        let icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
        let borderClass = 'border-emerald-500/30 bg-slate-900 text-white';

        if (toast.type === 'info') {
          icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;
          borderClass = 'border-blue-500/30 bg-slate-900 text-white';
        } else if (toast.type === 'error') {
          icon = <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />;
          borderClass = 'border-rose-500/30 bg-slate-900 text-white';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 animate-slideIn ${borderClass}`}
          >
            {icon}
            <div className="text-sm font-medium leading-relaxed">{toast.message}</div>
          </div>
        );
      })}
    </div>
  );
};
