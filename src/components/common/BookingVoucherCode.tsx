import { useState } from 'react';
import { Copy } from 'lucide-react';
import { formatVoucherCode, type BookingVoucher } from '../../lib/booking-voucher';
import { t } from '../../lib/preferences';

const messages = {
  pending: 'O código será liberado após a confirmação do pagamento ou do benefício.',
  used: 'A entrada desta reserva já foi registrada.',
  canceled: 'Esta reserva foi cancelada.',
  expired: 'O horário desta reserva já terminou.',
  error: 'Não foi possível consultar o código.',
};

export function BookingVoucherCode({ voucher, reload }: {
  voucher: BookingVoucher | undefined;
  reload: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState<'copied' | 'error'>();
  const code = voucher?.status === 'available' ? formatVoucherCode(voucher.code) : null;

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3">
      <div>
        <p className="text-xs font-semibold text-navy-900">{t('Código do voucher')}</p>
        {code && <code className="mt-1 block font-mono text-xl font-bold tracking-wider text-navy-950">{code}</code>}
        <p className="mt-1 text-xs text-slate-600" role="status">
          {t(voucher?.status === 'available' ? 'Informe os seis números na recepção.' :
            voucher ? messages[voucher.status] : 'Consultando código do voucher…')}
        </p>
        {copyStatus && <p role="status" className="mt-1 text-xs text-slate-600">
          {t(copyStatus === 'copied' ? 'Código copiado.' : 'Selecione os números para copiar o código.')}
        </p>}
      </div>
      {code && (
        <button type="button" onClick={() => void copy()} className="no-print inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-800 hover:bg-slate-50">
          <Copy className="h-3.5 w-3.5" aria-hidden />{t('Copiar código')}
        </button>
      )}
      {voucher?.status === 'error' && (
        <button type="button" onClick={reload} className="no-print min-h-11 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-navy-800">
          {t('Tentar novamente')}
        </button>
      )}
    </div>
  );
}
