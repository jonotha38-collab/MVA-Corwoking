import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Clock3, CreditCard, FileCheck2, Info, LoaderCircle, LockKeyhole, MapPin, ShieldCheck, X } from 'lucide-react';
import { useCoworking } from '../../context/CoworkingContext';
import { t, usePreferences } from '../../lib/preferences';
import { callPayment, getPlan, quotePlan, HEADQUARTERS, money, paymentConfigured, rememberOrder, validateCompany, type FiscalPlanId, type FiscalTermMonths, type FiscalCompanyInput, type PaymentOrder, type PaymentSession } from '../../lib/fiscal-payment';
import { loadStripeClient, paymentAppearance, type SecureElements, type StripeClient } from '../../lib/stripe';
import { Dialog } from '../ui/Dialog';
import { AnimatedPaymentCard } from './AnimatedPaymentCard';
import { displayCardBrands, type CardBrand } from '../../lib/card-presentation';

export function FiscalCheckout({ planId, initialTerm = 12, transfer = false, resumeOrderId, onClose, onPaid }: { planId: FiscalPlanId; initialTerm?: FiscalTermMonths; transfer?: boolean; resumeOrderId?: string; onClose: () => void; onPaid: () => void }) {
  const { currentUser, setAuthModalOpen, setAuthModalTab, refreshFiscalContracts } = useCoworking();
  const { language, theme } = usePreferences();
  const [effectivePlanId, setEffectivePlanId] = useState<FiscalPlanId>(planId);
  const plan = getPlan(effectivePlanId);
  const [isTransfer, setTransfer] = useState(transfer);
  const [termMonths, setTermMonths] = useState<FiscalTermMonths>(initialTerm);
  const [previousAddress, setPreviousAddress] = useState('');
  const quote = quotePlan(plan, termMonths, isTransfer);
  const [company, setCompany] = useState<FiscalCompanyInput>({ companyName: '', tradingName: '', cnpj: '', contactEmail: currentUser?.email || '', contactPhone: '' });
  const [holder, setHolder] = useState(currentUser?.name || '');
  const [accepted, setAccepted] = useState(false);
  const [step, setStep] = useState<'details' | 'card' | 'confirming' | 'paid' | 'closed'>(resumeOrderId ? 'confirming' : 'details');
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [cardBrands, setCardBrands] = useState<CardBrand[]>([]);
  const [identifyingCard, setIdentifyingCard] = useState(false);
  const [error, setError] = useState('');
  const [pollAgain, setPollAgain] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const requestKey = useRef(crypto.randomUUID());
  const mount = useRef<HTMLDivElement>(null);
  const stripe = useRef<StripeClient | null>(null);
  const elements = useRef<SecureElements | null>(null);
  const lock = useRef(false);
  const onPaidRef = useRef(onPaid); onPaidRef.current = onPaid;
  const refreshRef = useRef(refreshFiscalContracts); refreshRef.current = refreshFiscalContracts;
  const liveRef = useRef(true);
  useEffect(() => { liveRef.current = true; return () => { liveRef.current = false; }; }, []);
  useEffect(() => { if (currentUser?.email) setCompany(c => ({ ...c, contactEmail: c.contactEmail || currentUser.email })); }, [currentUser?.email]);

  useEffect(() => {
    if (step !== 'card' || !session || !mount.current) return;
    let canceled = false;
    let destroy: (() => void) | undefined;
    setInitializing(true); setCardReady(false); setCardBrands([]); setIdentifyingCard(false);
    loadStripeClient().then(client => {
      if (canceled || !mount.current) return;
      stripe.current = client;
      const group = client.elements({ clientSecret: session.clientSecret, appearance: paymentAppearance(theme === 'dark'), locale: language === 'pt' ? 'pt-BR' : language });
      elements.current = group;
      const element = group.create('payment', { layout: 'tabs', defaultValues: { billingDetails: { email: company.contactEmail, name: holder } } });
      element.on('ready', () => { if (!canceled) { setCardReady(true); setInitializing(false); } });
      element.on('loaderror', () => { if (!canceled) { setInitializing(false); setError('Não foi possível carregar o pagamento seguro.'); } });
      element.on('carddetailschange', event => {
        if (canceled) return;
        setIdentifyingCard(event.loading);
        setCardBrands(event.loading ? [] : displayCardBrands(event.details?.brands));
      });
      element.on('change', event => {
        if (!canceled && (event.empty || event.value.type !== 'card')) { setCardBrands([]); setIdentifyingCard(false); }
      });
      element.mount(mount.current);
      destroy = () => { element.destroy(); elements.current = null; };
    }).catch(e => { if (!canceled) { setInitializing(false); setError(e.message); } });
    return () => { canceled = true; destroy?.(); };
    // Keep entered card details when appearance or language changes; update Elements below.
  }, [step, session]);
  useEffect(() => { elements.current?.update({ appearance: paymentAppearance(theme === 'dark'), locale: language === 'pt' ? 'pt-BR' : language }); }, [theme, language]);

  useEffect(() => {
    const id = order?.id || resumeOrderId;
    if (step !== 'confirming' || !id) return;
    let stopped = false; let timer: ReturnType<typeof setTimeout>; let attempts = 0;
    setWaiting(false);
    const check = async () => {
      try {
        const result = await callPayment<{ order: PaymentOrder; clientSecret?: string; providerStatus?: string; company: FiscalCompanyInput; previousAddress?: string }>('fiscal-payment-status', { orderId: id });
        if (stopped) return;
        setOrder(result.order); setEffectivePlanId(result.order.plan_id as FiscalPlanId); setTransfer(result.order.transfer); setTermMonths(result.order.term_months === 1 ? 1 : 12);
        if (resumeOrderId && result.order.status === 'pending' && ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(result.providerStatus || '') && result.clientSecret) {
          setCompany(result.company); setPreviousAddress(result.previousAddress || ''); setSession({ clientSecret: result.clientSecret, order: result.order }); setStep('card'); return;
        }
        if (result.order.status === 'paid') {
          if (currentUser) rememberOrder(currentUser.id, null);
          await refreshRef.current();
          if (!stopped) { setStep('paid'); onPaidRef.current(); }
          return;
        }
        if (['refunded', 'disputed', 'canceled'].includes(result.order.status)) {
          if (currentUser) rememberOrder(currentUser.id, null);
          setStep('closed'); return;
        }
        if (++attempts >= 12) { setWaiting(true); return; }
        timer = setTimeout(check, 2500);
      } catch (e) { if (!stopped) { setError((e as Error).message); setWaiting(true); } }
    };
    void check();
    return () => { stopped = true; clearTimeout(timer); };
  }, [step, order?.id, resumeOrderId, pollAgain, currentUser?.id]);

  const begin = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!currentUser) { setAuthModalTab('login'); setAuthModalOpen(true); return; }
    if (!paymentConfigured || lock.current) return;
    try {
      const data = validateCompany(company);
      if (!accepted || isTransfer && previousAddress.trim().length < 3) throw new Error('Confira os dados e aceite as condições para continuar.');
      lock.current = true; setBusy(true);
      const result = await callPayment<PaymentSession>('fiscal-create-payment', { planId: effectivePlanId, termMonths, company: data, transfer: isTransfer, previousAddress: isTransfer ? previousAddress.trim() : '', termsAccepted: true, requestKey: requestKey.current });
      if (!liveRef.current) return;
      if (result.order.term_months !== termMonths || result.order.amount !== quote.amount || result.order.plan_id !== effectivePlanId || result.order.transfer !== isTransfer) throw new Error('O valor ou o período retornado não corresponde à sua escolha. Atualize a integração antes de pagar.');
      setSession(result); setOrder(result.order); setTermMonths(result.order.term_months === 1 ? 1 : 12); rememberOrder(currentUser.id, result.order.id); setStep(result.order.status === 'paid' ? 'confirming' : 'card');
    } catch (e) { if (liveRef.current) setError((e as Error).message); }
    finally { lock.current = false; if (liveRef.current) setBusy(false); }
  };
  const pay = async (event: FormEvent) => {
    event.preventDefault();
    if (!stripe.current || !elements.current || !cardReady || lock.current || !order) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await stripe.current.confirmPayment({ elements: elements.current, confirmParams: { return_url: `${location.origin}${location.pathname}?fiscal_order=${encodeURIComponent(order.id)}`, payment_method_data: { billing_details: { name: holder.trim(), email: company.contactEmail } } }, redirect: 'if_required' });
      if (!liveRef.current) return;
      if (result.error) { setError(result.error.message || 'Pagamento não aprovado. Confira os dados ou use outro cartão.'); return; }
      setStep('confirming');
    } catch { if (liveRef.current) setError('Não foi possível confirmar o pagamento. Confira o status antes de tentar novamente.'); }
    finally { lock.current = false; if (liveRef.current) setBusy(false); }
  };
  const input = (key: keyof FiscalCompanyInput, label: string, options: { type?: string; placeholder?: string; required?: boolean; autoComplete?: string } = {}) => <label className="checkout-field"><span>{t(label)}</span><input value={company[key]} onChange={e => { setCompany(c => ({ ...c, [key]: e.target.value })); requestKey.current = crypto.randomUUID(); }} disabled={busy} required={options.required !== false} maxLength={key === 'cnpj' ? 30 : key === 'contactPhone' ? 30 : 180} {...options} placeholder={t(options.placeholder || '')} /></label>;
  const changeTerm = (months: FiscalTermMonths) => {
    setTermMonths(months); setAccepted(false); setOrder(null); setSession(null); setError(''); requestKey.current = crypto.randomUUID();
  };
  const backToDetails = () => {
    setStep('details'); setOrder(null); setSession(null); setError(''); requestKey.current = crypto.randomUUID();
    if (currentUser) rememberOrder(currentUser.id, null);
  };
  const displayedTotal = step === 'details' ? quote.amount : order?.amount ?? quote.amount;
  const close = () => { if (!busy) onClose(); };

  return <Dialog titleId="fiscal-checkout-title" onClose={close} className="checkout-wide">
    <header className="checkout-heading"><div className="checkout-brand"><img src="/logo.png" alt="MVA" /><span>{t('Contratação de endereço')}</span></div><button type="button" className="checkout-close" disabled={busy} onClick={close} aria-label={t('Fechar')}><X size={20} /></button></header>
    <div className="checkout-layout">
      <aside className="checkout-summary">
        <span className="checkout-kicker">{t('SEU PRÓXIMO PASSO')}</span>
        <h2 id="fiscal-checkout-title">{t('Um endereço à altura da sua empresa.')}</h2>
        <p>{t('Estrutura profissional, contratação simples e tudo em um só lugar.')}</p>
        <div className="checkout-product"><div className="checkout-product-icon"><Building2 size={23} /></div><div><span>{t('Plano selecionado')}</span><h3>{t(plan.name)}</h3></div></div>
        <div className="checkout-location"><MapPin size={18} /><p>{HEADQUARTERS}</p></div>
        <dl className="checkout-prices"><div><dt>{t('Vigência')}</dt><dd>{t(termMonths === 1 ? '1 mês' : '12 meses')}</dd></div><div><dt>{t(termMonths === 1 ? 'Plano de 1 mês' : 'Plano de 12 meses')}</dt><dd>{money(quote.fullAmount, language)}</dd></div>{quote.discount > 0 && <div className="checkout-discount"><dt>{t('Portabilidade · 4 meses grátis')}</dt><dd>− {money(quote.discount, language)}</dd></div>}<div className="checkout-total"><dt>{t('Total a pagar')}</dt><dd>{money(displayedTotal, language)}</dd></div></dl>
        <p className="checkout-billing-note">{t(termMonths === 1 ? 'Pagamento único de 1 mês, à vista no cartão. Sem renovação automática.' : 'Pagamento único de 12 meses, à vista no cartão. Sem renovação automática.')}</p>
        <ul className="checkout-benefits"><li><Check size={16} />{t('Recepção e gestão de correspondências')}</li><li><Check size={16} />{t('Endereço comercial profissional')}</li><li><Check size={16} />{t(plan.fiscal ? 'Declaração após confirmação do pagamento' : 'Uso comercial do endereço')}</li></ul>
        <div className="checkout-security"><LockKeyhole size={16} /><span>{t('Dados do cartão protegidos pelo provedor de pagamento.')}</span></div>
      </aside>
      <section className="checkout-content">
        <ol className="checkout-steps" aria-label={t('Etapas da contratação')}>{['Empresa', 'Pagamento', 'Confirmação'].map((label, i) => <li key={label} aria-current={(step === 'details' ? 0 : step === 'card' ? 1 : 2) === i ? 'step' : undefined}><span>{i + 1}</span>{t(label)}</li>)}</ol>
        {step === 'details' && <form onSubmit={begin} className="checkout-form">
          <div className="checkout-section-title"><span className="checkout-icon"><Building2 size={20} /></span><div><h3>{t('Vamos conhecer sua empresa')}</h3><p>{t('Esses dados serão usados no contrato e na declaração.')}</p></div></div>
          <fieldset className="checkout-period" disabled={busy}>
            <legend>{t('Período de contratação')}</legend>
            <div className="checkout-period-options">
              {([1, 12] as const).map(months => <label key={months} className={termMonths === months ? 'is-selected' : ''}>
                <input type="radio" name="fiscal-term" value={months} checked={termMonths === months} onChange={() => changeTerm(months)} />
                <span className="checkout-period-heading"><strong>{t(months === 1 ? '1 mês' : '12 meses')}</strong><span className="checkout-period-dot" aria-hidden="true" /></span>
                <span className="checkout-period-price">{money(quotePlan(plan, months, isTransfer).amount, language)}</span>
                <small>{t(months === 1 ? 'Pagamento de um mês' : isTransfer ? 'Pague 8 e use 12 meses' : '4 meses grátis na transferência')}</small>
              </label>)}
            </div>
          </fieldset>
          {input('companyName', 'Razão social', { autoComplete: 'organization', placeholder: 'Nome registrado da empresa' })}
          {input('tradingName', 'Nome fantasia (opcional)', { required: false })}
          <div className="checkout-field-row">{input('cnpj', 'CNPJ', { placeholder: '00.000.000/0001-00 ou Em abertura' })}{input('contactPhone', 'Telefone / WhatsApp', { type: 'tel', autoComplete: 'tel', placeholder: '(79) 99999-9999' })}</div>
          {input('contactEmail', 'E-mail de contato', { type: 'email', autoComplete: 'email', placeholder: 'contato@empresa.com.br' })}
          <label className="checkout-check"><input type="checkbox" disabled={busy} checked={isTransfer} onChange={e => { setTransfer(e.target.checked); setAccepted(false); setOrder(null); setSession(null); requestKey.current = crypto.randomUUID(); }} /><span><strong>{t('Já tenho endereço fiscal e quero transferir')}</strong><small>{t(termMonths === 12 ? '4 meses grátis no plano de 12 meses. Informe seu endereço atual.' : 'No plano de 1 mês, a transferência não recebe os 4 meses grátis.')}</small></span></label>
          {isTransfer && <label className="checkout-field"><span>{t('Coworking ou endereço atual')}</span><input disabled={busy} required minLength={3} maxLength={240} value={previousAddress} onChange={e => { setPreviousAddress(e.target.value); requestKey.current = crypto.randomUUID(); }} /></label>}
          <label className="checkout-check"><input type="checkbox" disabled={busy} required checked={accepted} onChange={e => setAccepted(e.target.checked)} /><span>{t(termMonths === 1 ? 'Confirmo meus dados e aceito contratar 1 mês pelo valor total exibido. O uso do endereço e a declaração dependem do pagamento confirmado.' : 'Confirmo meus dados e aceito contratar 12 meses pelo valor total exibido. O uso do endereço e a declaração dependem do pagamento confirmado.')}</span></label>
          {!paymentConfigured && <div className="checkout-notice" role="status"><Info size={18} /><div><strong>{t('Pagamentos disponíveis em breve')}</strong><p>{t('Você já pode conhecer o fluxo de contratação. Os campos de cartão serão liberados quando o pagamento seguro estiver disponível.')}</p></div></div>}
          {error && <p role="alert" className="checkout-error">{t(error)}</p>}
          {!currentUser ? <button type="button" className="action-primary checkout-submit" onClick={() => { setAuthModalTab('login'); setAuthModalOpen(true); }}>{t('Entrar para continuar')}<ArrowRight size={17} /></button> : <button className="action-primary checkout-submit" disabled={busy || !paymentConfigured}>{busy ? <LoaderCircle className="animate-spin" size={18} /> : <LockKeyhole size={17} />}{t(busy ? 'Preparando pagamento…' : 'Continuar para pagamento')}<ArrowRight size={17} /></button>}
          {!paymentConfigured && <div className="checkout-card-preview" aria-label={t('Prévia do pagamento com cartão')}><div className="checkout-section-title"><CreditCard size={20} /><h3>{t('Pagamento com cartão')}</h3></div><AnimatedPaymentCard demo /><label className="checkout-field"><span>{t('Número do cartão')}</span><input disabled placeholder="•••• •••• •••• ••••" /></label><div className="checkout-field-row"><label className="checkout-field"><span>{t('Validade')}</span><input disabled placeholder="MM / AA" /></label><label className="checkout-field"><span>CVC</span><input disabled placeholder="•••" /></label></div><small>{t('Prévia visual. Nenhum dado de cartão é coletado nesta etapa.')}</small></div>}
        </form>}
        {step === 'card' && <form onSubmit={pay} className="checkout-form">
          <div className="checkout-section-title"><span className="checkout-icon"><CreditCard size={21} /></span><div><h3>{t('Pagamento com cartão')}</h3><p>{t('Preencha os dados nos campos seguros abaixo.')}</p></div></div>
          {!order?.livemode && <div className="checkout-notice"><Info size={18} /><span>{t('Ambiente de teste: não há cobrança real nem liberação de endereço fiscal.')}</span></div>}
          <div className="checkout-contact"><span>{t('Empresa')}</span><strong>{company.companyName}</strong><small>{company.contactEmail}</small></div>
          <AnimatedPaymentCard holder={holder} brands={cardBrands} identifying={identifyingCard} />
          <label className="checkout-field"><span>{t('Nome do titular do cartão')}</span><input disabled={busy} required autoComplete="cc-name" maxLength={180} value={holder} onChange={e => setHolder(e.target.value)} /></label>
          {initializing && <p className="checkout-loading" role="status"><LoaderCircle className="animate-spin" size={19} />{t('Carregando campos seguros…')}</p>}
          <div ref={mount} className="secure-card-fields" />
          {error && <p role="alert" className="checkout-error">{t(error)}</p>}
          <button disabled={busy || !cardReady} className="action-primary checkout-submit">{busy ? <LoaderCircle className="animate-spin" size={18} /> : <LockKeyhole size={18} />}{t(busy ? 'Confirmando pagamento…' : 'Pagar com segurança')} {!busy && money(displayedTotal, language)}</button>
          <p className="checkout-fineprint"><ShieldCheck size={15} />{t('A MVA não armazena o número do cartão nem o código de segurança.')}</p>
          <button type="button" className="checkout-link" disabled={busy} onClick={backToDetails}><ArrowLeft size={16} />{t('Voltar aos dados da empresa')}</button>
        </form>}
        {step === 'confirming' && <div className="checkout-result" role="status" aria-live="polite"><div className="checkout-result-icon"><Clock3 size={32} /></div><h3>{t('Confirmando seu pagamento')}</h3><p>{t('Estamos aguardando a confirmação do pagamento. Sua declaração será liberada somente após a aprovação.')}</p><div className="checkout-notice"><FileCheck2 size={21} /><span>{t('Você pode fechar esta tela. O status será consultado novamente ao retornar.')}</span></div>{error && <p className="checkout-error" role="alert">{t(error)}</p>}{waiting ? <button type="button" className="action-primary checkout-submit" onClick={() => { setError(''); setPollAgain(n => n + 1); }}>{t('Verificar pagamento novamente')}</button> : <LoaderCircle className="animate-spin mx-auto" size={24} />}<button type="button" className="checkout-link" onClick={close}>{t('Voltar ao site')}</button></div>}
        {step === 'paid' && <div className="checkout-result" role="status"><div className="checkout-result-icon is-success"><CheckCircle2 size={34} /></div><span className="checkout-kicker">{t('TUDO CERTO')}</span><h3>{t(order?.livemode ? 'Pagamento confirmado!' : 'Pagamento de teste confirmado')}</h3><p>{t(!order?.livemode ? 'Este teste não libera o endereço fiscal ou a emissão de uma declaração oficial.' : plan.fiscal ? 'Seu endereço fiscal está ativo. Você já pode gerar sua declaração oficial na área de endereço fiscal.' : 'Seu endereço comercial está ativo. Este plano não inclui domicílio fiscal para o CNPJ.')}</p><button type="button" className="action-primary checkout-submit" onClick={close}>{t('Ir para meu endereço')}<ArrowRight size={17} /></button></div>}
        {step === 'closed' && <div className="checkout-result"><div className="checkout-result-icon"><Info size={32} /></div><h3>{t('Pagamento não disponível')}</h3><p>{t('Este pagamento foi cancelado, estornado ou está em contestação. Nenhuma declaração pode ser emitida por este pedido.')}</p><button type="button" className="action-primary checkout-submit" onClick={close}>{t('Voltar ao site')}</button></div>}
      </section>
    </div>
  </Dialog>;
}
