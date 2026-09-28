import { useEffect } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useCoworking } from './context/CoworkingContext'
import { isAdmin } from './lib/auth'
import { Navbar } from './components/common/Navbar'
import { Footer } from './components/common/Footer'
import { ToastContainer } from './components/common/ToastContainer'
import { AuthModal } from './components/auth/AuthModal'
import { MarketplaceView } from './components/marketplace/MarketplaceView'
import { FiscalView } from './components/fiscal/FiscalView'
import { CorrespondenceView } from './components/correspondence/CorrespondenceView'
import { OwnerDashboardView } from './components/owner/OwnerDashboardView'
import { ClientDashboardView } from './components/dashboard/ClientDashboardView'
import { AdminDashboardView } from './components/admin/AdminDashboardView'

const PRIVATE = ['owner-dashboard', 'client-dashboard', 'correspondence', 'admin']

export default function App() {
  const { activeTab, setActiveTab, currentUser, setAuthModalOpen, setAuthModalTab, spaces } = useCoworking()
  const pending = spaces.filter(s => s.approval === 'pendente').length
  const admin = isAdmin(currentUser)
  const blocked = PRIVATE.includes(activeTab) && (!currentUser || (activeTab === 'admin' && !admin))

  useEffect(() => {
    if (blocked) {
      setActiveTab('marketplace')
      if (!currentUser) { setAuthModalTab('login'); setAuthModalOpen(true) }
    }
    window.scrollTo({ top: 0 })
  }, [activeTab, blocked, currentUser, setActiveTab, setAuthModalOpen, setAuthModalTab])

  return (
    <div className="flex min-h-dvh flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
      <Navbar />
      {admin && (
        <div className="border-b border-navy-200 bg-white">
          <div className="mx-auto flex max-w-7xl justify-end px-4 py-1.5 sm:px-8">
            <button onClick={() => setActiveTab('admin')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:text-orange-600">
              <ShieldCheck className="h-4 w-4" aria-hidden /> Painel administrativo MVA{pending > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{pending} p/ aprovar</span>}
            </button>
          </div>
        </div>
      )}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
        {activeTab === 'marketplace' && <MarketplaceView />}
        {activeTab === 'fiscal' && <FiscalView />}
        {!blocked && activeTab === 'correspondence' && <CorrespondenceView />}
        {!blocked && activeTab === 'owner-dashboard' && <OwnerDashboardView />}
        {!blocked && activeTab === 'client-dashboard' && <ClientDashboardView />}
        {!blocked && activeTab === 'admin' && <AdminDashboardView />}
      </main>
      <Footer />
      <AuthModal />
      <ToastContainer />
    </div>
  )
}
