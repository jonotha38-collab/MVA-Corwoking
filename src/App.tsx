import { t } from './lib/preferences';
import { lazy, Suspense, useEffect } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useCoworking } from './context/CoworkingContext'
import { isAdmin } from './lib/auth'
import { Navbar } from './components/common/Navbar'
import { Footer } from './components/common/Footer'
import { ToastContainer } from './components/common/ToastContainer'
import { AuthModal } from './components/auth/AuthModal'
import { MarketplaceView } from './components/marketplace/MarketplaceView'
import { FiscalView } from './components/fiscal/FiscalView'
import { LegalPage } from './components/legal/LegalPage';
import { CookieBanner } from './components/common/CookieBanner';

// Management screens are fetched only when opened.
const CorrespondenceView = lazy(() => import('./components/correspondence/CorrespondenceView').then(m => ({ default: m.CorrespondenceView })))
const OwnerDashboardView = lazy(() => import('./components/owner/OwnerDashboardView').then(m => ({ default: m.OwnerDashboardView })))
const ClientDashboardView = lazy(() => import('./components/dashboard/ClientDashboardView').then(m => ({ default: m.ClientDashboardView })))
const InternRoomsView = lazy(() => import('./components/intern/InternRoomsView').then(m => ({ default: m.InternRoomsView })))
const AdminDashboardView = lazy(() => import('./components/admin/AdminDashboardView').then(m => ({ default: m.AdminDashboardView })))

const PRIVATE = ['owner-dashboard', 'client-dashboard', 'correspondence', 'admin', 'intern-rooms']

import { usePreferences } from './lib/preferences';

export default function App() {
  usePreferences();
  const { ready, activeTab, setActiveTab, currentUser, internAuthorized, setAuthModalOpen, setAuthModalTab, spaces } = useCoworking()
  const pending = spaces.filter(s => s.approval === 'pendente').length
  const admin = isAdmin(currentUser)
  const blocked = PRIVATE.includes(activeTab) && (!currentUser || (activeTab === 'admin' && !admin) || (activeTab === 'intern-rooms' && !internAuthorized))

  useEffect(() => {
    if (blocked) {
      setActiveTab('fiscal')
      if (!currentUser) { setAuthModalTab('login'); setAuthModalOpen(true) }
    }
    window.scrollTo({ top: 0 })
  }, [activeTab, blocked, currentUser, setActiveTab, setAuthModalOpen, setAuthModalTab])

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center bg-navy-950" role="status" aria-label={t("Carregando")}>
        <img src="/logo.png" alt={t("MVA")} className="h-10 w-auto animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] xl:pb-0">
      <a href="#conteudo" className="skip-link">{t("Pular para o conteúdo ")}</a>
      <Navbar />
      {admin && (
        <div className="border-b border-navy-200 bg-white">
          <div className="mx-auto flex max-w-7xl justify-end px-4 py-1.5 sm:px-8">
            <button onClick={() => setActiveTab('admin')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:text-orange-600">
              <ShieldCheck className="h-4 w-4" aria-hidden />{t("Painel administrativo MVA ")}{pending > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{t(pending)}{t("p/ aprovar")}</span>}
            </button>
          </div>
        </div>
      )}
      <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8 sm:py-10">
        <Suspense fallback={<div className="grid min-h-[50vh] place-items-center text-sm text-navy-600" role="status">{t("Carregando seu painel… ")}</div>}>
        {activeTab === 'marketplace' && <MarketplaceView />}
        {activeTab === 'fiscal' && <FiscalView />}
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
