import React, { createContext, useContext, useState, useEffect } from 'react';
import { isAdmin } from '../lib/auth';
import { Space, Correspondence, FiscalContract, Booking, UserAccount } from '../types';
import { INITIAL_SPACES, INITIAL_CORRESPONDENCE, INITIAL_FISCAL_CONTRACTS, INITIAL_BOOKINGS } from '../mock/initialData';

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface CoworkingContextType {
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
  signIn: (user: UserAccount) => void;
  logout: () => void;
  addSpace: (space: Omit<Space, 'id' | 'rating' | 'reviewsCount' | 'address'>) => void;
  updateSpace: (id: string, space: Partial<Space>) => void;
  deleteSpace: (id: string) => void;
  approveSpace: (id: string) => void;
  rejectSpace: (id: string, reason: string) => void;
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'status' | 'checkIn'>) => Booking;
  cancelBooking: (id: string) => void;
  checkInBooking: (id: string) => void;
  addCorrespondence: (item: {
    trackingCode: string;
    companyId: string;
    companyName: string;
    coworkingLocation: string;
    sender: string;
    type: Correspondence['type'];
    priority: Correspondence['priority'];
    notes?: string;
    lockerNumber?: string;
  }) => void;
  requestDigitalization: (id: string) => void;
  markCorrespondenceAsRetrieved: (id: string) => void;
  addFiscalContract: (data: {
    companyName: string;
    tradingName: string;
    cnpj: string;
    contactEmail: string;
    contactPhone: string;
    planName: string;
    coworkingProviderName: string;
    unitAddress: string;
    monthlyFee: number;
  }) => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  resetToDefaults: () => void;
}

const CoworkingContext = createContext<CoworkingContextType | undefined>(undefined);

export const CoworkingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('mva_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [spaces, setSpaces] = useState<Space[]>(() => {
    const saved = localStorage.getItem('mva_spaces');
    return saved ? JSON.parse(saved) : INITIAL_SPACES;
  });

  const [correspondence, setCorrespondence] = useState<Correspondence[]>(() => {
    const saved = localStorage.getItem('mva_correspondence');
    return saved ? JSON.parse(saved) : INITIAL_CORRESPONDENCE;
  });

  const [fiscalContracts, setFiscalContracts] = useState<FiscalContract[]>(() => {
    const saved = localStorage.getItem('mva_fiscal_contracts');
    return saved ? JSON.parse(saved) : INITIAL_FISCAL_CONTRACTS;
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('mva_bookings');
    return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
  });

  const [activeTab, setActiveTab] = useState<string>('marketplace');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('Todas');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  const currentCompany = fiscalContracts[0] || INITIAL_FISCAL_CONTRACTS[0];

  useEffect(() => {
    localStorage.setItem('mva_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('mva_spaces', JSON.stringify(spaces));
  }, [spaces]);

  useEffect(() => {
    localStorage.setItem('mva_correspondence', JSON.stringify(correspondence));
  }, [correspondence]);

  useEffect(() => {
    localStorage.setItem('mva_fiscal_contracts', JSON.stringify(fiscalContracts));
  }, [fiscalContracts]);

  useEffect(() => {
    localStorage.setItem('mva_bookings', JSON.stringify(bookings));
  }, [bookings]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const signIn = (user: UserAccount) => {
    setCurrentUser(user);
    setAuthModalOpen(false);
    showToast(`Bem-vindo, ${user.name.split(' ')[0]}!`, 'success');
  };

  const logout = () => {
    setCurrentUser(null);
    showToast('Você saiu da sua conta.', 'info');
  };

  const addSpace = (spaceData: Omit<Space, 'id' | 'rating' | 'reviewsCount' | 'address'>) => {
    const formattedAddress = `${spaceData.street}, ${spaceData.number} - ${spaceData.neighborhood}, ${spaceData.city} - ${spaceData.state}`;
    const newSpace: Space = {
      ...spaceData,
      id: `sp-${Date.now()}`,
      address: formattedAddress,
      rating: 5.0,
      reviewsCount: 1,
      ownerId: currentUser?.id || 'owner-guest',
      ownerName: currentUser?.name || 'Empresa Parceira',
      isMvaHeadquarters: false,
      approval: isAdmin(currentUser) ? 'aprovado' : 'pendente',
      submittedAt: new Date().toISOString(),
    };
    setSpaces(prev => [newSpace, ...prev]);
    showToast(newSpace.approval === 'aprovado' ? `Espaço "${newSpace.name}" publicado no marketplace!` : `Espaço "${newSpace.name}" enviado! Ele aparece no marketplace após a aprovação da equipe MVA.`, 'success');
  };

  const updateSpace = (id: string, updatedFields: Partial<Space>) => {
    const resubmit = !isAdmin(currentUser) && !('approval' in updatedFields);
    setSpaces(prev => prev.map(s => s.id === id ? { ...s, ...updatedFields, ...(resubmit && !s.isMvaHeadquarters ? { approval: 'pendente' as const, rejectionReason: undefined } : {}) } : s));
    showToast(resubmit ? 'Alterações enviadas para nova aprovação da equipe MVA.' : 'Espaço atualizado com sucesso.', 'info');
  };
  const approveSpace = (id: string) => {
    setSpaces(prev => prev.map(s => s.id === id ? { ...s, approval: 'aprovado', rejectionReason: undefined } : s));
    showToast('Espaço aprovado e publicado no marketplace.', 'success');
  };
  const rejectSpace = (id: string, reason: string) => {
    setSpaces(prev => prev.map(s => s.id === id ? { ...s, approval: 'rejeitado', rejectionReason: reason } : s));
    showToast('Espaço rejeitado. O motivo ficará visível para o anunciante.', 'info');
  };

  const deleteSpace = (id: string) => {
    setSpaces(prev => prev.filter(s => s.id !== id));
    showToast('Espaço removido do sistema.', 'info');
  };

  const addBooking = (bookingData: Omit<Booking, 'id' | 'createdAt' | 'status' | 'checkIn'>): Booking => {
    const newBooking: Booking = {
      ...bookingData,
      id: `bk-${Date.now()}`,
      status: 'confirmada',
      checkIn: false,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setBookings(prev => [newBooking, ...prev]);
    showToast(`Reserva confirmada para ${bookingData.spaceName}!`, 'success');
    return newBooking;
  };

  const cancelBooking = (id: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelada' } : b));
    showToast('Reserva cancelada com sucesso.', 'info');
  };

  const checkInBooking = (id: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, checkIn: true } : b));
    showToast('Check-in do cliente registrado na recepção.', 'success');
  };

  const addCorrespondence = (item: {
    trackingCode: string;
    companyId: string;
    companyName: string;
    coworkingLocation: string;
    sender: string;
    type: Correspondence['type'];
    priority: Correspondence['priority'];
    notes?: string;
    lockerNumber?: string;
  }) => {
    const newCor: Correspondence = {
      ...item,
      id: `cor-${Date.now()}`,
      receivedDate: 'Hoje às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'aguardando_retirada',
      digitalizationRequested: false,
    };
    setCorrespondence(prev => [newCor, ...prev]);
    showToast(`Correspondência ${item.trackingCode} cadastrada com sucesso!`, 'success');
  };

  const requestDigitalization = (id: string) => {
    setCorrespondence(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          digitalizationRequested: true,
          status: 'digitalizado',
          digitalizedDocUrl: 'https://exemplo.com/documento-digitalizado-mva.pdf',
          notes: (c.notes || '') + ' [Digitalizado pela recepção]'
        };
      }
      return c;
    }));
    showToast('Documento digitalizado em PDF! Disponível para visualização.', 'success');
  };

  const markCorrespondenceAsRetrieved = (id: string) => {
    setCorrespondence(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          status: 'retirado',
        };
      }
      return c;
    }));
    showToast('Correspondência baixada como entregue.', 'info');
  };

  const addFiscalContract = (data: {
    companyName: string;
    tradingName: string;
    cnpj: string;
    contactEmail: string;
    contactPhone: string;
    planName: string;
    coworkingProviderName: string;
    unitAddress: string;
    monthlyFee: number;
  }) => {
    const newContract: FiscalContract = {
      ...data,
      id: `fisc-${Date.now()}`,
      status: 'ativo',
      startDate: new Date().toISOString().split('T')[0],
      renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      alvaraStatus: 'em_processamento',
      alvaraProtocol: `ALV-${new Date().getFullYear()}/${Math.floor(100000 + Math.random() * 900000)}`,
      meetingHoursAllowance: data.planName.includes('Combo') ? 10 : data.planName.includes('VIP') ? 4 : 0,
      meetingHoursUsed: 0
    };
    setFiscalContracts(prev => [newContract, ...prev]);
    showToast(`Contrato de Endereço Fiscal para ${data.companyName} ativado!`, 'success');
  };

  const resetToDefaults = () => {
    setSpaces(INITIAL_SPACES);
    setCorrespondence(INITIAL_CORRESPONDENCE);
    setFiscalContracts(INITIAL_FISCAL_CONTRACTS);
    setBookings(INITIAL_BOOKINGS);
    setCurrentUser(null);
    localStorage.clear();
    showToast('Dados restaurados para o padrão!', 'info');
  };

  return (
    <CoworkingContext.Provider
      value={{
        spaces,
        correspondence,
        fiscalContracts,
        bookings,
        currentCompany,
        currentUser,
        activeTab,
        searchQuery,
        selectedCity,
        selectedCategory,
        toasts,
        authModalOpen,
        authModalTab,
        setActiveTab,
        setSearchQuery,
        setSelectedCity,
        setSelectedCategory,
        setAuthModalOpen,
        setAuthModalTab,
        signIn,
        logout,
        addSpace,
        updateSpace,
        deleteSpace,
        approveSpace,
        rejectSpace,
        addBooking,
        cancelBooking,
        checkInBooking,
        addCorrespondence,
        requestDigitalization,
        markCorrespondenceAsRetrieved,
        addFiscalContract,
        showToast,
        resetToDefaults,
      }}
    >
      {children}
    </CoworkingContext.Provider>
  );
};

export const useCoworking = () => {
  const context = useContext(CoworkingContext);
  if (!context) {
    throw new Error('useCoworking must be used within a CoworkingProvider');
  }
  return context;
};
