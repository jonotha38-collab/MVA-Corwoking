import React, { useState } from 'react';
import { X, Building2, User, AlertCircle, MailCheck, ShieldCheck } from 'lucide-react';
import { useCoworking } from '../../context/CoworkingContext';
import { signInEmail, signInGoogle, signUpEmail } from '../../lib/auth';

const GoogleLogo = () => (
  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.500 42.600 14.600 48 24 48z" />
  </svg>
);

export const AuthModal: React.FC = () => {
  const { authModalOpen, setAuthModalOpen, authModalTab, setAuthModalTab } = useCoworking();
  const [type, setType] = useState<'coworking_owner' | 'client'>('coworking_owner');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [lgpd, setLgpd] = useState(false);
  const register = authModalTab === 'register';

  if (!authModalOpen) return null;

  const switchTab = (t: 'login' | 'register') => { setAuthModalTab(t); setError(''); setInfo(''); };
  const close = () => { setAuthModalOpen(false); setLgpd(false); setError(''); setInfo(''); };
  const LGPD_MSG = 'Para continuar, confirme que está de acordo com as normas da LGPD.';

  const google = async () => {
    setError('');
    if (!lgpd) return setError(LGPD_MSG);
    try { localStorage.setItem('mva:lgpd-consent', new Date().toISOString()); } catch { /* ignore */ }
    try { await signInGoogle(register ? type : 'client'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Algo deu errado.'); }
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email')), password = String(f.get('password'));
    setError(''); setInfo('');
    if (!lgpd) return setError(LGPD_MSG);
    if (register && password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.');
    setLoading(true);
    try {
      if (register) {
        const { needsConfirmation } = await signUpEmail({ name: String(f.get('name')), email, password, accountType: type, brand: String(f.get('brand') || ''), lgpdConsentAt: new Date().toISOString() });
        if (needsConfirmation) setInfo('Conta criada! Enviamos um link de confirmação para o seu e-mail. Abra-o para entrar.');
      } else {
        await signInEmail(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo deu errado.');
    } finally { setLoading(false); }
  };

  const field = 'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-hidden';
  const tab = (t: 'login' | 'register') =>
    `flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${authModalTab === t ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`;

  return (
    <div role="dialog" aria-modal="true" aria-label={register ? 'Criar conta' : 'Entrar'} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-slate-950/70">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleUp">
        <div className="bg-navy-900 text-white p-6 relative">
          <button onClick={close} aria-label="Fechar" className="absolute top-5 right-5 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
          <img src="/logo.png" alt="MVA" className="mb-3 h-7 w-auto" />
          <h2 className="text-xl font-bold tracking-tight">{register ? 'Crie sua conta' : 'Acesse sua conta'}</h2>
          <p className="text-xs text-slate-400 mt-1">Anuncie seu coworking, reserve salas e gerencie seu endereço fiscal.</p>
          <div className="flex bg-navy-800/80 p-1 rounded-xl mt-4 border border-navy-700">
            <button onClick={() => switchTab('login')} className={tab('login')}>Entrar</button>
            <button onClick={() => switchTab('register')} className={tab('register')}>Criar conta</button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {register && (
            <div className="grid grid-cols-2 gap-2">
              {([['coworking_owner', Building2, 'Tenho um coworking'], ['client', User, 'Quero reservar espaços']] as const).map(([v, Icon, label]) => (
                <button key={v} type="button" onClick={() => setType(v)} className={`p-2.5 rounded-xl border text-left text-xs transition-all ${type === v ? 'border-orange-500 bg-orange-50 font-bold text-orange-950' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <Icon className={`w-4 h-4 mb-1 ${type === v ? 'text-orange-600' : 'text-slate-400'}`} />{label}
                </button>
              ))}
            </div>
          )}
          <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed transition-colors ${lgpd ? 'border-orange-500 bg-orange-50 text-orange-950' : 'border-slate-200 text-slate-600'}`}>
            <input type="checkbox" checked={lgpd} onChange={e => { setLgpd(e.target.checked); if (e.target.checked) setError(''); }} aria-required="true" className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500" />
            <span>
              <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-orange-600" aria-hidden />
              Estou de acordo com as normas da <strong>LGPD</strong> (Lei nº 13.709/2018) e autorizo o tratamento dos meus dados pessoais pela MVA Coworking para acesso e uso da plataforma.
            </span>
          </label>
          <button type="button" onClick={google} disabled={!lgpd} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            <GoogleLogo />Continuar com o Google
          </button>
          <div className="flex items-center gap-3 text-[11px] text-slate-400"><span className="h-px flex-1 bg-slate-200" />ou com e-mail<span className="h-px flex-1 bg-slate-200" /></div>
          {info ? (
            <p role="status" className="flex items-start gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><MailCheck className="w-5 h-5 shrink-0" />{info}</p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              {register && <input name="name" required placeholder="Nome completo" autoComplete="name" aria-label="Nome completo" className={field} />}
              {register && type === 'coworking_owner' && <input name="brand" placeholder="Nome do seu coworking (opcional)" aria-label="Nome do coworking" className={field} />}
              <input name="email" type="email" required placeholder="E-mail" autoComplete="email" aria-label="E-mail" className={field} />
              <input name="password" type="password" required placeholder="Senha" autoComplete={register ? 'new-password' : 'current-password'} aria-label="Senha" className={field} />
              {error && <p role="alert" className="flex items-start gap-2 text-xs text-red-600"><AlertCircle className="w-4 h-4 shrink-0" />{error}</p>}
              <button disabled={loading || !lgpd} className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50">{loading ? 'Aguarde...' : register ? 'Criar conta' : 'Entrar'}</button>
            </form>
          )}
          
        </div>
      </div>
    </div>
  );
};
