export type SpaceCategory = 'reuniao' | 'atendimento' | 'auditorio' | 'privada';

export interface Space {
  id: string;
  name: string;
  coworkingName: string;
  ownerId?: string; // ID da empresa terceira dona do coworking
  ownerName?: string;
  isMvaHeadquarters?: boolean; // Verdadeiro se for a Sede MVA Coworking (Rua Dom José Thomaz, 565)
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep?: string;
  address: string; // Endereço formatado completo
  category: SpaceCategory;
  capacity: number;
  pricePerHour: number;
  pricePerShift?: number; // Turno 4h
  rating: number;
  reviewsCount: number;
  amenities: string[];
  image: string; // Foto principal
  gallery?: string[]; // Fotos adicionais
  description: string;
  status: 'available' | 'maintenance' | 'occupied';
  openingHours: string;
  offersFiscalAddress?: boolean;
  offersCorrespondence?: boolean;
  approval?: 'pendente' | 'aprovado' | 'rejeitado'; // ausente = aprovado
  rejectionReason?: string;
  submittedAt?: string;
}

export type CorrespondenceType = 'carta' | 'notificacao_judicial' | 'encomenda' | 'documento_fiscal';
export type CorrespondenceStatus = 'aguardando_retirada' | 'digitalizado' | 'retirado';
export type CorrespondencePriority = 'normal' | 'alta' | 'urgente';

export interface Correspondence {
  id: string;
  trackingCode: string;
  companyId: string;
  companyName: string;
  coworkingLocation: string;
  sender: string;
  type: CorrespondenceType;
  priority: CorrespondencePriority;
  receivedDate: string;
  status: CorrespondenceStatus;
  digitalizationRequested: boolean;
  digitalizedDocUrl?: string;
  photoUrl?: string;
  notes?: string;
  lockerNumber?: string;
}

export interface FiscalContract {
  id: string;
  companyName: string;
  tradingName: string;
  cnpj: string;
  contactEmail: string;
  contactPhone: string;
  planName: string;
  status: 'ativo' | 'em_aprovacao' | 'pendente_documento';
  startDate: string;
  renewalDate: string;
  coworkingProviderName: string;
  unitAddress: string;
  monthlyFee: number;
  alvaraStatus: 'regular' | 'em_processamento';
  alvaraProtocol: string;
  meetingHoursAllowance: number;
  meetingHoursUsed: number;
}

export interface Booking {
  id: string;
  spaceId: string;
  spaceName: string;
  spaceCategory: SpaceCategory;
  coworkingName: string;
  companyName: string;
  responsibleName: string;
  responsibleEmail: string;
  responsiblePhone: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "14:00"
  endTime: string; // "16:00"
  durationHours: number;
  totalPrice: number;
  addons: string[];
  status: 'confirmada' | 'concluida' | 'cancelada';
  checkIn: boolean;
  createdAt: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatar: string;
  accountType: 'coworking_owner' | 'client';
  coworkingBrandName?: string;
  provider: 'google' | 'email';
}
