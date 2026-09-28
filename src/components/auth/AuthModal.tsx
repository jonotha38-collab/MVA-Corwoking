import React, { useEffect, useRef, useState } from 'react';
import { X, Building2, User, AlertCircle } from 'lucide-react';
import { useCoworking } from '../../context/CoworkingContext';
import { googleAccount, loginAccount, registerAccount } from '../../lib/auth';

type GoogleId = {
  initialize: (o: { client_id: string; callback: (r: { credential: string }) => void }) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
};
declare global {
  interface Window { google?: { accounts: { id: GoogleId } } }
}
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export const AuthModal: React.FC = () => {
  const { authModalOpen, setAuthModalOpen, authModalTab, setAuthModalTab, signIn } = useCoworking();
  const [type, setType] = useState<'coworking_owner' | 'client'>('coworking_owner');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const gRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef(type);
  typeRef.current = type;
  const register = authModalTab === 'register';

  useEffect(() => {
    if (!authModalOpen || !CLIENT_ID) return;
    const init = () => {
      if (!window.google || !gRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: ({ credential }) => {
          try { signIn(googleAccount(credential, typeRef.current)); }
          catch { setError('Não foi possível entrar com o Google. Tente novamente.'); }
        },
      });
      window.google.accounts.id.renderButton(gRef.current, { theme: 'outline', size: 'large', width: 340, text: 'continue_with', locale: 'pt-BR' });
    };
    if (window.google) return init();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = init;
    document.head.appendChild(s);
  }, [authModalOpen, authModalTab, signIn]);

  if (!authModalOpen) return null;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email')), password = String(f.get('password'));
    setError('');
    if (register && password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.');
    setLoading(true);
    try {
      signIn(register
        ? await registerAccount({ name: String(f.get('name')), email, password, accountType: type, brand: String(f.get('brand') || '') })
        : await loginAccount(email, password));
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
          <button onClick={() => setAuthModalOpen(false)} aria-label="Fechar" className="absolute top-5 right-5 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
          <h2 className="text-xl font-bold tracking-tight">{register ? 'Crie sua conta' : 'Acesse sua conta'}</h2>
          <p className="text-xs text-slate-400 mt-1">Anuncie seu coworking, reserve salas e gerencie seu endereço fiscal.</p>
          <div className="flex bg-navy-800/80 p-1 rounded-xl mt-4 border border-navy-700">
            <button onClick={() => { setAuthModalTab('login'); setError(''); }} className={tab('login')}>Entrar</button>
            <button onClick={() => { setAuthModalTab('register'); setError(''); }} className={tab('register')}>Criar conta</button>
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
          <div className="flex justify-center min-h-[44px]">
            {CLIENT_ID ? <div ref={gRef} /> : (
              <p className="w-full rounded-lg bg-slate-100 p-3 text-center text-xs text-slate-600">Login com Google indisponível: defina <code className="font-semibold">VITE_GOOGLE_CLIENT_ID</code>.</p>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400"><span className="h-px flex-1 bg-slate-200" />ou com e-mail<span className="h-px flex-1 bg-slate-200" /></div>
          <form onSubmit={submit} className="space-y-3">
            {register && <input name="name" required placeholder="Nome completo" autoComplete="name" aria-label="Nome completo" className={field} />}
            {register && type === 'coworking_owner' && <input name="brand" placeholder="Nome do seu coworking (opcional)" aria-label="Nome do coworking" className={field} />}
            <input name="email" type="email" required placeholder="E-mail" autoComplete="email" aria-label="E-mail" className={field} />
            <input name="password" type="password" required placeholder="Senha" autoComplete={register ? 'new-password' : 'current-password'} aria-label="Senha" className={field} />
            {error && <p role="alert" className="flex items-start gap-2 text-xs text-red-600"><AlertCircle className="w-4 h-4 shrink-0" />{error}</p>}
            <button disabled={loading} className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50">{loading ? 'Aguarde...' : register ? 'Criar conta' : 'Entrar'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};
