import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CreditCard, LoaderCircle, RotateCw, ShieldCheck, Wifi } from 'lucide-react';
import { t } from '../../lib/preferences';
import { CARD_BRANDS, type CardBrand } from '../../lib/card-presentation';

function BrandMark({ brand }: { brand: CardBrand }) {
  if (brand === 'mastercard') return <svg viewBox="0 0 62 40" width="58" height="37" role="img" aria-label="Mastercard"><circle cx="23" cy="20" r="17" fill="#eb001b" /><circle cx="41" cy="20" r="17" fill="#f79e1b" /><path d="M32 5.58a17 17 0 0 1 0 28.84 17 17 0 0 1 0-28.84Z" fill="#ff5f00" /></svg>;
  if (brand === 'visa') return <span className="card-wordmark is-visa" aria-label="Visa">VISA</span>;
  if (brand === 'amex') return <span className="card-wordmark is-amex" aria-label="American Express">AMERICAN<br />EXPRESS</span>;
  return <span className="card-wordmark is-other">{CARD_BRANDS[brand]}</span>;
}
function Chip() {
  return <svg width="44" height="34" viewBox="0 0 44 34" fill="none" aria-hidden="true"><rect x="1" y="1" width="42" height="32" rx="7" fill="url(#mva-chip)" stroke="#ddc89f" /><path d="M16 1v9L10 17l6 7v9M28 1v9l6 7-6 7v9M1 11h15m12 0h15M1 23h15m12 0h15M16 10h12v14H16z" stroke="#80683f" strokeOpacity=".65" /><defs><linearGradient id="mva-chip" x1="1" y1="1" x2="44" y2="34" gradientUnits="userSpaceOnUse"><stop stopColor="#eadac0" /><stop offset=".5" stopColor="#c2a677" /><stop offset="1" stopColor="#e5d4b4" /></linearGradient></defs></svg>;
}

export function AnimatedPaymentCard({ holder = '', brands = [], identifying = false, demo = false }: { holder?: string; brands?: CardBrand[]; identifying?: boolean; demo?: boolean }) {
  const reduced = useReducedMotion();
  const [back, setBack] = useState(false);
  const [example, setExample] = useState<CardBrand>('visa');
  const shown = demo ? [example] : brands;
  const key = identifying ? 'loading' : shown.join('|') || 'unknown';
  const marks = <motion.div key={key} className="payment-card-brand" initial={reduced ? false : { opacity: 0, y: 5, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduced ? 0 : .18 }}>{identifying ? <LoaderCircle size={21} className="animate-spin" aria-hidden="true" /> : shown.length ? shown.map(brand => <BrandMark key={brand} brand={brand} />) : <CreditCard size={30} aria-hidden="true" />}</motion.div>;
  const status = demo ? t('Exemplo visual') : identifying ? t('Identificando bandeira…') : shown.length ? `${t(shown.length > 1 ? 'Bandeiras identificadas' : 'Bandeira identificada')}: ${shown.map(b => CARD_BRANDS[b]).join(' / ')}` : t('A bandeira aparece ao preencher o cartão');
  return <div className="animated-card-section" data-testid="animated-payment-card" data-card-brand={shown.join(',') || 'unknown'}>
    <div className="payment-card-caption"><span>{t(demo ? 'PRÉVIA DO CARTÃO' : 'SEU CARTÃO')}</span><span><ShieldCheck size={13} aria-hidden="true" />{t(demo ? 'Exemplo visual' : 'Campos seguros')}</span></div>
    <div className="payment-card-perspective">
      <motion.div className="payment-card-rotator" animate={{ rotateY: back ? 180 : 0 }} transition={{ duration: reduced ? 0 : .5, ease: [.22, 1, .36, 1] }}>
        <div className="payment-card-face payment-card-front" aria-hidden={back}>
          <div className="payment-card-orbit" aria-hidden="true" />
          <div className="payment-card-top"><span className="payment-card-platform">MVA <span>/</span></span>{marks}</div>
          <div className="payment-card-chip"><Chip /><Wifi size={24} aria-hidden="true" /></div>
          <div className="payment-card-number" aria-label={t('Número protegido')}>•••• <span>••••</span> <span>••••</span> ••••</div>
          <div className="payment-card-bottom"><div><small>{t('TITULAR DO CARTÃO')}</small><span className="payment-card-holder">{holder.trim() || t('SEU NOME')}</span></div><div className="payment-card-validity"><small>{t('VALIDADE')}</small><span>•• / ••</span></div></div>
        </div>
        <div className="payment-card-face payment-card-back" aria-hidden={!back}>
          <div className="payment-card-stripe" aria-hidden="true" />
          <div className="payment-card-back-content"><div className="payment-card-signature"><span>{holder.trim() || t('SEU NOME')}</span><strong>•••</strong></div><p><ShieldCheck size={15} aria-hidden="true" />{t('O código de segurança fica somente nos campos da Stripe.')}</p><span className="payment-card-platform">MVA <span>/</span></span></div>
        </div>
      </motion.div>
    </div>
    <div className="payment-card-status"><p role="status" aria-live="polite" aria-atomic="true">{status}</p><button type="button" onClick={() => setBack(value => !value)} aria-pressed={back} aria-label={t(back ? 'Ver frente do cartão' : 'Ver verso do cartão')}><RotateCw size={14} aria-hidden="true" /><span>{t(back ? 'Frente' : 'Verso')}</span></button></div>
    {demo && <><div className="payment-card-examples" role="group" aria-label={t('Exemplos de bandeiras')}>{(['visa', 'mastercard', 'amex'] as const).map(brand => <button type="button" key={brand} aria-pressed={example === brand} onClick={() => setExample(brand)}>{brand === 'amex' ? 'Amex' : CARD_BRANDS[brand]}</button>)}</div><p className="payment-card-demo-note">{t('Demonstração visual. No pagamento, a Stripe identifica a bandeira automaticamente.')}</p></>}
  </div>;
}
