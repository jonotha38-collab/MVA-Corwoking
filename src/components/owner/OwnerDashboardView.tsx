import React, { useRef, useState } from 'react';
import { fileToDataUrl, isAdmin } from '../../lib/auth';
import { useCoworking } from '../../context/CoworkingContext';
import { Space, SpaceCategory } from '../../types';
import { 
  Building2, 
  Plus, 
  MapPin, 
  Image, 
  Users, 
  Clock, 
  Check, 
  X, 
  Edit3, 
  Trash2, 
  Sparkles, 
  Eye, 
  ShieldCheck, 
  Calendar, 
  DollarSign,
  UploadCloud,
  ChevronRight
} from 'lucide-react';

export const OwnerDashboardView: React.FC = () => {
  const { 
    currentUser, 
    spaces, 
    addSpace, 
    updateSpace, 
    deleteSpace, 
    bookings, 
    setAuthModalOpen,
    setActiveTab 
  } = useCoworking();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [coworkingName, setCoworkingName] = useState(currentUser?.coworkingBrandName || 'Meu Coworking');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('Aracaju');
  const [state, setState] = useState('SE');
  const [cep, setCep] = useState('');
  const [category, setCategory] = useState<SpaceCategory>('reuniao');
  const [capacity, setCapacity] = useState(8);
  const [pricePerHour, setPricePerHour] = useState(85);
  const [pricePerShift, setPricePerShift] = useState(290);
  const [image, setImage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState('');
  const [gallery, setGallery] = useState<string[]>([]);
  const photos = [image, ...gallery].filter(Boolean);
  const [description, setDescription] = useState('');
  const [openingHours, setOpeningHours] = useState('08:00 às 20:00');
  const [offersFiscal, setOffersFiscal] = useState(true);
  const [offersCorrespondence, setOffersCorrespondence] = useState(true);
  const [amenities, setAmenities] = useState<string[]>([
    'Smart TV 4K para videoconferência',
    'Wi-Fi 6 de alta velocidade',
    'Ar-condicionado silencioso',
    'Café espresso cortesia'
  ]);
  const [newAmenity, setNewAmenity] = useState('');


  // If user is not logged in, prompt to log in with Google
  if (!currentUser) {
    return (
      <div className="py-16 text-center max-w-lg mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-navy-900">Painel do Dono de Coworking</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Para cadastrar seus espaços de reunião, consultórios ou auditórios e começar a receber agendamentos de clientes, entre com sua conta Google ou faça seu cadastro.
        </p>
        <button
          onClick={() => setAuthModalOpen(true)}
          className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Entrar ou Criar Conta de Coworking
        </button>
      </div>
    );
  }

  // Spaces belonging to this user or all third-party spaces
  const mySpaces = spaces.filter(s => isAdmin(currentUser) || s.ownerId === currentUser.id);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setCoworkingName(currentUser.coworkingBrandName || 'Meu Espaço Coworking');
    setStreet('Rua Exemplo');
    setNumber('100');
    setNeighborhood('Centro');
    setCity('Aracaju');
    setState('SE');
    setCep('49000-000');
    setCapacity(8);
    setPricePerHour(80);
    setPricePerShift(280);
    setImage('');
    setGallery([]);
    setDescription('Ambiente profissional e moderno equipado com infraestrutura completa para reuniões e atendimentos de alto nível.');
    setShowModal(true);
  };

  const handleOpenEdit = (space: Space) => {
    setEditingId(space.id);
    setName(space.name);
    setCoworkingName(space.coworkingName);
    setStreet(space.street);
    setNumber(space.number);
    setNeighborhood(space.neighborhood);
    setCity(space.city);
    setState(space.state);
    setCep(space.cep || '');
    setCategory(space.category);
    setCapacity(space.capacity);
    setPricePerHour(space.pricePerHour);
    setPricePerShift(space.pricePerShift || 0);
    setImage(space.image);
    setGallery(space.gallery || []);
    setDescription(space.description);
    setOpeningHours(space.openingHours);
    setAmenities(space.amenities);
    setOffersFiscal(!!space.offersFiscalAddress);
    setOffersCorrespondence(!!space.offersCorrespondence);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) { setPhotoError('Adicione pelo menos uma foto do espaço.'); return; }

    if (editingId) {
      updateSpace(editingId, {
        name,
        coworkingName,
        street,
        number,
        neighborhood,
        city,
        state,
        cep,
        address: `${street}, ${number} - ${neighborhood}, ${city} - ${state}`,
        category,
        capacity: Number(capacity),
        pricePerHour: Number(pricePerHour),
        pricePerShift: Number(pricePerShift),
        image,
        gallery,
        description,
        openingHours,
        amenities,
        offersFiscalAddress: offersFiscal,
        offersCorrespondence: offersCorrespondence,
      });
    } else {
      addSpace({
        name,
        coworkingName,
        street,
        number,
        neighborhood,
        city,
        state,
        cep,
        category,
        capacity: Number(capacity),
        pricePerHour: Number(pricePerHour),
        pricePerShift: Number(pricePerShift),
        image,
        gallery,
        description,
        openingHours,
        amenities,
        offersFiscalAddress: offersFiscal,
        offersCorrespondence: offersCorrespondence,
        status: 'available',
      });
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner - Minimalist & Deep Navy */}
      <div className="bg-navy-900 text-white rounded-3xl p-6 sm:p-8 border border-navy-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-14 h-14 rounded-2xl border-2 border-orange-500 object-cover shadow-sm"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                Painel do Parceiro MVA
              </span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                {currentUser.provider === 'google' ? 'Conta Google' : 'E-mail'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mt-0.5">{currentUser.name}</h1>
            <p className="text-xs text-slate-400">
              {currentUser.coworkingBrandName || 'Empresa de Coworking Credenciada'} • {currentUser.email}
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-orange-500/25 transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Adicionar Espaço / Sala
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Espaços Ativos no Marketplace</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-navy-900">{mySpaces.length}</span>
            <span className="text-xs text-emerald-600 font-semibold">Publicados</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Visíveis para pessoas e empresas reservarem</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Visualizações da Semana</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-navy-900">412</span>
            <span className="text-xs text-orange-600 font-semibold">+18% este mês</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Interessados procurando na sua cidade</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">Reservas Confirmadas</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-navy-900">{bookings.length}</span>
            <span className="text-xs text-emerald-600 font-semibold">100% pagas</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">Repasse automático sem taxa oculta</span>
        </div>
      </div>

      {/* Spaces List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-navy-900">Seus Espaços Cadastrados</h2>
            <p className="text-xs text-slate-500">Gerencie fotos, preços por hora e endereços</p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Cadastrar Novo
          </button>
        </div>

        {mySpaces.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mySpaces.map(space => (
              <div 
                key={space.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-orange-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 w-full bg-slate-100">
                    <img 
                      src={space.image} 
                      alt={space.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-navy-900/80 text-white backdrop-blur-xs uppercase">
                        {space.category}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        space.approval === 'pendente' ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : space.approval === 'rejeitado' ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {space.approval === 'pendente' ? 'Em análise' : space.approval === 'rejeitado' ? 'Rejeitado' : space.status === 'available' ? 'No Ar' : 'Pausado'}
                      </span>
                      {space.approval === 'rejeitado' && space.rejectionReason && (
                        <p className="mt-1 max-w-[220px] rounded-md bg-red-50 px-2 py-1 text-[10px] text-red-700">Motivo: {space.rejectionReason}</p>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <div className="text-[11px] font-semibold text-orange-600 uppercase">
                      {space.coworkingName}
                    </div>
                    <h3 className="font-bold text-base text-navy-900 line-clamp-1">{space.name}</h3>
                    
                    <div className="flex items-start gap-1 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{space.address}</span>
                    </div>

                    <div className="flex items-center gap-3 pt-2 text-xs">
                      <span className="text-slate-600 font-medium">
                        Capacidade: <strong className="text-navy-900">{space.capacity} pess.</strong>
                      </span>
                      <span>•</span>
                      <span className="text-slate-600 font-medium">
                        Hora: <strong className="text-orange-600 font-bold">R$ {space.pricePerHour},00</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setActiveTab('marketplace')}
                    className="text-[11px] font-semibold text-navy-900 hover:text-orange-600 flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver no Marketplace
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(space)}
                      className="p-1.5 text-slate-600 hover:text-navy-900 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Editar Espaço"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remover o espaço "${space.name}" do marketplace?`)) {
                          deleteSpace(space.id);
                        }
                      }}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Excluir Espaço"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-navy-900">Você ainda não adicionou nenhum espaço</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Adicione suas salas de reunião, consultórios ou auditórios com fotos reais e endereço para que clientes possam alugar.
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all"
            >
              Adicionar Primeiro Espaço
            </button>
          </div>
        )}
      </div>

      {/* Modal de Cadastro de Espaço */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden animate-scaleUp">
            
            {/* Header */}
            <div className="bg-navy-900 text-white p-6 relative">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                  {editingId ? 'Editar Espaço' : 'Novo Espaço no Marketplace'}
                </span>
              </div>
              <h3 className="text-xl font-bold">
                {editingId ? 'Editar Informações do Espaço' : 'Cadastre sua Sala ou Espaço de Coworking'}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Coloque fotos de qualidade e o endereço completo para que os clientes encontrem e reservem com facilidade.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              
              {/* Section 1: Identification */}
              <div className="space-y-3">
                <h4 className="font-bold text-navy-900 uppercase text-[11px] tracking-wider border-b pb-1">
                  1. Dados da Sala & Empresa
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nome do Espaço / Sala *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Sala de Reunião Premium Alpha"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nome do seu Coworking *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Espaço Inova Coworking"
                      value={coworkingName}
                      onChange={e => setCoworkingName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tipo de Espaço *</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden bg-white"
                    >
                      <option value="reuniao">Sala de Reunião Executiva</option>
                      <option value="atendimento">Sala de Atendimento / Consultório</option>
                      <option value="auditorio">Auditório / Treinamento</option>
                      <option value="privada">Escritório Privativo / Squads</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Capacidade de Pessoas *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={capacity}
                      onChange={e => setCapacity(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Preço por Hora (R$) *</label>
                    <input
                      type="number"
                      min={10}
                      required
                      value={pricePerHour}
                      onChange={e => setPricePerHour(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Preço Turno 4h (R$)</label>
                    <input
                      type="number"
                      min={0}
                      value={pricePerShift}
                      onChange={e => setPricePerShift(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Address */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-navy-900 uppercase text-[11px] tracking-wider border-b pb-1">
                  2. Endereço do Espaço
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Rua / Avenida *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Av. Beira Mar, Rua Dom José Thomaz..."
                      value={street}
                      onChange={e => setStreet(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Número / Sala *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 565, Sala 201"
                      value={number}
                      onChange={e => setNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Bairro *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: São José, Jardins..."
                      value={neighborhood}
                      onChange={e => setNeighborhood(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Cidade *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Aracaju, São Paulo..."
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Estado (UF) *</label>
                    <input
                      type="text"
                      maxLength={2}
                      required
                      placeholder="SE, SP, RJ..."
                      value={state}
                      onChange={e => setState(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Photos */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-navy-900 uppercase text-[11px] tracking-wider border-b pb-1">3. Fotos do Espaço</h4>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={async e => {
                  const files = Array.from(e.target.files || []); e.target.value = ''
                  setPhotoError('')
                  try {
                    const room = 6 - photos.length
                    const added = await Promise.all(files.slice(0, room).map(f => fileToDataUrl(f)))
                    const all = [...photos, ...added]
                    setImage(all[0] || ''); setGallery(all.slice(1))
                    if (files.length > room) setPhotoError('Limite de 6 fotos por espaço.')
                  } catch (err) { setPhotoError(err instanceof Error ? err.message : 'Erro ao enviar foto.') }
                }} />
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {photos.map((src, i) => (
                    <div key={i} className="relative h-20 rounded-lg overflow-hidden border border-slate-200">
                      <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      {i === 0 && <span className="absolute left-1 bottom-1 rounded bg-orange-500 px-1.5 text-[10px] font-bold text-white">Principal</span>}
                      <button type="button" aria-label={`Remover foto ${i + 1}`} onClick={() => { const all = photos.filter((_, j) => j !== i); setImage(all[0] || ''); setGallery(all.slice(1)) }} className="absolute right-1 top-1 rounded-full bg-navy-900/80 p-0.5 text-white"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  {photos.length < 6 && (
                    <button type="button" onClick={() => fileRef.current?.click()} className="h-20 rounded-lg border-2 border-dashed border-slate-300 text-[11px] font-semibold text-slate-500 hover:border-orange-500 hover:text-orange-600">+ Adicionar fotos</button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">A primeira foto aparece no card do marketplace. Até 6 fotos.</p>
                {photoError && <p role="alert" className="text-[11px] text-red-600">{photoError}</p>}
              </div>

              {/* Section 4: Amenities & Additional Services */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-navy-900 uppercase text-[11px] tracking-wider border-b pb-1">
                  4. Comodidades & Serviços Extras Oferecidos
                </h4>

                <div className="flex flex-wrap gap-4 py-1">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={offersFiscal}
                      onChange={e => setOffersFiscal(e.target.checked)}
                      className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                    />
                    <span>Este espaço oferece <strong>Endereço Fiscal para CNPJ</strong></span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={offersCorrespondence}
                      onChange={e => setOffersCorrespondence(e.target.checked)}
                      className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                    />
                    <span>Oferece <strong>Recepção e Gestão de Correspondência</strong></span>
                  </label>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Descrição</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-md transition-all"
                >
                  {editingId ? 'Salvar Alterações' : 'Publicar Espaço no Marketplace'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
