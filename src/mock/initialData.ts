import { Space, Correspondence, FiscalContract, Booking, UserAccount } from '../types';

export const INITIAL_USER: UserAccount = {
  id: 'usr-google-1',
  name: 'Alberto Santos',
  email: 'alberto.mva@gmail.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
  accountType: 'coworking_owner',
  coworkingBrandName: 'Espaço Conecta Coworking',
  provider: 'google',
};

export const INITIAL_SPACES: Space[] = [
  {
    id: 'sp-mva-1',
    name: 'Sala Master de Reunião & Diretoria MVA',
    coworkingName: 'MVA Coworking',
    ownerId: 'mva-hq',
    ownerName: 'MVA Coworking Sede',
    isMvaHeadquarters: true,
    street: 'Rua Dom José Thomaz',
    number: '565',
    neighborhood: 'São José',
    city: 'Aracaju',
    state: 'SE',
    cep: '49015-090',
    address: 'Rua Dom José Thomaz, 565 - São José, Aracaju - SE',
    category: 'reuniao',
    capacity: 12,
    pricePerHour: 95,
    pricePerShift: 320,
    rating: 5.0,
    reviewsCount: 54,
    amenities: [
      'Smart TV 70" 4K com videoconferência',
      'Wi-Fi 6 de alta velocidade redundante',
      'Quadro branco em vidro temperado',
      'Café especial moído e água cortesia',
      'Ar-condicionado individual',
      'Recepção executiva no local',
      'Estacionamento privativo'
    ],
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80'
    ],
    description: 'Sala de reunião corporativa da Sede Oficial MVA Coworking na Rua Dom José Thomaz, 565. Espaço premium com isolamento acústico, tecnologia para videoconferência e ambiente sofisticado para fechamento de negócios.',
    status: 'available',
    openingHours: '08:00 às 20:00',
    offersFiscalAddress: true,
    offersCorrespondence: true
  },
  {
    id: 'sp-mva-2',
    name: 'Consultório & Sala de Atendimento Acústica MVA',
    coworkingName: 'MVA Coworking',
    ownerId: 'mva-hq',
    ownerName: 'MVA Coworking Sede',
    isMvaHeadquarters: true,
    street: 'Rua Dom José Thomaz',
    number: '565',
    neighborhood: 'São José',
    city: 'Aracaju',
    state: 'SE',
    cep: '49015-090',
    address: 'Rua Dom José Thomaz, 565 - São José, Aracaju - SE',
    category: 'atendimento',
    capacity: 3,
    pricePerHour: 65,
    pricePerShift: 220,
    rating: 4.95,
    reviewsCount: 38,
    amenities: [
      'Isolamento acústico completo',
      'Poltronas de veludo ergonômicas',
      'Mesa de apoio e biombo',
      'Luz dimerizável aconchegante',
      'Recepção com controle de visitas',
      'Café especial e chás'
    ],
    image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80',
    gallery: [],
    description: 'Ambiente acolhedor e totalmente privativo projetado para psicólogos, terapeutas, médicos, coaches e consultores na Sede MVA Coworking.',
    status: 'available',
    openingHours: '07:30 às 21:00',
    offersFiscalAddress: true,
    offersCorrespondence: true
  },
];

export const INITIAL_FISCAL_CONTRACTS: FiscalContract[] = [
  {
    id: 'fisc-1',
    companyName: 'Nexora Soluções em Tecnologia LTDA',
    tradingName: 'Nexora Tech',
    cnpj: '42.819.304/0001-92',
    contactEmail: 'financeiro@nexoratech.com.br',
    contactPhone: '(79) 99881-2233',
    planName: 'Combo Fiscal + 10h Reunião',
    status: 'ativo',
    startDate: '2025-01-15',
    renewalDate: '2027-01-15',
    coworkingProviderName: 'MVA Coworking (Sede Oficial)',
    unitAddress: 'Rua Dom José Thomaz, 565 - Sala 102 - São José, Aracaju - SE, CEP 49015-090',
    monthlyFee: 249.0,
    alvaraStatus: 'regular',
    alvaraProtocol: 'PMA-2025/0091823',
    meetingHoursAllowance: 10,
    meetingHoursUsed: 3
  },
  {
    id: 'fisc-2',
    companyName: 'Lumina Arquitetura & Interiores LTDA',
    tradingName: 'Lumina Studio',
    cnpj: '38.102.774/0001-40',
    contactEmail: 'contato@luminastudio.arq.br',
    contactPhone: '(11) 97120-8899',
    planName: 'Fiscal + Correspondência VIP',
    status: 'ativo',
    startDate: '2024-06-01',
    renewalDate: '2026-06-01',
    coworkingProviderName: 'NexWork Coworking & Hub',
    unitAddress: 'Av. Paulista, 1471 - Sala 904 - Bela Vista, São Paulo - SP',
    monthlyFee: 199.0,
    alvaraStatus: 'regular',
    alvaraProtocol: 'PMSP-2024/0998121',
    meetingHoursAllowance: 4,
    meetingHoursUsed: 2
  }
];

export const INITIAL_CORRESPONDENCE: Correspondence[] = [
  {
    id: 'cor-1',
    trackingCode: 'BR-SEDEX-99218201',
    companyId: 'fisc-1',
    companyName: 'Nexora Soluções em Tecnologia LTDA',
    coworkingLocation: 'MVA Coworking Sede (Rua Dom José Thomaz, 565)',
    sender: 'Junta Comercial do Estado de Sergipe (JUCESE)',
    type: 'documento_fiscal',
    priority: 'urgente',
    receivedDate: 'Hoje às 10:45',
    status: 'aguardando_retirada',
    digitalizationRequested: false,
    lockerNumber: 'Armário MVA-08',
    notes: 'Envelope timbrado com carimbo oficial de registro.'
  },
  {
    id: 'cor-2',
    trackingCode: 'BR-AR-44910283',
    companyId: 'fisc-1',
    companyName: 'Nexora Soluções em Tecnologia LTDA',
    coworkingLocation: 'MVA Coworking Sede (Rua Dom José Thomaz, 565)',
    sender: 'Receita Federal do Brasil - Delegacia Aracaju',
    type: 'notificacao_judicial',
    priority: 'alta',
    receivedDate: 'Ontem às 14:15',
    status: 'digitalizado',
    digitalizationRequested: true,
    digitalizedDocUrl: 'https://exemplo.com/documento-digitalizado-receita.pdf',
    lockerNumber: 'Armário MVA-08',
    notes: 'Documento escaneado em PDF e disponível para download imediato.'
  }
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'bk-101',
    spaceId: 'sp-mva-1',
    spaceName: 'Sala Master de Reunião & Diretoria MVA',
    spaceCategory: 'reuniao',
    coworkingName: 'MVA Coworking',
    companyName: 'Nexora Soluções em Tecnologia LTDA',
    responsibleName: 'Lucas Ferreira',
    responsibleEmail: 'lucas@nexoratech.com.br',
    responsiblePhone: '(79) 99881-2233',
    date: '2026-09-30',
    startTime: '14:00',
    endTime: '16:00',
    durationHours: 2,
    totalPrice: 190,
    addons: ['Coffee break MVA Gourmet'],
    status: 'confirmada',
    checkIn: false,
    createdAt: '2026-09-28'
  }
];
