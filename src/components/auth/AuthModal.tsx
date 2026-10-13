import React, { useState } from 'react';
import { X, Building2, User, AlertCircle, MailCheck } from 'lucide-react';
import { useCoworking } from '../../context/CoworkingContext';
import { signInEmail, signInGoogle, signUpEmail } from '../../lib/auth';
import { BlurReveal } from '../ui/BlurReveal';
import { TypewriterText } from '../ui/TypewriterText';
import { LabelInput } from '../ui/LabelInput';

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

  return (
    <div 
      role="dialog" 
      aria-modal="true" 
      aria-label={register ? 'Criar conta' : 'Entrar'} 
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy-950/70 backdrop-blur-sm cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[370px] overflow-hidden animate-scaleUp border border-slate-100 cursor-default"
      >
        {/* Header Compacto */}
        <div className="bg-white text-slate-900 p-5 pb-3 relative border-b border-slate-100">
          <button 
            onClick={close} 
            aria-label="Fechar" 
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 hover:bg-slate-200 rounded-full p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <img src="/logo-orange.png" alt="MVA" className="h-6 w-auto" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
              Coworking Hub
            </span>
          </div>

          <h2 className="text-lg font-extrabold tracking-tight text-navy-900 min-h-[1.75rem]">
            <BlurReveal
              key={register ? 'register-title' : 'login-title'}
              text={register ? 'Crie sua conta' : 'Acesse sua conta'}
              stagger={35}
              duration={380}
            />
          </h2>
          <p className="text-[11px] text-slate-500 min-h-[2rem]">
            <TypewriterText
              key={register ? 'register-sub' : 'login-sub'}
              text={register
                ? 'Cadastre-se para reservar salas e gerenciar espaços.'
                : 'Entre para gerenciar suas reservas e endereços.'}
              speed={28}
              delay={200}
              cursor={true}
            />
          </p>

          {/* Abas Entrar / Criar Conta */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg mt-3 border border-slate-200">
            <button 
              onClick={() => switchTab('login')} 
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${!register ? 'bg-navy-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => switchTab('register')} 
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${register ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Criar conta
            </button>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 pt-3 space-y-2.5">
          {register && (
            <div className="grid grid-cols-2 gap-1.5">
              {([['coworking_owner', Building2, 'Tenho coworking'], ['client', User, 'Quero reservar']] as const).map(([v, Icon, label]) => (
                <button 
                  key={v} 
                  type="button" 
                  onClick={() => setType(v)} 
                  className={`p-2 rounded-lg border text-left text-[11px] font-medium transition-all flex items-center gap-1.5 ${type === v ? 'border-orange-500 bg-orange-50 font-bold text-orange-950' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${type === v ? 'text-orange-600' : 'text-slate-400'}`} />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Botão Google */}
          <button 
            type="button" 
            onClick={google} 
            disabled={!lgpd} 
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40 transition-all shadow-2xs"
          >
            <GoogleLogo />
            <span>Continuar com o Google</span>
          </button>

          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            <span className="h-px flex-1 bg-slate-200" />
            ou com e-mail
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          {info ? (
            <p role="status" className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-100">
              <MailCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{info}</span>
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-2">
              {register && (
                <LabelInput
                  name="name"
                  required
                  label="Nome completo"
                  autoComplete="name"
                  aria-label="Nome completo"
                />
              )}
              {register && type === 'coworking_owner' && (
                <LabelInput
                  name="brand"
                  label="Nome do seu coworking (opcional)"
                  aria-label="Nome do coworking"
                />
              )}
              <LabelInput
                name="email"
                type="email"
                required
                label="E-mail"
                autoComplete="email"
                aria-label="E-mail"
              />
              <LabelInput
                name="password"
                type="password"
                required
                label="Senha"
                autoComplete={register ? 'new-password' : 'current-password'}
                aria-label="Senha"
              />

              {error && (
                <p role="alert" className="flex items-start gap-1.5 text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </p>
              )}

              {/* Termo LGPD Compacto */}
              <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-[10px] leading-tight transition-colors ${lgpd ? 'border-orange-400 bg-orange-50/70 text-orange-950' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                <input 
                  type="checkbox" 
                  checked={lgpd} 
                  onChange={e => { setLgpd(e.target.checked); if (e.target.checked) setError(''); }} 
                  aria-required="true" 
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-orange-500 rounded" 
                />
                <span>
                  Concordo com os termos da <strong>LGPD</strong> e autorizo o tratamento dos dados pela MVA Coworking.
                </span>
              </label>

              <button 
                disabled={loading || !lgpd} 
                className="w-full rounded-lg bg-orange-500 hover:bg-orange-600 py-2.5 text-xs font-bold text-white shadow-xs disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 mt-1"
              >
                {loading ? 'Aguarde...' : register ? 'Criar conta' : 'Entrar'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
