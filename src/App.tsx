import { t } from './lib/preferences';
import { lazy, Suspense, useEffect, useRef } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useCoworking } from './context/CoworkingContext'
import { finishGoogleCalendarConnection, pendingCalendarConnection } from './lib/google-calendar'
import { isAdmin } from './lib/auth'
import { BOOKING_EXTERNAL_INTEGRATIONS_ENABLED } from './config/integrations'
import { Navbar } from './components/common/Navbar'
import { AdminBookingBadge } from './components/admin/AdminBookingBadge'
import { Footer } from './components/common/Footer'
import { ToastContainer } from './components/common/ToastContainer'
import { AuthModal } from './components/auth/AuthModal'
import { HomeView } from './components/home/HomeView'
import { FiscalVerificationView } from './components/fiscal/FiscalVerificationView'
import { CookieBanner } from './components/common/CookieBanner';
import { StripeReturnNotice } from './components/payments/StripeReturnNotice';

// Public service areas and management screens are loaded when opened to keep the homepage fast.
const MarketplaceView = lazy(() => import('./components/marketplace/MarketplaceView').then(m => ({ default: m.MarketplaceView })))
const FiscalView = lazy(() => import('./components/fiscal/FiscalView').then(m => ({ default: m.FiscalView })))
const FiscalStatusView = lazy(() => import('./components/fiscal/FiscalStatusView').then(m => ({ default: m.FiscalStatusView })))
const LegalPage = lazy(() => import('./components/legal/LegalPage').then(m => ({ default: m.LegalPage })))
const CorrespondenceView = lazy(() => import('./components/correspondence/CorrespondenceView').then(m => ({ default: m.CorrespondenceView })))
const OwnerDashboardView = lazy(() => import('./components/owner/OwnerDashboardView').then(m => ({ default: m.OwnerDashboardView })))
const ClientDashboardView = lazy(() => import('./components/dashboard/ClientDashboardView').then(m => ({ default: m.ClientDashboardView })))
const InternRoomsView = lazy(() => import('./components/intern/InternRoomsView').then(m => ({ default: m.InternRoomsView })))
const AdminDashboardView = lazy(() => import('./components/admin/AdminDashboardView').then(m => ({ default: m.AdminDashboardView })))

const PRIVATE = ['fiscal-status','owner-dashboard', 'client-dashboard', 'correspondence', 'admin', 'intern-rooms']

import { usePreferences } from './lib/preferences';

export default function App() {
  usePreferences();
  const { ready, activeTab, setActiveTab, currentUser, internAuthorized, setAuthModalOpen, setAuthModalTab, spaces, bookings, showToast } = useCoworking()
  const calendarProcessing = useRef(false)
  const pending = spaces.filter(s => s.approval === 'pendente').length
  const admin = isAdmin(currentUser)
  const blocked = ready && PRIVATE.includes(activeTab) && (!currentUser || (activeTab === 'admin' && !admin) || (activeTab === 'intern-rooms' && !internAuthorized))

  useEffect(() => {
    if (blocked) {
      setActiveTab('home')
      if (!currentUser) { setAuthModalTab('login'); setAuthModalOpen(true) }
    }
    window.scrollTo({ top: 0 })
  }, [activeTab, blocked, currentUser, setActiveTab, setAuthModalOpen, setAuthModalTab])

  // Após a autorização do Google, exporta a reserva que originou o pedido.
  // O formulário OAuth sempre retorna ao mesmo domínio; nenhuma senha é armazenada.
  useEffect(() => {
    if (!BOOKING_EXTERNAL_INTEGRATIONS_ENABLED || !ready || !currentUser || calendarProcessing.current) return
    const pending = pendingCalendarConnection()
    if (!pending) return
    if (pending.bookingId && !bookings.some(b => b.id === pending.bookingId)) return
    calendarProcessing.current = true
    void finishGoogleCalendarConnection(currentUser, bookings, spaces).then(result => {
      if (result.kind === 'wrong-account') {
        showToast('A conta Google selecionada é diferente da conta que fez a reserva. Conecte com o mesmo e-mail.', 'error')
      } else if (result.kind === 'no-token') {
        showToast('O Google não enviou a autorização para salvar eventos. Confira as permissões da Agenda.', 'error')
      } else if (result.kind === 'partial') {
        showToast('Alguns eventos não foram salvos no Google Agenda. Você pode adicioná-los em Minhas reservas.', 'info')
      } else if (result.kind === 'connected') {
        showToast(result.saved ? 'Reserva adicionada ao Google Agenda com lembretes!' : 'Google Agenda conectado para suas próximas reservas.', 'success')
      }
      if (result.kind !== 'none') setActiveTab('client-dashboard')
    }).finally(() => { calendarProcessing.current = false })
  }, [ready, currentUser, bookings, spaces, showToast, setActiveTab])

  // Public service pages have shareable links and distinctive metadata.
  // The SPA still needs prerendered HTML to obtain full per-page SEO coverage.
  useEffect(() => {
    const publicPage = ['home', 'marketplace', 'fiscal', 'legal'].includes(activeTab);
    const page = publicPage ? activeTab : 'home';
    const entries: Record<string, [string,string]> = {
      home: ['MVA Coworking | Salas, endereço fiscal e espaços para anunciar','Conheça a MVA Coworking em Aracaju: encontre salas, consulte planos de endereço fiscal e cadastre seu espaço.'],
      marketplace: ['Salas de reunião em Aracaju | MVA Coworking','Encontre ambientes para reunião, atendimento e trabalho. Compare fotos, valores e disponibilidade de salas na MVA e parceiros.'],
      fiscal: ['Endereço fiscal e escritório virtual em Aracaju | MVA Coworking','Conheça os planos de endereço fiscal e comercial, documentação, correspondências e condições de elegibilidade na MVA.'],
      legal: ['Termos e privacidade | MVA Coworking','Consulte as regras de uso, privacidade e proteção de dados da MVA Coworking.'],
    };
    const [title,description] = entries[page];
    document.title = title;
    const update = (selector: string, value: string) => document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content',value);
    update('meta[name="description"]',description);
    update('meta[property="og:title"]',title);
    update('meta[property="og:description"]',description);
    update('meta[name="twitter:title"]',title);
    update('meta[name="twitter:description"]',description);
    const url = new URL(window.location.href);
    const preserveCallback = ['fiscal_order','verify_fiscal','code','access_token'].some(key => url.searchParams.has(key)) || !!url.hash.match(/access_token|refresh_token/);
    if (!preserveCallback) {
      if (activeTab === 'home') url.searchParams.delete('page');
      else url.searchParams.set('page',activeTab);
      const nextUrl = url.pathname + url.search + url.hash;
      if (nextUrl !== window.location.pathname + window.location.search + window.location.hash) {
        window.history.replaceState(window.history.state, '', nextUrl);
      }
    }
    const canonicalUrl = new URL(window.location.origin + '/');
    if (page !== 'home') canonicalUrl.searchParams.set('page',page);
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href',canonicalUrl.href);
    update('meta[property="og:url"]',canonicalUrl.href);
    document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.setAttribute('content', publicPage ? 'index, follow' : 'noindex, nofollow');
  }, [activeTab]);

  const verificationCode = new URLSearchParams(window.location.search).get('verify_fiscal');

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center bg-navy-950" role="status" aria-label={t("Carregando")}>
        <img src="/logo.png" alt={t("MVA")} className="h-10 w-auto animate-pulse" />
      </div>
    );
  }

  if (verificationCode !== null) {
    return <FiscalVerificationView code={verificationCode} />;
  }

  return (
    <div className="flex min-h-dvh w-full min-w-0 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <a href="#conteudo" className="skip-link">{t("Pular para o conteúdo ")}</a>
      <Navbar />
      {admin && (
        <div className="border-b border-navy-200 bg-white">
          <div className="mx-auto flex w-full min-w-0 max-w-7xl justify-end px-4 py-1.5 sm:px-8">
            <button onClick={() => setActiveTab('admin')} className="inline-flex max-w-full flex-wrap items-center justify-end gap-1.5 text-right text-xs font-semibold text-navy-700 hover:text-orange-600">
              <ShieldCheck className="h-4 w-4" aria-hidden />{t("Painel administrativo MVA ")}<AdminBookingBadge />{pending > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{t(pending)}{t("p/ aprovar")}</span>}
            </button>
          </div>
        </div>
      )}
      <main id="conteudo" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-3 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <StripeReturnNotice />
        <Suspense fallback={<div className="grid min-h-[50vh] place-items-center text-sm text-navy-600" role="status">{t("Carregando seu painel… ")}</div>}>
        {activeTab === 'home' && <HomeView />}
        {activeTab === 'marketplace' && <MarketplaceView />}
        {activeTab === 'fiscal' && <FiscalView />}
        {!blocked && activeTab === 'fiscal-status' && <FiscalStatusView />}
        {!blocked && activeTab === 'correspondence' && <CorrespondenceView />}
        {!blocked && activeTab === 'owner-dashboard' && <OwnerDashboardView />}
        {!blocked && activeTab === 'client-dashboard' && <ClientDashboardView />}
        {!blocked && activeTab === 'admin' && <AdminDashboardView />}
        {!blocked && activeTab === 'intern-rooms' && <InternRoomsView />}
  {activeTab === 'legal' && <LegalPage />}
        </Suspense>
      </main>
      <Footer />
      <AuthModal />
      <ToastContainer />
      <CookieBanner />
    </div>
  )
}
