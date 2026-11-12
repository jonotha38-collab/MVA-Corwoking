import { useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { normalizeVoucherInput, type VoucherCheckIn } from '../../lib/booking-voucher';
import { t } from '../../lib/preferences';
import { supabase } from '../../lib/supabase';
import { LabelInput } from '../ui/LabelInput';

const messages: Record<VoucherCheckIn['status'], string> = {
  checked_in: 'Entrada registrada.',
  used: 'A entrada desta reserva já foi registrada.',
  canceled: 'Esta reserva foi cancelada.',
  expired: 'O horário desta reserva já terminou.',
  early: 'O voucher pode ser validado no dia da reserva.',
  pending: 'Pagamento ou benefício ainda não confirmado.',
  invalid: 'Código não encontrado. Confira com o cliente.',
};

export function VoucherCheckInForm({ onCheckIn }: { onCheckIn: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<VoucherCheckIn | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setResult(null);
    const normalized = normalizeVoucherInput(code);
    if (!normalized) {
      setError('Digite os seis números ou cole o código completo de um voucher antigo.');
      return;
    }

    setBusy(true);
    try {
      const { data, error: requestError } = await supabase.rpc('mva_check_in_voucher', { p_code: normalized });
      if (requestError || !data) {
        setError(requestError?.code === '42501'
          ? 'Apenas administradores podem validar vouchers.'
          : 'Não foi possível validar o voucher. Tente novamente.');
        return;
      }
      const checkIn = data as VoucherCheckIn;
      setResult(checkIn);
      if (checkIn.status === 'checked_in') onCheckIn();
    } catch {
      setError('Não foi possível validar o voucher. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="voucher-check-in-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 id="voucher-check-in-title" className="flex items-center gap-2 text-sm font-bold text-navy-900">
        <ShieldCheck className="h-4 w-4 text-orange-700" aria-hidden />
        {t('Validar voucher')}
      </h3>
      <p id="voucher-check-in-help" className="mb-4 mt-1 text-xs text-slate-600">
        {t('Digite o código informado pelo cliente. Exemplo 482 731.')}
      </p>
      <form noValidate onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-center" aria-busy={busy}>
        <LabelInput
          label={t('Código do voucher')}
          value={code}
          onChange={event => {
            setCode(event.target.value);
            setError('');
            setResult(null);
          }}
          readOnly={busy}
          maxLength={64}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={result?.status === 'invalid' || (!!error && !normalizeVoucherInput(code)) || undefined}
          aria-describedby="voucher-check-in-help voucher-check-in-feedback"
          className="min-h-11 font-mono tracking-wider"
          containerClassName="sm:max-w-xs"
        />
        <button type="submit" disabled={busy} className="min-h-11 shrink-0 rounded-xl bg-navy-900 px-4 py-2 text-xs font-bold text-white hover:bg-navy-800 disabled:opacity-60">
          {t(busy ? 'Validando…' : 'Validar e registrar entrada')}
        </button>
      </form>
      <div id="voucher-check-in-feedback" aria-live="polite">
        {error && <p className="mt-3 text-xs font-semibold text-rose-700">{t(error)}</p>}
        {result && (
          <div className={`mt-3 rounded-xl border p-3 text-xs ${result.status === 'checked_in'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-navy-900'}`}>
            <p className="font-bold">{t(messages[result.status])}</p>
            {result.status !== 'invalid' && <p className="mt-1 text-slate-700">
              {result.responsible} · {result.room} · {result.date.split('-').reverse().join('/')} · {result.startTime}–{result.endTime}
            </p>}
          </div>
        )}
      </div>
    </section>
  );
}
