import type { Booking, Correspondence, FiscalContract, Space } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export const formatAddress = (s: Pick<Space, 'street' | 'number' | 'neighborhood' | 'city' | 'state'>) =>
  `${s.street}, ${s.number} - ${s.neighborhood}, ${s.city} - ${s.state}`;

export const rowToSpace = (r: Row): Space => ({
  id: r.id, ownerId: r.owner_id ?? undefined, ownerName: r.owner_name ?? undefined,
  name: r.name, coworkingName: r.coworking_name, isMvaHeadquarters: !!r.is_mva_headquarters,
  street: r.street, number: r.number, neighborhood: r.neighborhood, city: r.city, state: r.state, cep: r.cep ?? undefined,
  address: r.address, category: r.category, capacity: r.capacity,
  pricePerHour: Number(r.price_per_hour), pricePerShift: r.price_per_shift == null ? undefined : Number(r.price_per_shift),
  rating: Number(r.rating), reviewsCount: r.reviews_count, amenities: r.amenities || [],
  image: r.image || '', gallery: r.gallery || [], description: r.description || '', status: r.status,
  openingHours: r.opening_hours || '', offersFiscalAddress: !!r.offers_fiscal_address, offersCorrespondence: !!r.offers_correspondence,
  approval: r.approval, rejectionReason: r.rejection_reason ?? undefined, submittedAt: r.submitted_at,
});

const SPACE_MAP: Record<string, string> = {
  name: 'name', coworkingName: 'coworking_name', street: 'street', number: 'number', neighborhood: 'neighborhood',
  city: 'city', state: 'state', cep: 'cep', address: 'address', category: 'category', capacity: 'capacity',
  pricePerHour: 'price_per_hour', pricePerShift: 'price_per_shift', amenities: 'amenities', image: 'image',
  gallery: 'gallery', description: 'description', status: 'status', openingHours: 'opening_hours',
  offersFiscalAddress: 'offers_fiscal_address', offersCorrespondence: 'offers_correspondence',
  approval: 'approval', rejectionReason: 'rejection_reason',
};
export const spaceToRow = (s: Partial<Space>): Row => {
  const out: Row = {};
  for (const [k, col] of Object.entries(SPACE_MAP)) {
    if (k in s) out[col] = (s as Row)[k] === undefined ? null : (s as Row)[k];
  }
  return out;
};

export const rowToBooking = (r: Row): Booking => ({
  id: r.id, userId: r.user_id, spaceId: r.space_id ?? '', spaceName: r.space_name, spaceCategory: r.space_category,
  coworkingName: r.coworking_name, companyName: r.company_name, responsibleName: r.responsible_name,
  responsibleEmail: r.responsible_email, responsiblePhone: r.responsible_phone, date: r.booking_date,
  startTime: String(r.start_time).slice(0, 5), endTime: String(r.end_time).slice(0, 5),
  durationHours: Number(r.duration_hours), totalPrice: Number(r.total_price), addons: r.addons || [],
  status: r.status, checkIn: !!r.check_in, createdAt: String(r.created_at).slice(0, 10),
});

export const rowToFiscal = (r: Row): FiscalContract => ({
  id: r.id, userId: r.user_id, companyName: r.company_name, tradingName: r.trading_name, cnpj: r.cnpj,
  contactEmail: r.contact_email, contactPhone: r.contact_phone, planName: r.plan_name, status: r.status,
  startDate: r.start_date, renewalDate: r.renewal_date, coworkingProviderName: r.coworking_provider_name,
  unitAddress: r.unit_address, monthlyFee: Number(r.monthly_fee), alvaraStatus: r.alvara_status,
  alvaraProtocol: r.alvara_protocol, meetingHoursAllowance: r.meeting_hours_allowance, meetingHoursUsed: r.meeting_hours_used,
});

export const rowToCorrespondence = (r: Row): Correspondence => ({
  id: r.id, trackingCode: r.tracking_code, companyId: r.company_id, companyName: r.company_name,
  coworkingLocation: r.coworking_location, sender: r.sender, type: r.type, priority: r.priority,
  receivedDate: new Date(r.received_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
  status: r.status, digitalizationRequested: !!r.digitalization_requested,
  digitalizedDocUrl: r.digitalized_doc_url ?? undefined, photoUrl: r.photo_url ?? undefined,
  notes: r.notes ?? undefined, lockerNumber: r.locker_number ?? undefined,
});
