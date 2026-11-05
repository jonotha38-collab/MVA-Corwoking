import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, X } from 'lucide-react';
import { useCoworking } from '../../context/CoworkingContext';
import { supabase } from '../../lib/supabase';

type State = 'checking' | 'paid' | 'test' | 'pending' | 'canceled' | 'connect' | 'error';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RETRIES = 12;
const INTERVAL_MS = 2500;

export function StripeReturnNotice() {
  const { currentUser, activeTab } = useCoworking();
  const [params] = useState(() => {
    const search = new URLSearchParams(window.location.search);
    return { returnType: search.get('stripe_checkout'), order: search.get('stripe_order') };
  });
  const [visible, setVisible] = useState(Boolean(params.returnType));
  const [state, setState] = useState<State>(params.returnType === 'canceled' ? 'canceled'
    : params.returnType?.startsWith('connect') ? 'connect' : 'checking');

  // The browser redirect is never proof of payment. Poll only the authenticated
  // customer's database records, which are updated by the verified Stripe webhook.
  // Stop after a bounded interval rather than claiming a payment was successful.
  useEffect(() => {
    if (!visible || !params.returnType || params.returnType === 'canceled' || params.returnType.startsWith('connect')) return;
    if (!currentUser) { setState('pending'); return; }
    let cancelled = false;
    let handle: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const check = async () => {
      try {
        let paid = false;
        let livemode = false;
        let terminal = false;
        if (params.order && UUID.test(params.order)) {
          const { data, error } = await supabase.from('mva_checkout_orders').select('status,livemode')
            .eq('id', params.order).eq('user_id', currentUser.id).maybeSingle();
          if (error) throw error;
          paid = data?.status === 'paid';
          livemode = data?.livemode === true;
          terminal = ['refunded', 'disputed', 'expired', 'canceled'].includes(data?.status || '');
        } else if (activeTab === 'owner-dashboard' && !params.order) {
          const { data, error } = await supabase.from('mva_owner_subscriptions').select('status,livemode')
            .eq('owner_id', currentUser.id).maybeSingle();
          if (error) throw error;
          paid = data?.status === 'active';
          livemode = data?.livemode === true;
          terminal = ['canceled', 'incomplete_expired', 'unpaid'].includes(data?.status || '');
        } else {
          if (!cancelled) setState('pending');
          return;
        }
        if (cancelled) return;
        if (paid) { setState(livemode ? 'paid' : 'test'); return; }
        if (terminal) { setState('pending'); return; }
        if (++attempts >= RETRIES) { setState('pending'); return; }
        setState('checking');
        handle = setTimeout(() => { void check(); }, INTERVAL_MS);
      } catch {
        if (!cancelled) setState('error');
      }
    };
    void check();
    return () => { cancelled = true; if (handle) clearTimeout(handle); };
  }, [visible, params.returnType, params.order, currentUser?.id, activeTab]);

  const dismiss = () => {
    setVisible(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('stripe_checkout');
    url.searchParams.delete('stripe_order');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  };
  if (!visible) return null;
  const success = state === 'paid';
  const messages: Record<State, [string, string]> = {
    checking: ['Verificando pagamento', 'Aguardando a confirmação segura do Stripe. A liberação não depende do redirecionamento do navegador.'],
    paid: ['Pagamento real confirmado', 'O pagamento foi registrado. A prestação do serviço ainda depende das aprovações e condições contratuais aplicáveis.'],
    test: ['Pagamento de teste confirmado', 'Nenhum dinheiro real foi cobrado e nenhum serviço foi liberado por este pagamento de teste.'],
    pending: ['Pagamento ainda não confirmado', 'Confira seu painel para consultar a situação atual. Nenhuma liberação ocorrerá sem confirmação do Stripe.'],
    canceled: ['Checkout interrompido', 'Você voltou da tela do Stripe. Nenhum novo pagamento foi confirmado nesta etapa.'],
    connect: ['Cadastro Stripe em avaliação', 'Confira no painel do proprietário quando a conta estiver habilitada para cobranças e repasses.'],
    error: ['Não foi possível consultar a confirmação', 'Atualize seu painel ou tente novamente mais tarde. A emissão permanece protegida até o pagamento ser confirmado.'],
  };
  const [title, description] = messages[state];
  return <div role="status" className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 shadow-sm sm:p-5 ${success ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
    {success ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /> :
      state === 'checking' ? <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" /> :
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />}
    <div className="min-w-0 flex-1">
      <p className={`text-sm font-bold ${success ? 'text-emerald-900' : 'text-amber-900'}`}>{title}</p>
      <p className={`mt-1 text-xs leading-relaxed ${success ? 'text-emerald-800' : 'text-amber-800'}`}>{description}</p>
    </div>
    <button type="button" onClick={dismiss} aria-label="Dispensar aviso do Stripe" className="shrink-0 rounded-lg p-2 text-slate-600 hover:bg-black/5"><X className="h-4 w-4" /></button>
  </div>;
}
