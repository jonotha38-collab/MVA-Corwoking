/*@ts-check*/
import { t } from '../../lib/preferences';
import React, { useEffect, useState, useRef } from 'react';
import { useCoworking } from '../../context/CoworkingContext';
import { Preferences } from './Preferences';
import { ShieldCheck, Mail, PlusCircle, LogOut, User, ChevronDown, Search, Briefcase } from 'lucide-react';

const ITEMS = [
  { tab: 'fiscal', label: 'Endereço fiscal', short: 'Fiscal', icon: ShieldCheck },
  { tab: 'marketplace', label: 'Explorar espaços', short: 'Explorar', icon: Search },
  { tab: 'correspondence', label: 'Correspondência', short: 'Correio', icon: Mail },
  { tab: 'client-dashboard', label: 'Reservas', short: 'Reservas', icon: Briefcase },
  { tab: 'owner-dashboard', label: 'Anunciar espaço', short: 'Anunciar', icon: PlusCircle },
];

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab, currentUser, setAuthModalOpen, setAuthModalTab, logout, correspondence, currentCompany } = useCoworking();
  const [menu, setMenu] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pending = correspondence.filter(c => c.companyId === currentCompany.id && c.status === 'aguardando_retirada').length;

  // ---------- Scroll handling for subtle shadow effect ----------
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openAuth = (tab: 'login' | 'register') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  return (
    <>
      {/* ==================== HEADER ==================== */}
      <header
        className={`sticky top-0 z-40 border-b border-navy-800 bg-navy-950/95 text-white backdrop-blur-md no-print ${isScrolled ? 'shadow-lg' : ''}`}
      >
        <div className="max-w-7xl mx-auto flex h-16 sm:h-20 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <button onClick={() => setActiveTab('fiscal')} className="flex items-center gap-3" aria-label={t("MVA Coworking Hub - página inicial")}>
            <img src="/logo.png" alt={t("MVA")} className="h-7 w-auto sm:h-8" />
            <span className="hidden h-7 w-px bg-navy-700 sm:block" />
            <span className="hidden text-left leading-tight 2xl:block">
              <span className="block text-base font-bold text-slate-100">{t("Coworking Hub ")}</span>
              <span className="hidden text-[11px] text-slate-400 2xl:block">{t("Espaços · Endereço fiscal · Correspondência ")}</span>
            </span>
          </button>

          {/* ==================== NAVBAR (hidden on mobile) ==================== */}
          <nav className="hidden items-center gap-1 xl:flex" aria-label={t("Principal")}>
            {ITEMS.map(({ tab, label, icon: Icon }) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                aria-current={activeTab === tab ? 'page' : undefined}
                className={`relative flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs xl:text-sm font-semibold transition-colors ${activeTab === tab
                  ? 'bg-white/10 text-white border-b-2 border-orange-500'
                  : tab === 'owner-dashboard'
                    ? 'text-orange-300 hover:bg-orange-500/10'
                    : 'text-slate-300 hover:bg-navy-800 hover:text-white'}`}
                >
                  <Icon className="hidden h-4 w-4 2xl:block" aria-hidden />{t(label)}
                  {tab === 'correspondence' && pending > 0 && (
                    <span className="rounded-full bg-orange-600 px-1.5 text-[10px] font-bold">{t(pending)}</span>
                  )}
              </button>
            ))}
          </nav>

          {/* ==================== USER MENU (desktop & mobile) ==================== */}
          <div className="flex items-center gap-3">
            <Preferences />
            <div className="relative" ref={box}>
              {currentUser ? (
                <>
                  <button
                    onClick={() => setMenu(!menu)}
                    aria-expanded={menu}
                    aria-haspopup="menu"
                    className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-navy-800">
                    <img
                      src={currentUser.avatar}
                      alt={t("")}
                      className="h-9 w-9 rounded-lg border border-orange-500/60 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="hidden max-w-[140px] truncate text-sm font-semibold sm:block">
                      {currentUser.name}
                    </span>
                    <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" aria-hidden />
                  </button>
                  {menu && (
                    <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white text-navy-900 shadow-xl">
                      <div className="border-b border-slate-100 p-4">
                        <p className="truncate text-sm font-bold">{currentUser.name}</p>
                        <p className="truncate text-xs text-slate-500">{currentUser.email}</p>
                      </div>
                      <button
                        role="menuitem"
                        onClick={() => {
                          setMenu(false);
                          setActiveTab('owner-dashboard');
                        }}
                        className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-slate-50">
                        <PlusCircle className="h-4 w-4 text-orange-500" aria-hidden />
                        {t("Meus espaços ")}
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => {
                          setMenu(false);
                          setActiveTab('client-dashboard');
                        }}
                        className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-slate-50">
                        <Briefcase className="h-4 w-4 text-orange-500" aria-hidden />
                        {t("Minhas reservas ")}
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => {
                          setMenu(false);
                          logout();
                          setActiveTab('fiscal');
                        }}
                        className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-sm text-red-600 hover:bg-red-50">
                        <LogOut className="h-4 w-4" aria-hidden />
                        {t("Sair ")}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openAuth('login')}
                    className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-navy-800 sm:block"
                  >{t("Entrar ")}
                  </button>
                  <button
                    onClick={() => openAuth('register')}
                    className="flex items-center gap-2 action-primary whitespace-nowrap px-4 py-2.5 text-sm"
                  >
                    <User className="h-4 w-4" aria-hidden />
                    {t("Criar conta ")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ==================== Mobile Navigation ==================== */}
      <nav
        aria-label={t("Principal")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-800 bg-navy-950/95 backdrop-blur-md xl:hidden no-print"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {ITEMS.map(({ tab, short, icon: Icon }) => (
            <li key={tab}>
              <button
                onClick={() => setActiveTab(tab)}
                aria-current={activeTab === tab ? 'page' : undefined}
                className={`relative flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${activeTab === tab ? 'text-orange-400' : 'text-slate-400'}`}>
                <Icon className="h-5 w-5" aria-hidden />{t(short)}
                {tab === 'correspondence' && pending > 0 && (
                  <span className="absolute right-[22%] top-1.5 h-2 w-2 rounded-full bg-orange-500" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};