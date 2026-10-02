import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isAdmin, profileToUser } from '../lib/auth';
import { formatAddress, rowToBooking, rowToCorrespondence, rowToFiscal, rowToSpace, spaceToRow } from '../lib/mappers';
import type { Booking, Correspondence, FiscalContract, Space, UserAccount } from '../types';

interface ToastState { id: number; message: string; type: 'success' | 'info' | 'error' }

interface CoworkingContextType {
  ready: boolean;
  spaces: Space[];
  correspondence: Correspondence[];
  fiscalContracts: FiscalContract[];
  bookings: Booking[];
  currentCompany: FiscalContract;
  currentUser: UserAccount | null;
  activeTab: string;
  searchQuery: string;
  selectedCity: string;
  selectedCategory: string;
  toasts: ToastState[];
  authModalOpen: boolean;
  authModalTab: 'login' | 'register';
  setActiveTab: (tab: string) => void;
  setSearchQuery: (q: string) => void;
  setSelectedCity: (city: string) => void;
  setSelectedCategory: (cat: string) => void;
  setAuthModalOpen: (open: boolean) => void;
  setAuthModalTab: (tab: 'login' | 'register') => void;
  logout: () => void;
  addSpace: (space: Omit<Space, 'id' | 'rating' | 'reviewsCount' | 'address'>) => Promise<boolean>;
  updateSpace: (id: string, space: Partial<Space>) => Promise<boolean>;
  deleteSpace: (id: string) => Promise<void>;
  approveSpace: (id: string) => Promise<void>;
  rejectSpace: (id: string, reason: string) => Promise<void>;
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'status' | 'checkIn' | 'userId'>) => Promise<Booking | null>;
  cancelBooking: (id: string) => Promise<void>;
  checkInBooking: (id: string) => Promise<void>;
  addCorrespondence: (item: {
    trackingCode: string; companyId: string; companyName: string; coworkingLocation: string; sender: string;
    type: Correspondence['type']; priority: Correspondence['priority']; notes?: string; lockerNumber?: string;
  }) => Promise<void>;
  requestDigitalization: (id: string) => Promise<void>;
  markCorrespondenceAsRetrieved: (id: string) => Promise<void>;
  addFiscalContract: (data: {
    companyName: string; tradingName: string; cnpj: string; contactEmail: string; contactPhone: string;
    planName: string; coworkingProviderName: string; unitAddress: string; monthlyFee: number;
  }) => Promise<boolean>;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const EMPTY_COMPANY: FiscalContract = {
  id: '', companyName: '', tradingName: '', cnpj: '', contactEmail: '', contactPhone: '', planName: '',
  status: 'pendente_documento', startDate: '', renewalDate: '', coworkingProviderName: '', unitAddress: '',
  monthlyFee: 0, alvaraStatus: 'em_processamento', alvaraProtocol: '', meetingHoursAllowance: 0, meetingHoursUsed: 0,
};

const CoworkingContext = createContext<CoworkingContextType | undefined>(undefined);

export const CoworkingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [fiscalContracts, setFiscalContracts] = useState<FiscalContract[]>([]);
  const [correspondence, setCorrespondence] = useState<Correspondence[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeTab, setActiveTab] = useState('marketplace');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Todas');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const lastUid = useRef<string | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const fail = useCallback((what: string, err: unknown) => {
    console.error(what, err);
    showToast(`${what}. Tente novamente em instantes.`, 'error');
  }, [showToast]);

  /* ---------- carregamento ---------- */
  const loadAll = useCallback(async (uid: string | null) => {
    const sp = await supabase.from('spaces').select('*').order('created_at', { ascending: false });
    if (sp.error) fail('Não foi possível carregar os espaços', sp.error);
    else setSpaces((sp.data || []).map(rowToSpace));
    if (!uid) { setBookings([]); setFiscalContracts([]); setCorrespondence([]); return; }
    const [bk, fc, co] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('fiscal_contracts').select('*').order('created_at', { ascending: false }),
      supabase.from('correspondence').select('*').order('received_at', { ascending: false }),
    ]);
    if (bk.error || fc.error || co.error) fail('Não foi possível carregar seus dados', bk.error || fc.error || co.error);
    else {
      setBookings((bk.data || []).map(rowToBooking));
      setFiscalContracts((fc.data || []).map(rowToFiscal));
      setCorrespondence((co.data || []).map(rowToCorrespondence));
    }
  }, [fail]);

  /* ---------- sessão ---------- */
  useEffect(() => {
    let alive = true;
    const apply = async (session: Session | null, event: string) => {
      try {
        if (!session) {
          lastUid.current = null; setCurrentUser(null); await loadAll(null); return;
        }
        const uid = session.user.id;
        let { data: prof } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
        const pending = localStorage.getItem('mva:pending-type');
        if (pending && prof && event === 'SIGNED_IN') {
          localStorage.removeItem('mva:pending-type');
          const fresh = Date.now() - new Date(prof.created_at).getTime() < 5 * 60 * 1000;
          if (fresh && prof.account_type !== pending && (pending === 'client' || pending === 'coworking_owner')) {
            const upd = await supabase.from('profiles').update({ account_type: pending }).eq('id', uid).select().maybeSingle();
            if (upd.data) prof = upd.data;
          }
        }
        const user = profileToUser(prof, session.user);
        const first = lastUid.current !== uid;
        lastUid.current = uid;
        setCurrentUser(user);
        if (first) {
          setAuthModalOpen(false);
          if (event === 'SIGNED_IN') showToast(`Bem-vindo, ${user.name.split(' ')[0]}!`, 'success');
          await loadAll(uid);
        }
      } catch (e) { console.error(e); }
    };
    supabase.auth.getSession()
      .then(({ data }) => apply(data.session, 'INITIAL_SESSION'))
      .catch(e => console.error(e))
      .finally(() => { if (alive) setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      setTimeout(() => { void apply(session, event); }, 0); // evita travar o cliente do Supabase
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadAll, showToast]);

  // Atualiza os dados quando a pessoa volta para a aba (ex.: admin vê novos anúncios)
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') void loadAll(lastUid.current); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadAll]);

  const requireLogin = useCallback(() => {
    setAuthModalTab('login'); setAuthModalOpen(true);
    showToast('Entre na sua conta para continuar.', 'info');
  }, [showToast]);

  const logout = () => {
    void supabase.auth.signOut().then(() => showToast('Você saiu da sua conta.', 'info'));
  };

  /* ---------- espaços ---------- */
  const addSpace: CoworkingContextType['addSpace'] = async (spaceData) => {
    if (!currentUser) { requireLogin(); return false; }
    const admin = isAdmin(currentUser);
    const row = {
      ...spaceToRow(spaceData),
      address: formatAddress(spaceData),
      owner_id: currentUser.id,
      owner_name: currentUser.coworkingBrandName || currentUser.name,
      is_mva_headquarters: false,
      approval: admin ? 'aprovado' : 'pendente',
    };
    const { data, error } = await supabase.from('spaces').insert(row).select().single();
    if (error) { fail('Não foi possível salvar o espaço', error); return false; }
    setSpaces(prev => [rowToSpace(data), ...prev]);
    showToast(admin ? `Espaço "${data.name}" publicado no marketplace!` : `Espaço "${data.name}" enviado! Ele aparece no marketplace após a aprovação da equipe MVA.`, 'success');
    return true;
  };

  const updateSpace: CoworkingContextType['updateSpace'] = async (id, fields) => {
    const current = spaces.find(s => s.id === id);
    if (!current) return false;
    const admin = isAdmin(currentUser);
    const resubmit = !admin && !('approval' in fields) && !current.isMvaHeadquarters;
    const merged = { ...current, ...fields };
    const row: Record<string, unknown> = { ...spaceToRow(fields) };
    if (['street', 'number', 'neighborhood', 'city', 'state'].some(k => k in fields)) row.address = formatAddress(merged);
    if (resubmit) { row.approval = 'pendente'; row.rejection_reason = null; }
    const { data, error } = await supabase.from('spaces').update(row).eq('id', id).select().single();
    if (error) { fail('Não foi possível atualizar o espaço', error); return false; }
    setSpaces(prev => prev.map(s => (s.id === id ? rowToSpace(data) : s)));
    showToast(resubmit ? 'Alterações enviadas para nova aprovação da equipe MVA.' : 'Espaço atualizado com sucesso.', 'info');
    return true;
  };

  const setApproval = async (id: string, approval: 'aprovado' | 'rejeitado', reason: string | null) => {
    const { data, error } = await supabase.from('spaces').update({ approval, rejection_reason: reason }).eq('id', id).select().single();
    if (error) return fail('Não foi possível atualizar o status do anúncio', error);
    setSpaces(prev => prev.map(s => (s.id === id ? rowToSpace(data) : s)));
    showToast(approval === 'aprovado' ? 'Espaço aprovado e publicado no marketplace.' : 'Espaço rejeitado. O motivo ficará visível para o anunciante.', approval === 'aprovado' ? 'success' : 'info');
  };
  const approveSpace = (id: string) => setApproval(id, 'aprovado', null);
  const rejectSpace = (id: string, reason: string) => setApproval(id, 'rejeitado', reason);

  const deleteSpace = async (id: string) => {
    const { error } = await supabase.from('spaces').delete().eq('id', id);
    if (error) return fail('Não foi possível remover o espaço', error);
    setSpaces(prev => prev.filter(s => s.id !== id));
    showToast('Espaço removido.', 'info');
  };

  /* ---------- reservas ---------- */
  const addBooking: CoworkingContextType['addBooking'] = async (b) => {
    if (!currentUser) { requireLogin(); return null; }
    const { data, error } = await supabase.from('bookings').insert({
      user_id: currentUser.id, space_id: b.spaceId, space_name: b.spaceName, space_category: b.spaceCategory,
      coworking_name: b.coworkingName, company_name: b.companyName, responsible_name: b.responsibleName,
      responsible_email: b.responsibleEmail, responsible_phone: b.responsiblePhone, booking_date: b.date,
      start_time: b.startTime, end_time: b.endTime, duration_hours: b.durationHours, total_price: b.totalPrice, addons: b.addons,
    }).select().single();
    if (error) {
      if (error.code === '23P01') showToast('Este horário já está reservado nesta sala. Escolha outro horário.', 'error');
      else fail('Não foi possível confirmar a reserva', error);
      return null;
    }
    const booking = rowToBooking(data);
    setBookings(prev => [booking, ...prev]);
    return booking;
  };

  const patchBooking = async (id: string, patch: Record<string, unknown>, ok: string) => {
    const { data, error } = await supabase.from('bookings').update(patch).eq('id', id).select().single();
    if (error) return fail('Não foi possível atualizar a reserva', error);
    setBookings(prev => prev.map(x => (x.id === id ? rowToBooking(data) : x)));
    showToast(ok, 'info');
  };
  const cancelBooking = (id: string) => patchBooking(id, { status: 'cancelada' }, 'Reserva cancelada.');
  const checkInBooking = (id: string) => patchBooking(id, { check_in: true }, 'Check-in realizado com sucesso!');

  /* ---------- correspondência ---------- */
  const addCorrespondence: CoworkingContextType['addCorrespondence'] = async (i) => {
    const { data, error } = await supabase.from('correspondence').insert({
      tracking_code: i.trackingCode, company_id: i.companyId, company_name: i.companyName,
      coworking_location: i.coworkingLocation, sender: i.sender, type: i.type, priority: i.priority,
      notes: i.notes || null, locker_number: i.lockerNumber || null,
    }).select().single();
    if (error) return fail('Não foi possível registrar a correspondência', error);
    setCorrespondence(prev => [rowToCorrespondence(data), ...prev]);
    showToast('Correspondência registrada e cliente notificado.', 'success');
  };

  const patchCorr = async (id: string, patch: Record<string, unknown>, ok: string) => {
    const { data, error } = await supabase.from('correspondence').update(patch).eq('id', id).select().single();
    if (error) return fail('Não foi possível atualizar a correspondência', error);
    setCorrespondence(prev => prev.map(c => (c.id === id ? rowToCorrespondence(data) : c)));
    showToast(ok, 'success');
  };
  const requestDigitalization = (id: string) =>
    patchCorr(id, { digitalization_requested: true, status: 'digitalizado' }, 'Digitalização solicitada.');
  const markCorrespondenceAsRetrieved = (id: string) =>
    patchCorr(id, { status: 'retirado' }, 'Retirada registrada.');

  /* ---------- endereço fiscal ---------- */
  const addFiscalContract: CoworkingContextType['addFiscalContract'] = async (d) => {
    if (!currentUser) { requireLogin(); return false; }
    const { data, error } = await supabase.from('fiscal_contracts').insert({
      user_id: currentUser.id, company_name: d.companyName, trading_name: d.tradingName, cnpj: d.cnpj,
      contact_email: d.contactEmail, contact_phone: d.contactPhone, plan_name: d.planName,
      coworking_provider_name: d.coworkingProviderName, unit_address: d.unitAddress, monthly_fee: d.monthlyFee,
      alvara_protocol: `ALV-${new Date().getFullYear()}/${Math.floor(100000 + Math.random() * 900000)}`,
      meeting_hours_allowance: d.planName.includes('Combo') ? 10 : d.planName.includes('VIP') ? 4 : 0,
    }).select().single();
    if (error) { fail('Não foi possível registrar o contrato', error); return false; }
    setFiscalContracts(prev => [rowToFiscal(data), ...prev]);
    return true;
  };

  const currentCompany = fiscalContracts.find(c => c.userId === currentUser?.id) || EMPTY_COMPANY;

  return (
    <CoworkingContext.Provider value={{
      ready, spaces, correspondence, fiscalContracts, bookings, currentCompany, currentUser, activeTab, searchQuery,
      selectedCity, selectedCategory, toasts, authModalOpen, authModalTab, setActiveTab, setSearchQuery, setSelectedCity,
      setSelectedCategory, setAuthModalOpen, setAuthModalTab, logout, addSpace, updateSpace, deleteSpace, approveSpace,
      rejectSpace, addBooking, cancelBooking, checkInBooking, addCorrespondence, requestDigitalization,
      markCorrespondenceAsRetrieved, addFiscalContract, showToast,
    }}>
      {children}
    </CoworkingContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCoworking = () => {
  const ctx = useContext(CoworkingContext);
  if (!ctx) throw new Error('useCoworking must be used within CoworkingProvider');
  return ctx;
};
