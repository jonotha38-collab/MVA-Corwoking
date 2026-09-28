import React from 'react';
import { useCoworking } from '../../context/CoworkingContext';
import { 
  Building2, 
  Search, 
  Mail, 
  Briefcase, 
  ShieldCheck, 
  PlusCircle, 
  MapPin, 
  LogOut,
  Sparkles,
  User,
  RotateCcw
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    currentUser, 
    setAuthModalOpen, 
    setAuthModalTab, 
    logout, 
    correspondence, 
    currentCompany,
    resetToDefaults 
  } = useCoworking();

  const pendingCount = correspondence.filter(
    c => c.companyId === currentCompany.id && c.status === 'aguardando_retirada'
  ).length;

  return (
    <header className="sticky top-0 z-40 bg-navy-950/95 backdrop-blur-md border-b border-navy-800 shadow-sm no-print text-white">
      {/* Top minimal micro bar for headquarters notice and quick reset */}
      <div className="bg-navy-900/90 text-slate-300 text-xs py-1.5 px-4 sm:px-8 flex flex-wrap justify-between items-center gap-2 border-b border-navy-800/80">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
            Sede Oficial MVA Coworking
          </span>
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="hidden md:inline text-xs text-slate-300">
            <strong className="text-white">Rua Dom José Thomaz, 565</strong> • São José, Aracaju - SE
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Plataforma aberta para empresas de coworking cadastrarem seus espaços
          </span>
          <button
            onClick={resetToDefaults}
            title="Restaurar dados padrão"
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand: Minimalist Navy & Orange */}
          <div 
            onClick={() => setActiveTab('marketplace')}
            className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              MVA
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white font-sans">COWORKING</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40">
                  HUB
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Rede de Espaços • Endereço Fiscal • Correspondência
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'marketplace'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`}
            >
              <Search className="w-4 h-4" />
              Explorar Espaços
            </button>

            <button
              onClick={() => setActiveTab('fiscal')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'fiscal'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Endereço Fiscal
            </button>

            <button
              onClick={() => setActiveTab('correspondence')}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'correspondence'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`}
            >
              <Mail className="w-4 h-4" />
              Correspondência
              {pendingCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-white bg-orange-600 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* Third-Party Coworking Owner Hub */}
            <button
              onClick={() => setActiveTab('owner-dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeTab === 'owner-dashboard'
                  ? 'bg-orange-600 text-white border-orange-500 shadow-xs'
                  : 'text-orange-400 hover:text-orange-300 bg-orange-500/10 border-orange-500/30'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-orange-400" />
              <span>Anunciar Coworking</span>
              <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.2 rounded font-semibold">
                Parceiros
              </span>
            </button>

            <button
              onClick={() => setActiveTab('client-dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'client-dashboard'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Minhas Reservas
            </button>
          </nav>

          {/* User Account / Google Sign-In */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setActiveTab('owner-dashboard')}
                  className="flex items-center gap-2 text-left p-1.5 rounded-xl hover:bg-navy-800 transition-colors"
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-lg object-cover border border-orange-500/60"
                  />
                  <div className="hidden sm:block">
                    <span className="text-xs font-bold text-white block leading-tight">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-orange-400">
                      {currentUser.provider === 'google' ? 'Google Account' : 'Parceiro'}
                    </span>
                  </div>
                </button>

                <button
                  onClick={logout}
                  title="Sair da conta"
                  className="p-2 text-slate-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthModalTab('login');
                  setAuthModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-orange-500/25 transition-all"
              >
                <User className="w-3.5 h-3.5" />
                <span>Entrar com Google</span>
              </button>
            )}
          </div>

        </div>

        {/* Mobile Nav row */}
        <div className="lg:hidden flex items-center justify-between border-t border-navy-800 py-2.5 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${
              activeTab === 'marketplace' ? 'bg-orange-500 text-white' : 'text-slate-300 bg-navy-800'
            }`}
          >
            Explorar
          </button>
          <button
            onClick={() => setActiveTab('owner-dashboard')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${
              activeTab === 'owner-dashboard' ? 'bg-orange-600 text-white' : 'text-orange-400 bg-orange-500/10'
            }`}
          >
            + Anunciar Espaço
          </button>
          <button
            onClick={() => setActiveTab('fiscal')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${
              activeTab === 'fiscal' ? 'bg-orange-500 text-white' : 'text-slate-300 bg-navy-800'
            }`}
          >
            Endereço Fiscal
          </button>
          <button
            onClick={() => setActiveTab('correspondence')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${
              activeTab === 'correspondence' ? 'bg-orange-500 text-white' : 'text-slate-300 bg-navy-800'
            }`}
          >
            Correspondência
          </button>
          <button
            onClick={() => setActiveTab('client-dashboard')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${
              activeTab === 'client-dashboard' ? 'bg-orange-500 text-white' : 'text-slate-300 bg-navy-800'
            }`}
          >
            Minhas Reservas
          </button>
        </div>

      </div>
    </header>
  );
};
