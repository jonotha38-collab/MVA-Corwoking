import { useEffect, useState } from 'react';
import { ArrowRight, Download, FileCheck2, LoaderCircle, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { t } from '../../lib/preferences';
import { canIssueCertificate, callPayment } from '../../lib/fiscal-payment';
import { useCoworking } from '../../context/CoworkingContext';

export function CertificateDialog({ onClose, onChoosePlan }: { onClose: () => void; onChoosePlan: () => void }) {
  const { currentUser, currentCompany, setAuthModalOpen, setAuthModalTab } = useCoworking();
  const eligible = canIssueCertificate(currentCompany);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [document, setDocument] = useState<{ url: string; filename: string } | null>(null);
  useEffect(() => () => { if (document) URL.revokeObjectURL(document.url); }, [document]);
  const generate = async () => {
    if (!eligible || busy) return;
    setBusy(true); setError('');
    try {
      const result = await callPayment<{ pdf: string; filename: string }>('fiscal-certificate', { contractId: currentCompany.id });
      const bytes = Uint8Array.from(atob(result.pdf), c => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      setDocument({ url, filename: result.filename });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  return <Dialog titleId="certificate-title" onClose={() => { if (!busy) onClose(); }} className="certificate-dialog">
    <div className="certificate-header"><div className="checkout-icon"><FileCheck2 size={23} /></div><button type="button" disabled={busy} onClick={onClose} className="checkout-close" aria-label={t('Fechar')}><X size={21} /></button></div>
    <span className="checkout-kicker">{t('DOCUMENTOS DA EMPRESA')}</span>
    <h2 id="certificate-title">{t('Sua declaração oficial, no momento certo.')}</h2>
    <p className="certificate-description">{t('A emissão fica disponível para contratos fiscais ativos com pagamento confirmado.')}</p>
    <div className={`certificate-access ${eligible ? 'is-unlocked' : ''}`}>
      {eligible ? <ShieldCheck size={23} /> : <LockKeyhole size={23} />}<div><strong>{t(eligible ? 'Emissão disponível' : 'Emissão bloqueada')}</strong><p>{t(!currentUser ? 'Entre na sua conta para consultar seu contrato e o pagamento.' : eligible ? 'Seu pagamento foi confirmado. Os dados serão conferidos novamente antes de gerar o documento.' : currentCompany.planId === 'comercial' ? 'O plano comercial não inclui declaração de domicílio fiscal. Escolha um dos planos fiscais.' : currentCompany.paymentStatus === 'paid' && !currentCompany.paymentIsLive ? 'Pagamentos de teste não autorizam o uso do endereço nem a emissão oficial.' : 'Conclua o pagamento de um plano fiscal para liberar o uso do endereço e a emissão.')}</p></div>
    </div>
    {eligible && <dl className="certificate-company"><div><dt>{t('Empresa')}</dt><dd>{currentCompany.companyName}</dd></div><div><dt>CNPJ</dt><dd>{currentCompany.cnpj}</dd></div><div><dt>{t('Endereço autorizado')}</dt><dd>{currentCompany.unitAddress}</dd></div><div><dt>{t('Vigência')}</dt><dd>{currentCompany.startDate.split('-').reverse().join('/')} — {currentCompany.renewalDate.split('-').reverse().join('/')}</dd></div></dl>}
    {error && <p role="alert" className="checkout-error">{t(error)}</p>}
    {document ? <><div className="checkout-notice" role="status"><FileCheck2 size={20} /><span>{t('Declaração gerada com os dados do seu contrato.')}</span></div><a href={document.url} download={document.filename} className="action-primary checkout-submit"><Download size={18} />{t('Baixar declaração em PDF')}</a></> : eligible ? <button type="button" onClick={generate} disabled={busy} className="action-primary checkout-submit">{busy ? <LoaderCircle size={18} className="animate-spin" /> : <FileCheck2 size={18} />}{t(busy ? 'Gerando declaração…' : 'Gerar declaração oficial')}</button> : !currentUser ? <button type="button" className="action-primary checkout-submit" onClick={() => { setAuthModalTab('login'); setAuthModalOpen(true); }}>{t('Entrar para consultar')}<ArrowRight size={17} /></button> : <button type="button" className="action-primary checkout-submit" onClick={onChoosePlan}>{t('Escolher plano fiscal')}<ArrowRight size={17} /></button>}
    <p className="checkout-fineprint"><ShieldCheck size={15} />{t('Liberação vinculada ao pagamento e à vigência do contrato.')}</p>
  </Dialog>;
}
