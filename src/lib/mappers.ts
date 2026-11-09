import type { Booking, Correspondence, FiscalContract, Space } from '../types'

type Row = Record<string, unknown>

export const formatAddress = (s: Pick<Space, 'street' | 'number' | 'neighborhood' | 'city' | 'state'>) =>
  `${s.street}, ${s.number} - ${s.neighborhood}, ${s.city} - ${s.state}`

export const rowToSpace = (r: Row): Space => ({
  id: String(r.id),
  ownerId: (r.owner_id as string | null) ?? undefined,
  ownerName: (r.owner_name as string | null) ?? undefined,
  name: String(r.name),
  coworkingName: String(r.coworking_name),
  isMvaHeadquarters: !!r.is_mva_headquarters,
  street: String(r.street),
  number: String(r.number),
  neighborhood: String(r.neighborhood),
  city: String(r.city),
  state: String(r.state),
  cep: (r.cep as string | null) ?? undefined,
  address: String(r.address),
  category: r.category as Space['category'],
  capacity: Number(r.capacity),
  pricePerHour: Number(r.price_per_hour),
  pricePerShift: r.price_per_shift == null ? undefined : Number(r.price_per_shift),
  rating: Number(r.rating),
  reviewsCount: Number(r.reviews_count),
  amenities: (r.amenities as string[]) || [],
  image: String(r.image || ''),
  gallery: (r.gallery as string[]) || [],
  description: String(r.description || ''),
  status: r.status as Space['status'],
  openingHours: String(r.opening_hours || ''),
  offersFiscalAddress: !!r.offers_fiscal_address,
  offersCorrespondence: !!r.offers_correspondence,
  approval: r.approval as Space['approval'],
  rejectionReason: (r.rejection_reason as string | null) ?? undefined,
  submittedAt: r.submitted_at as string | undefined,
})

const SPACE_MAP: Record<string, string> = {
  name: 'name',
  coworkingName: 'coworking_name',
  street: 'street',
  number: 'number',
  neighborhood: 'neighborhood',
  city: 'city',
  state: 'state',
  cep: 'cep',
  address: 'address',
  category: 'category',
  capacity: 'capacity',
  pricePerHour: 'price_per_hour',
  pricePerShift: 'price_per_shift',
  amenities: 'amenities',
  image: 'image',
  gallery: 'gallery',
  description: 'description',
  status: 'status',
  openingHours: 'opening_hours',
  offersFiscalAddress: 'offers_fiscal_address',
  offersCorrespondence: 'offers_correspondence',
  approval: 'approval',
  rejectionReason: 'rejection_reason',
}

export const spaceToRow = (s: Partial<Space>): Row => {
  const out: Row = {}
  for (const [key, column] of Object.entries(SPACE_MAP)) {
    if (key in s) {
      const value = s[key as keyof Space]
      out[column] = value === undefined ? null : value
    }
  }
  return out
}

export const rowToBooking = (r: Row): Booking => ({
  id: String(r.id),
  userId: r.user_id as string | undefined,
  spaceId: String(r.space_id ?? ''),
  spaceName: String(r.space_name),
  spaceCategory: r.space_category as Booking['spaceCategory'],
  coworkingName: String(r.coworking_name),
  companyName: String(r.company_name),
  responsibleName: String(r.responsible_name),
  responsibleEmail: String(r.responsible_email),
  responsiblePhone: String(r.responsible_phone),
  date: String(r.booking_date),
  startTime: String(r.start_time).slice(0, 5),
  endTime: String(r.end_time).slice(0, 5),
  durationHours: Number(r.duration_hours),
  totalPrice: Number(r.total_price),
  addons: (r.addons as string[]) || [],
  status: r.status as Booking['status'],
  checkIn: !!r.check_in,
  createdAt: String(r.created_at).slice(0, 10),
})

export const rowToFiscal = (r: Row): FiscalContract => ({
  id: String(r.id),
  userId: r.user_id as string | undefined,
  planId: r.plan_id as string | undefined,
  termMonths: r.term_months === 1 ? 1 : 12,
  paymentStatus: (r.payment_status as FiscalContract['paymentStatus']) ?? 'unpaid',
  paymentIsLive: r.payment_is_live === true,
  paymentOrderId: r.payment_order_id as string | undefined,
  certificateNumber: r.certificate_number as string | undefined,
  companyName: String(r.company_name),
  tradingName: String(r.trading_name),
  cnpj: String(r.cnpj),
  contactEmail: String(r.contact_email),
  contactPhone: String(r.contact_phone),
  planName: String(r.plan_name),
  status: r.status as FiscalContract['status'],
  startDate: String(r.start_date),
  renewalDate: String(r.renewal_date),
  coworkingProviderName: String(r.coworking_provider_name),
  unitAddress: String(r.unit_address),
  monthlyFee: Number(r.monthly_fee),
  alvaraStatus: r.alvara_status as FiscalContract['alvaraStatus'],
  alvaraProtocol: String(r.alvara_protocol),
  meetingHoursAllowance: Number(r.meeting_hours_allowance),
  meetingHoursUsed: Number(r.meeting_hours_used),
})

export const rowToCorrespondence = (r: Row): Correspondence => ({
  id: String(r.id),
  trackingCode: String(r.tracking_code),
  companyId: String(r.company_id),
  companyName: String(r.company_name),
  coworkingLocation: String(r.coworking_location),
  sender: String(r.sender),
  type: r.type as Correspondence['type'],
  priority: r.priority as Correspondence['priority'],
  receivedDate: new Date(String(r.received_at)).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }),
  status: r.status as Correspondence['status'],
  digitalizationRequested: !!r.digitalization_requested,
  digitalizedDocUrl: (r.digitalized_doc_url as string | null) ?? undefined,
  photoUrl: (r.photo_url as string | null) ?? undefined,
  notes: (r.notes as string | null) ?? undefined,
  lockerNumber: (r.locker_number as string | null) ?? undefined,
})