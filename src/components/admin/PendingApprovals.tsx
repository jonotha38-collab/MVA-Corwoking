import React, { useState } from 'react';
import { Check, X, MapPin, ClockAlert } from 'lucide-react';
import { useCoworking } from '../../context/CoworkingContext';

export const PendingApprovals: React.FC = () => {
  const { spaces, approveSpace, rejectSpace } = useCoworking();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const pending = spaces.filter(s => s.approval === 'pendente');

  return (
    <section aria-labelledby="aprovacoes" className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
      <div className="flex items-center gap-2">
        <ClockAlert className="h-5 w-5 text-amber-600" aria-hidden />
        <h2 id="aprovacoes" className="text-lg font-bold text-navy-900">Anúncios aguardando aprovação</h2>
        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">{pending.length}</span>
      </div>
      {pending.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">Nenhum anúncio pendente. Novos espaços enviados por coworkings parceiros aparecem aqui.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {pending.map(s => (
            <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <img src={s.image} alt={s.name} className="h-28 w-full rounded-lg object-cover sm:w-44" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-navy-900">{s.name}</h3>
                  <p className="text-xs text-slate-500">{s.coworkingName} · enviado por {s.ownerName || 'anunciante'}</p>
                  <p className="mt-1 flex items-start gap-1 text-xs text-slate-600"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" aria-hidden />{s.address}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-600">{s.description}</p>
                  <p className="mt-1 text-xs text-slate-500">{s.capacity} pessoas · R$ {s.pricePerHour}/h · {(s.gallery?.length || 0) + 1} foto(s)</p>
                </div>
                <div className="flex shrink-0 gap-2 sm:flex-col">
                  <button onClick={() => approveSpace(s.id)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"><Check className="h-4 w-4" aria-hidden />Aprovar</button>
                  <button onClick={() => { setRejecting(s.id); setReason(''); }} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50"><X className="h-4 w-4" aria-hidden />Rejeitar</button>
                </div>
              </div>
              {rejecting === s.id && (
                <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row">
                  <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo da rejeição (o anunciante verá)" aria-label="Motivo da rejeição" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500" />
                  <button disabled={!reason.trim()} onClick={() => { rejectSpace(s.id, reason.trim()); setRejecting(null); }} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Confirmar rejeição</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
