import React, { useState } from 'react';
import { useCoworking } from '../../context/CoworkingContext';
import { PendingApprovals } from './PendingApprovals';
import { Space, SpaceCategory, Booking } from '../../types';
import { 
  Building2, 
  Plus, 
  Users, 
  Calendar, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  X, 
  MapPin, 
  Sparkles, 
  Layers, 
  Check, 
  Eye,
  Coffee,
  Mail
} from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const { 
    spaces, 
    addSpace, 
    updateSpace, 
    deleteSpace, 
    bookings, 
    checkInBooking, 
    fiscalContracts, 
    correspondence,
    showToast 
  } = useCoworking();

  const [activeAdminTab, setActiveAdminTab] = useState<'spaces' | 'bookings' | 'companies'>('spaces');
  const [showAddSpaceModal, setShowAddSpaceModal] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);

  // Form states for creating/editing a room
  const [formName, setFormName] = useState('');
  const [formCoworkingName, setFormCoworkingName] = useState('MVA Coworking Prime - Paulista');
  const [formCity, setFormCity] = useState('São Paulo');
  const [formNeighborhood, setFormNeighborhood] = useState('Bela Vista / Paulista');
  const [formAddress, setFormAddress] = useState('Av. Paulista, 1374 - São Paulo - SP');
  const [formCategory, setFormCategory] = useState<SpaceCategory>('reuniao');
  const [formCapacity, setFormCapacity] = useState(8);
  const [formPricePerHour, setFormPricePerHour] = useState(90);
  const [formPricePerShift, setFormPricePerShift] = useState(320);
  const [formImage, setFormImage] = useState('https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80');
  const [formDescription, setFormDescription] = useState('');
  const [formOpeningHours, setFormOpeningHours] = useState('08:00 às 20:00');
  const [formAmenities, setFormAmenities] = useState<string[]>([
    'Smart TV 4K',
    'Wi-Fi 6 de alta velocidade',
    'Café espresso cortesia',
    'Ar-condicionado'
  ]);
  const [newAmenityInput, setNewAmenityInput] = useState('');

  // Metrics
  const totalSpaces = spaces.length;
  const activeBookingsCount = bookings.filter(b => b.status === 'confirmada').length;
  const totalRevenue = bookings.reduce((acc, curr) => acc + curr.totalPrice, 0) +
    fiscalContracts.reduce((acc, curr) => acc + curr.monthlyFee, 0);
  const pendingCorrespondenceCount = correspondence.filter(c => c.status === 'aguardando_retirada').length;

  const handleOpenAdd = () => {
    setEditingSpace(null);
    setFormName('');
    setFormDescription('Espaço corporativo moderno com isolamento acústico de alta qualidade, ideal para reuniões e atendimentos executivos.');
    setFormCapacity(8);
    setFormPricePerHour(90);
    setFormPricePerShift(320);
    setFormImage('https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80');
    setShowAddSpaceModal(true);
  };

  const handleOpenEdit = (space: Space) => {
    setEditingSpace(space);
    setFormName(space.name);
    setFormCoworkingName(space.coworkingName);
    setFormCity(space.city);
    setFormNeighborhood(space.neighborhood);
    setFormAddress(space.address);
    setFormCategory(space.category);
    setFormCapacity(space.capacity);
    setFormPricePerHour(space.pricePerHour);
    setFormPricePerShift(space.pricePerShift || 0);
    setFormImage(space.image);
    setFormDescription(space.description);
    setFormOpeningHours(space.openingHours);
    setFormAmenities(space.amenities);
    setShowAddSpaceModal(true);
  };

  const handleAddAmenity = () => {
    if (newAmenityInput.trim() && !formAmenities.includes(newAmenityInput.trim())) {
      setFormAmenities(prev => [...prev, newAmenityInput.trim()]);
      setNewAmenityInput('');
    }
  };

  const handleRemoveAmenity = (amenity: string) => {
    setFormAmenities(prev => prev.filter(a => a !== amenity));
  };

  const handleSaveSpace = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName) {
      alert('Nome da sala é obrigatório.');
      return;
    }

    if (editingSpace) {
      updateSpace(editingSpace.id, {
        name: formName,
        coworkingName: formCoworkingName,
        city: formCity,
        neighborhood: formNeighborhood,
        address: formAddress,
        category: formCategory,
        capacity: Number(formCapacity),
        pricePerHour: Number(formPricePerHour),
        pricePerShift: Number(formPricePerShift),
        image: formImage,
        description: formDescription,
        openingHours: formOpeningHours,
        amenities: formAmenities,
      });
    } else {
      addSpace({
        name: formName,
        coworkingName: formCoworkingName,
        city: formCity,
        street: formAddress,
        number: 's/n',
        state: 'SE',
        neighborhood: formNeighborhood,
        category: formCategory,
        capacity: Number(formCapacity),
        pricePerHour: Number(formPricePerHour),
        pricePerShift: Number(formPricePerShift),
        image: formImage,
        description: formDescription,
        openingHours: formOpeningHours,
        amenities: formAmenities,
        status: 'available',
      });
    }

    setShowAddSpaceModal(false);
  };

  return (
    <div className="space-y-8 pb-16">
      <PendingApprovals />
      
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
            <Sliders className="w-3.5 h-3.5" />
            Painel Administrativo da Unidade de Coworking
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Gestão de Espaços & Serviços MVA Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Cadastre novas salas de reunião e atendimento para o marketplace, acompanhe o fluxo de check-ins de clientes, monitore contratos de endereço fiscal e gerencie serviços.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-emerald-500/25 transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Nova Sala
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Salas Cadastradas</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{totalSpaces}</span>
            <span className="text-xs text-emerald-600 font-semibold">100% ativas</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Disponíveis para agendamento online imediato
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Reservas no Sistema</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{activeBookingsCount}</span>
            <span className="text-xs text-indigo-600 font-semibold">confirmadas</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Total histórico: {bookings.length} reservas registradas
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Endereços Fiscais</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{fiscalContracts.length}</span>
            <span className="text-xs text-emerald-600 font-semibold">empresas sediadas</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Alvarás e domicílios regulares
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Faturamento do Hub</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-semibold text-slate-500">R$</span>
            <span className="text-3xl font-black text-slate-900">{totalRevenue.toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Salas + Assinaturas de Domicílio Fiscal
          </p>
        </div>
      </div>

      {/* Admin Tab Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveAdminTab('spaces')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeAdminTab === 'spaces'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Gerenciar Serviços & Salas ({spaces.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('bookings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeAdminTab === 'bookings'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Agenda & Recepção Check-in ({bookings.length})
        </button>

        <button
          onClick={() => setActiveAdminTab('companies')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeAdminTab === 'companies'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Empresas no Endereço Fiscal ({fiscalContracts.length})
        </button>
      </div>

      {/* TAB 1: SPACES MANAGEMENT */}
      {activeAdminTab === 'spaces' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Salas de Reunião e Atendimento Cadastradas</h2>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar Espaço
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spaces.map(space => (
              <div 
                key={space.id} 
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 w-full bg-slate-100">
                    <img 
                      src={space.image} 
                      alt={space.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-xs">
                        {space.category}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <button
                        onClick={() => {
                          const nextStatus = space.status === 'available' ? 'maintenance' : 'available';
                          updateSpace(space.id, { status: nextStatus });
                        }}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-xs border ${
                          space.status === 'available'
                            ? 'bg-emerald-500/90 text-white border-emerald-400'
                            : 'bg-amber-500/90 text-white border-amber-400'
                        }`}
                      >
                        {space.status === 'available' ? 'Disponível' : 'Em Manutenção'}
                      </button>
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <div className="text-[11px] font-semibold text-indigo-600 uppercase">
                      {space.coworkingName}
                    </div>
                    <h3 className="font-bold text-base text-slate-900">{space.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{space.description}</p>
                    
                    <div className="flex items-center gap-3 text-xs text-slate-600 pt-2">
                      <span className="flex items-center gap-1 font-medium">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {space.capacity} pessoas
                      </span>
                      <span>•</span>
                      <span className="font-bold text-indigo-600">
                        R$ {space.pricePerHour},00/h
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">{space.city} • {space.neighborhood}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(space)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg text-xs transition-colors"
                      title="Editar Espaço"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja excluir "${space.name}"?`)) {
                          deleteSpace(space.id);
                        }
                      }}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs transition-colors"
                      title="Excluir Espaço"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BOOKINGS AGENDA & CHECK-IN */}
      {activeAdminTab === 'bookings' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Agenda de Reservas & Recepção</h2>
            <p className="text-xs text-slate-500">Controle de entrada e check-in presencial dos clientes</p>
          </div>

          <div className="overflow-x-auto">
            <div className="overflow-x-auto -mx-1 px-1"><table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Espaço Reservado</th>
                  <th className="py-3.5 px-4">Empresa / Titular</th>
                  <th className="py-3.5 px-4">Data & Horário</th>
                  <th className="py-3.5 px-4">Opcionais</th>
                  <th className="py-3.5 px-4">Valor</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Recepção (Check-in)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{b.spaceName}</div>
                      <div className="text-[11px] text-slate-500">{b.coworkingName}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-800">{b.companyName}</div>
                      <div className="text-[11px] text-slate-500">{b.responsibleName} ({b.responsiblePhone})</div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{b.date.split('-').reverse().join('/')}</div>
                      <div className="text-[11px] text-slate-500">{b.startTime} às {b.endTime}</div>
                    </td>
                    <td className="py-4 px-4">
                      {b.addons.length > 0 ? (
                        <span className="text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 block truncate max-w-xs">
                          {b.addons.join(', ')}
                        </span>
                      ) : (
                        <span className="text-slate-400">Nenhum</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                      R$ {b.totalPrice.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {b.status === 'confirmada' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Confirmada
                        </span>
                      )}
                      {b.status === 'concluida' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Concluída
                        </span>
                      )}
                      {b.status === 'cancelada' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Cancelada
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      {b.checkIn ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Check-in Efetuado
                        </span>
                      ) : (
                        <button
                          onClick={() => checkInBooking(b.id)}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                        >
                          Efetuar Check-in
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </div>
      )}

      {/* TAB 3: FISCAL ADDRESS CLIENTS */}
      {activeAdminTab === 'companies' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Empresas com Domicílio Fiscal Registrado</h2>
            <p className="text-xs text-slate-500">Acompanhamento de conformidade, alvarás e mensalidades</p>
          </div>

          <div className="overflow-x-auto">
            <div className="overflow-x-auto -mx-1 px-1"><table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Razão Social / Nome Fantasia</th>
                  <th className="py-3.5 px-4">CNPJ</th>
                  <th className="py-3.5 px-4">Plano Contratado</th>
                  <th className="py-3.5 px-4">Unidade Sede</th>
                  <th className="py-3.5 px-4">Alvará</th>
                  <th className="py-3.5 px-4">Horas Reunião</th>
                  <th className="py-3.5 px-6 text-right">Mensalidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fiscalContracts.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{c.companyName}</div>
                      <div className="text-[11px] text-slate-500">{c.tradingName}</div>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-700 whitespace-nowrap">
                      {c.cnpj}
                    </td>
                    <td className="py-4 px-4 font-semibold text-indigo-700 whitespace-nowrap">
                      {c.planName}
                    </td>
                    <td className="py-4 px-4 text-slate-600 truncate max-w-xs">
                      {c.unitAddress}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {c.alvaraStatus === 'regular' ? 'Regular' : 'Processando'}
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">
                        {c.meetingHoursUsed}h / {c.meetingHoursAllowance}h
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-slate-900 whitespace-nowrap">
                      R$ {c.monthlyFee.toFixed(2)}/mês
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar ou Editar Sala */}
      {showAddSpaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
            <div className="bg-slate-900 text-white p-6 relative">
              <button
                onClick={() => setShowAddSpaceModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                {editingSpace ? 'Editar Sala' : 'Novo Cadastro no Marketplace'}
              </span>
              <h3 className="text-xl font-bold mt-1">
                {editingSpace ? `Editar: ${editingSpace.name}` : 'Cadastrar Sala de Reunião ou Atendimento'}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Disponibilize seu espaço para reservas imediatas com fotos de alta qualidade e infraestrutura.
              </p>
            </div>

            <form onSubmit={handleSaveSpace} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nome da Sala *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sala de Reunião Boardroom Diamond"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unidade do Coworking *</label>
                  <input
                    type="text"
                    required
                    value={formCoworkingName}
                    onChange={e => setFormCoworkingName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Categoria do Espaço *</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                  >
                    <option value="reuniao">Sala de Reunião</option>
                    <option value="atendimento">Sala de Atendimento / Consultório</option>
                    <option value="auditorio">Auditório / Eventos</option>
                    <option value="privada">Sala Privada / Squads</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cidade *</label>
                  <input
                    type="text"
                    required
                    value={formCity}
                    onChange={e => setFormCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bairro *</label>
                  <input
                    type="text"
                    required
                    value={formNeighborhood}
                    onChange={e => setFormNeighborhood(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Endereço Completo</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={e => setFormAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capacidade (Pessoas) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formCapacity}
                    onChange={e => setFormCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Valor por Hora (R$) *</label>
                  <input
                    type="number"
                    min={10}
                    required
                    value={formPricePerHour}
                    onChange={e => setFormPricePerHour(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">URL da Imagem de Capa (Unsplash ou Direta)</label>
                  <input
                    type="url"
                    value={formImage}
                    onChange={e => setFormImage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Descrição Comercial</label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Amenities tags input */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Comodidades Inclusas</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Adicionar comodidade (ex: Projetor 4K, Café Nespresso)..."
                    value={newAmenityInput}
                    onChange={e => setNewAmenityInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAmenity();
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddAmenity}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                  >
                    Adicionar
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {formAmenities.map(amenity => (
                    <span 
                      key={amenity}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200"
                    >
                      {amenity}
                      <button
                        type="button"
                        onClick={() => handleRemoveAmenity(amenity)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSpaceModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition-all"
                >
                  {editingSpace ? 'Salvar Alterações' : 'Publicar Sala no Marketplace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
