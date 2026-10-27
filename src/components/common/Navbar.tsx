/*@ts-check*/
import { t } from '../../lib/preferences';
import React, { useEffect, useState, useRef } from 'react';
import { useCoworking } from '../../context/CoworkingContext';
import { signInGoogle, signOut } from '../../lib/auth';
import { Preferences } from './Preferences';
import { ShieldCheck, Mail, PlusCircle, LogOut, User, ChevronDown, Search, Briefcase, DoorOpen, ArrowLeftRight } from 'lucide-react';

const ITEMS = [
  { tab: 'fiscal', label: 'Endereço fiscal', short: 'Fiscal', icon: ShieldCheck },
  { tab: 'marketplace', label: 'Explorar espaços', short: 'Explorar', icon: Search },
  { tab: 'correspondence', label: 'Correspondência', short: 'Correio', icon: Mail },
  { tab: 'client-dashboard', label: 'Reservas', short: 'Reservas', icon: Briefcase },
  { tab: 'owner-dashboard', label: 'Anunciar espaço', short: 'Anunciar', icon: PlusCircle },
];

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab, currentUser, internAuthorized, setAuthModalOpen, setAuthModalTab, logout, correspondence, currentCompany, showToast } = useCoworking();
  const [menu, setMenu] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const navItems = internAuthorized ? [...ITEMS, { tab: 'intern-rooms', label: 'Salas dos estagiários', short: 'Estágio', icon: DoorOpen }] : ITEMS;
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const onOutsideClick = (event: PointerEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setMenu(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false);
    };
    document.addEventListener('pointerdown', onOutsideClick);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onOutsideClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, [menu]);

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

  const switchGoogleAccount = async () => {
    if (switchingAccount) return;
    setMenu(false);
    setActiveTab('fiscal');
    setSwitchingAccount(true);
    try {
      // Encerra a sessão atual neste dispositivo antes de autenticar outra conta.
      await signOut();
      await signInGoogle('client');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível trocar a conta Google.', 'error');
    } finally {
      setSwitchingAccount(false);
    }
  };

  return (
    <>
      {/* ==================== HEADER ==================== */}
      <header
        className={`sticky top-0 z-40 border-b border-navy-800 bg-navy-950/95 text-white backdrop-blur-md no-print ${isScrolled ? 'shadow-lg' : ''}`}
      >
        <div className="relative z-20 mx-auto flex h-16 w-full min-w-0 max-w-7xl items-center justify-between gap-2 px-3 sm:h-20 sm:gap-4 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <button onClick={() => setActiveTab('fiscal')} className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3" aria-label={t("MVA Coworking Hub - página inicial")}>
            <img src="/logo.png" alt={t("MVA")} className="block h-7 w-auto max-w-[88px] object-contain sm:h-8 sm:max-w-[112px] lg:max-w-[128px]" />
            <span className="hidden h-7 w-px bg-navy-700 sm:block" />
            <span className="hidden min-w-0 text-left leading-tight md:block">
              <span className="block whitespace-nowrap text-sm font-bold text-slate-100 lg:text-base">{t("Coworking Hub ")}</span>
              <span className="hidden max-w-[250px] truncate text-[11px] text-slate-400 2xl:block">{t("Espaços · Endereço fiscal · Correspondência ")}</span>
            </span>
          </button>

          {/* ==================== USER MENU (desktop & mobile) ==================== */}
          <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-3">
            <Preferences />
            <div className="relative z-30" ref={box}>
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
                    <span className="hidden max-w-[120px] truncate text-sm font-semibold lg:block 2xl:max-w-[150px]">
                      {currentUser.name}
                    </span>
                    <ChevronDown className="hidden h-4 w-4 text-slate-400 lg:block" aria-hidden />
                  </button>
                  {menu && (
                    <div role="menu" className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100dvh-6rem)] w-[min(16rem,calc(100vw-1.5rem))] overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200 bg-white text-navy-900 shadow-2xl">
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
                      {internAuthorized && (
                        <button role="menuitem" onClick={() => { setMenu(false); setActiveTab('intern-rooms'); }} className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-slate-50">
                          <DoorOpen className="h-4 w-4 text-orange-500" aria-hidden />Salas dos estagiários
                        </button>
                      )}
                      <button
                        type="button"
                        role="menuitem"
                        disabled={switchingAccount}
                        onClick={() => { void switchGoogleAccount(); }}
                        className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-sm font-medium text-navy-800 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                      >
                        <ArrowLeftRight className="h-4 w-4 text-orange-500" aria-hidden />
                        {t(switchingAccount ? 'Abrindo o Google...' : 'Trocar conta Google')}
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
        {/* The links have their own row on notebooks: the logo can never overlap "Endereço fiscal". */}
        <div className="relative z-0 hidden border-t border-white/10 lg:block">
            {/* ==================== NAVBAR (hidden on mobile) ==================== */}
            <nav className="mx-auto flex w-full min-w-0 max-w-7xl items-center justify-between gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8" aria-label={t("Principal")}>
              {navItems.map(({ tab, label, icon: Icon }) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  aria-current={activeTab === tab ? 'page' : undefined}
                  className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs 2xl:text-sm font-semibold transition-colors ${activeTab === tab
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
        </div>
      </header>

      {/* ==================== Mobile Navigation ==================== */}
      <nav
        aria-label={t("Principal")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-800 bg-navy-950/95 backdrop-blur-md lg:hidden no-print"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className={`mx-auto grid w-full max-w-2xl ${internAuthorized ? "grid-cols-6" : "grid-cols-5"}`}>
          {navItems.map(({ tab, short, icon: Icon }) => (
            <li key={tab}>
              <button
                onClick={() => setActiveTab(tab)}
                aria-current={activeTab === tab ? 'page' : undefined}
                className={`relative flex min-h-[58px] w-full min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2 text-[10px] font-semibold sm:text-[11px] ${activeTab === tab ? 'text-orange-400' : 'text-slate-400'}`}>
                <Icon className="h-5 w-5 shrink-0" aria-hidden /><span className="max-w-full truncate">{t(short)}</span>
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