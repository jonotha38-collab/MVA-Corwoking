import React, { useEffect, useRef, useState } from 'react';
import { useCoworking } from '../../context/CoworkingContext';
import { Search, ShieldCheck, Mail, Briefcase, PlusCircle, LogOut, User, ChevronDown } from 'lucide-react';

const ITEMS = [
  { tab: 'marketplace', label: 'Explorar espaços', short: 'Explorar', icon: Search },
  { tab: 'fiscal', label: 'Endereço fiscal', short: 'Fiscal', icon: ShieldCheck },
  { tab: 'correspondence', label: 'Correspondência', short: 'Correio', icon: Mail },
  { tab: 'client-dashboard', label: 'Minhas reservas', short: 'Reservas', icon: Briefcase },
  { tab: 'owner-dashboard', label: 'Anunciar coworking', short: 'Anunciar', icon: PlusCircle },
];

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab, currentUser, setAuthModalOpen, setAuthModalTab, logout, correspondence, currentCompany } = useCoworking();
  const [menu, setMenu] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pending = correspondence.filter(c => c.companyId === currentCompany.id && c.status === 'aguardando_retirada').length;

  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openAuth = (tab: 'login' | 'register') => { setAuthModalTab(tab); setAuthModalOpen(true); };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-navy-800 bg-navy-950/95 text-white backdrop-blur-md no-print">
        <div className="hidden items-center justify-between border-b border-navy-800/80 bg-navy-900/90 px-8 py-1.5 text-xs text-slate-300 md:flex">
          <span><strong className="text-white">Sede MVA:</strong> Rua Dom José Thomaz, 565 · Aracaju - SE</span>
          <span className="text-slate-400">Plataforma aberta para coworkings anunciarem seus espaços</span>
        </div>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button onClick={() => setActiveTab('marketplace')} className="flex shrink-0 items-center gap-3" aria-label="MVA Coworking Hub - página inicial">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500 text-base font-black shadow-md">MVA</span>
            <span className="text-left leading-tight">
              <span className="block text-lg font-extrabold tracking-tight">Coworking Hub</span>
              <span className="hidden text-[11px] text-slate-400 sm:block">Espaços · Endereço fiscal · Correspondência</span>
            </span>
          </button>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
            {ITEMS.map(({ tab, label, icon: Icon }) => (
              <button key={tab} onClick={() => setActiveTab(tab)} aria-current={activeTab === tab ? 'page' : undefined}
                className={`relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${activeTab === tab ? 'bg-orange-500 text-white' : tab === 'owner-dashboard' ? 'text-orange-300 hover:bg-orange-500/10' : 'text-slate-300 hover:bg-navy-800 hover:text-white'}`}>
                <Icon className="h-4 w-4" aria-hidden />{label}
                {tab === 'correspondence' && pending > 0 && <span className="rounded-full bg-orange-600 px-1.5 text-[10px] font-bold">{pending}</span>}
              </button>
            ))}
          </nav>

          <div className="relative" ref={box}>
            {currentUser ? (
              <>
                <button onClick={() => setMenu(!menu)} aria-expanded={menu} aria-haspopup="menu" className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-navy-800">
                  <img src={currentUser.avatar} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-lg border border-orange-500/60 object-cover" />
                  <span className="hidden max-w-[140px] truncate text-sm font-semibold sm:block">{currentUser.name}</span>
                  <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" aria-hidden />
                </button>
                {menu && (
                  <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white text-navy-900 shadow-xl">
                    <div className="border-b border-slate-100 p-4"><p className="truncate text-sm font-bold">{currentUser.name}</p><p className="truncate text-xs text-slate-500">{currentUser.email}</p></div>
                    <button role="menuitem" onClick={() => { setMenu(false); setActiveTab('owner-dashboard'); }} className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-slate-50"><PlusCircle className="h-4 w-4 text-orange-500" aria-hidden />Meus espaços</button>
                    <button role="menuitem" onClick={() => { setMenu(false); setActiveTab('client-dashboard'); }} className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-slate-50"><Briefcase className="h-4 w-4 text-orange-500" aria-hidden />Minhas reservas</button>
                    <button role="menuitem" onClick={() => { setMenu(false); logout(); setActiveTab('marketplace'); }} className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" aria-hidden />Sair</button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => openAuth('login')} className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-navy-800 sm:block">Entrar</button>
                <button onClick={() => openAuth('register')} className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold hover:bg-orange-600"><User className="h-4 w-4" aria-hidden /><span>Criar conta</span></button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Barra inferior (celular e tablet) */}
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-800 bg-navy-950/95 backdrop-blur-md lg:hidden no-print" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {ITEMS.map(({ tab, short, icon: Icon }) => (
            <li key={tab}>
              <button onClick={() => setActiveTab(tab)} aria-current={activeTab === tab ? 'page' : undefined}
                className={`relative flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${activeTab === tab ? 'text-orange-400' : 'text-slate-400'}`}>
                <Icon className="h-5 w-5" aria-hidden />{short}
                {tab === 'correspondence' && pending > 0 && <span className="absolute right-[22%] top-1.5 h-2 w-2 rounded-full bg-orange-500" />}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};
