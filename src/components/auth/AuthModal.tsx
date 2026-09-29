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
    <div role="dialog" aria-modal="true" aria-label={register ? 'Criar conta' : 'Entrar'} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-navy-950/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleUp">
        <div className="bg-gradient-to-r from-navy-900 to-navy-800 text-white p-8 relative text-center">
          <button onClick={() => setAuthModalOpen(false)} aria-label="Fechar" className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors bg-navy-900/50 p-1.5 rounded-full"><X className="w-5 h-5" /></button>
          <img src="/logo.png" alt="MVA" className="mx-auto mb-4 h-8 w-auto drop-shadow-md" />
          <h2 className="text-2xl font-bold tracking-tight">{register ? 'Crie sua conta' : 'Acesse sua conta'}</h2>
          <p className="text-sm text-slate-300 mt-2">Gestão de espaços, endereço fiscal e reservas</p>
          
          <div className="flex bg-navy-950/50 p-1 rounded-xl mt-6 border border-navy-700/50">
            <button onClick={() => { setAuthModalTab('login'); setError(''); }} className={tab('login')}>Entrar</button>
            <button onClick={() => { setAuthModalTab('register'); setError(''); }} className={tab('register')}>Criar conta</button>
          </div>
        </div>
        <div className="p-8 space-y-6">
          {register && (
            <div className="grid grid-cols-2 gap-3">
              {([['coworking_owner', Building2, 'Dono de Coworking'], ['client', User, 'Quero Reservar']] as const).map(([v, Icon, label]) => (
                <button key={v} type="button" onClick={() => setType(v)} className={`flex flex-col items-center p-3 rounded-xl border text-center text-xs transition-all ${type === v ? 'border-orange-500 bg-orange-50 font-bold text-orange-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>
                  <Icon className={`w-6 h-6 mb-2 ${type === v ? 'text-orange-500' : 'text-slate-400'}`} />{label}
                </button>
              ))}
            </div>
          )}
          
          <div className="flex justify-center">
            {CLIENT_ID ? <div ref={gRef} /> : (
              <p className="w-full rounded-xl bg-slate-100 p-4 text-center text-xs text-slate-600 border border-slate-200">Login com Google indisponível em dev local (configure <code className="font-semibold">VITE_GOOGLE_CLIENT_ID</code>).</p>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-xs font-medium text-slate-400"><span className="h-px flex-1 bg-slate-200" />ou use o e-mail<span className="h-px flex-1 bg-slate-200" /></div>
          
          <form onSubmit={submit} className="space-y-4">
            {register && <input name="name" required placeholder="Seu nome completo" autoComplete="name" aria-label="Nome completo" className={field} />}
            {register && type === 'coworking_owner' && <input name="brand" placeholder="Nome do seu coworking (opcional)" aria-label="Nome do coworking" className={field} />}
            <input name="email" type="email" required placeholder="Seu melhor e-mail" autoComplete="email" aria-label="E-mail" className={field} />
            <input name="password" type="password" required placeholder="Sua senha secreta" autoComplete={register ? 'new-password' : 'current-password'} aria-label="Senha" className={field} />
            {error && <p role="alert" className="flex items-center gap-2 text-xs font-medium text-red-600 bg-red-50 p-3 rounded-lg border border-red-100"><AlertCircle className="w-4 h-4 shrink-0" />{error}</p>}
            <button disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0">{loading ? 'Aguarde um momento...' : register ? 'Criar minha conta' : 'Entrar na plataforma'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};
