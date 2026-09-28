import React, { useState } from 'react';
import { useCoworking } from '../../context/CoworkingContext';
import { Correspondence, CorrespondenceType, CorrespondenceStatus } from '../../types';
import { 
  Mail, 
  Package, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  Plus, 
  Download, 
  Eye, 
  Lock, 
  X, 
  UserCheck, 
  Building,
  MapPin
} from 'lucide-react';

export const CorrespondenceView: React.FC = () => {
  const { 
    correspondence, 
    currentCompany, 
    currentUser,
    fiscalContracts, 
    addCorrespondence, 
    requestDigitalization, 
    markCorrespondenceAsRetrieved,
    showToast 
  } = useCoworking();

  const [activeFilter, setActiveFilter] = useState<'all' | CorrespondenceStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Correspondence | null>(null);
  const [authorizeModal, setAuthorizeModal] = useState<Correspondence | null>(null);
  const [authName, setAuthName] = useState('');
  const [authCpf, setAuthCpf] = useState('');

  // Form states for adding correspondence
  const [formTracking, setFormTracking] = useState('');
  const [formCompanyId, setFormCompanyId] = useState(fiscalContracts[0]?.id || '');
  const [formLocation, setFormLocation] = useState('MVA Sede: Rua Dom José Thomaz, 565');
  const [formSender, setFormSender] = useState('');
  const [formType, setFormType] = useState<CorrespondenceType>('carta');
  const [formPriority, setFormPriority] = useState<Correspondence['priority']>('normal');
  const [formLocker, setFormLocker] = useState('Armário MVA-08');
  const [formNotes, setFormNotes] = useState('');

  // Filter correspondence
  const filteredList = correspondence.filter(item => {
    // If not owner of coworking, show company correspondence
    if (currentUser?.accountType === 'client' && item.companyId !== currentCompany.id) {
      return false;
    }

    if (activeFilter !== 'all' && item.status !== activeFilter) {
      return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        item.trackingCode.toLowerCase().includes(q) ||
        item.sender.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q))
      );
    }

    return true;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetComp = fiscalContracts.find(c => c.id === formCompanyId) || currentCompany;

    addCorrespondence({
      trackingCode: formTracking || `BR-MVA-${Math.floor(100000 + Math.random() * 900000)}`,
      companyId: targetComp.id,
      companyName: targetComp.companyName,
      coworkingLocation: formLocation,
      sender: formSender,
      type: formType,
      priority: formPriority,
      lockerNumber: formLocker,
      notes: formNotes,
    });

    setShowAddModal(false);
    setFormSender('');
    setFormTracking('');
    setFormNotes('');
  };

  const handleAuthorizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authName || !authCpf) return;
    showToast(`Autorização emitida! ${authName} (CPF: ${authCpf}) está autorizado a retirar na recepção.`, 'success');
    setAuthorizeModal(null);
    setAuthName('');
    setAuthCpf('');
  };

  const typeConfig: Record<CorrespondenceType, { label: string; icon: any; color: string }> = {
    carta: { label: 'Carta Simples', icon: Mail, color: 'bg-slate-100 text-slate-700 border-slate-200' },
    encomenda: { label: 'Encomenda / Sedex', icon: Package, color: 'bg-orange-50 text-orange-700 border-orange-200' },
    documento_fiscal: { label: 'Documento Fiscal', icon: FileText, color: 'bg-navy-50 text-navy-800 border-navy-200' },
    notificacao_judicial: { label: 'Notificação / Cartório', icon: AlertTriangle, color: 'bg-rose-50 text-rose-700 border-rose-200' },
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner - Minimalist Navy */}
      <div className="bg-navy-950 rounded-3xl p-6 sm:p-8 border border-navy-800 shadow-sm text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30 mb-2">
            <Mail className="w-3.5 h-3.5" />
            Central de Recepção & Triagem de Correspondências
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Gestão & Digitalização de Correspondências
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Recebimento diário pelas recepções dos coworkings, triagem protocolada, lockers protegidos e serviço de digitalização de documentos em PDF sob demanda.
          </p>
        </div>

        {currentUser?.accountType === 'coworking_owner' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-orange-500/25 transition-all flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Dar Entrada em Correspondência
          </button>
        )}
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div 
          onClick={() => setActiveFilter('aguardando_retirada')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            activeFilter === 'aguardando_retirada' 
              ? 'bg-orange-50 border-orange-400 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[11px]">Aguardando Retirada</span>
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-2xl font-black text-navy-900 mt-2">
            {correspondence.filter(c => c.status === 'aguardando_retirada').length}
          </div>
          <span className="text-orange-600 font-medium">Disponíveis nos armários</span>
        </div>

        <div 
          onClick={() => setActiveFilter('digitalizado')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            activeFilter === 'digitalizado' 
              ? 'bg-navy-50 border-navy-400 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[11px]">Digitalizados em PDF</span>
            <FileText className="w-5 h-5 text-navy-900" />
          </div>
          <div className="text-2xl font-black text-navy-900 mt-2">
            {correspondence.filter(c => c.status === 'digitalizado').length}
          </div>
          <span className="text-slate-600 font-medium">Prontos para download imediato</span>
        </div>

        <div 
          onClick={() => setActiveFilter('retirado')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            activeFilter === 'retirado' 
              ? 'bg-emerald-50 border-emerald-400 shadow-xs' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[11px]">Entregues com Protocolo</span>
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-navy-900 mt-2">
            {correspondence.filter(c => c.status === 'retirado').length}
          </div>
          <span className="text-emerald-700 font-medium">Retirados pelos clientes</span>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'aguardando_retirada', label: 'Na Recepção' },
            { id: 'digitalizado', label: 'Digitalizadas' },
            { id: 'retirado', label: 'Entregues' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === f.id
                  ? 'bg-navy-950 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, remetente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Correspondence Items Cards/List */}
      {filteredList.length > 0 ? (
        <div className="space-y-3.5">
          {filteredList.map((item) => {
            const config = typeConfig[item.type] || typeConfig.carta;
            const Icon = config.icon;

            return (
              <div 
                key={item.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-orange-300 hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Left: Icon & Main info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${config.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${config.color}`}>
                        {config.label}
                      </span>
                      {item.priority === 'urgente' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                          Urgente
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {item.trackingCode}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm sm:text-base text-navy-900">
                      Remetente: <span className="text-slate-800">{item.sender}</span>
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-orange-600 font-semibold">
                      <Building className="w-3.5 h-3.5" />
                      <span>Destinatário: {item.companyName}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        Unidade: <strong className="text-slate-700">{item.coworkingLocation}</strong>
                      </span>
                      <span>•</span>
                      <span>Recebido: <strong className="text-slate-700">{item.receivedDate}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        Locker: <strong className="text-slate-700">{item.lockerNumber || 'Recepção Principal'}</strong>
                      </span>
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 italic mt-1">
                        Obs: "{item.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Status badge & Action buttons */}
                <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-start sm:items-center gap-2 self-stretch md:self-center shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {item.status === 'aguardando_retirada' && (
                    <>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                        Aguardando Retirada
                      </span>

                      <button
                        onClick={() => requestDigitalization(item.id)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-navy-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-orange-600" />
                        Digitalizar em PDF
                      </button>

                      <button
                        onClick={() => setAuthorizeModal(item)}
                        className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Autorizar Terceiro
                      </button>

                      {currentUser?.accountType === 'coworking_owner' && (
                        <button
                          onClick={() => markCorrespondenceAsRetrieved(item.id)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Dar Baixa
                        </button>
                      )}
                    </>
                  )}

                  {item.status === 'digitalizado' && (
                    <>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-navy-50 text-navy-900 border border-navy-200">
                        Digitalizado em PDF
                      </span>

                      <button
                        onClick={() => setPreviewDoc(item)}
                        className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Visualizar PDF
                      </button>

                      {currentUser?.accountType === 'coworking_owner' && (
                        <button
                          onClick={() => markCorrespondenceAsRetrieved(item.id)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                        >
                          Entregar Físico
                        </button>
                      )}
                    </>
                  )}

                  {item.status === 'retirado' && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Entregue no Balcão
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <Mail className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-navy-900">Nenhuma correspondência encontrada</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Não há correspondências cadastradas nesta categoria ou com estes termos de pesquisa.
          </p>
        </div>
      )}

      {/* Modal PDF Viewer */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
            <div className="bg-navy-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-sm">Visualização do Documento Escaneado</h3>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Remetente</span>
                  <strong className="text-navy-900">{previewDoc.sender}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Protocolo</span>
                  <strong className="font-mono text-orange-600">{previewDoc.trackingCode}</strong>
                </div>
              </div>

              <div className="border border-slate-300 rounded-xl p-6 bg-slate-100/60 min-h-[260px] flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-rose-500">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <strong className="text-sm text-navy-900 block">Documento_Oficial_Digitalizado.pdf</strong>
                  <span className="text-xs text-slate-500">Digitalização autenticada • Arquivo de alta definição</span>
                </div>
                <button
                  onClick={() => showToast('Download do PDF iniciado.', 'success')}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Baixar PDF Original
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Autorizar Terceiro */}
      {authorizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-navy-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-sm">Autorizar Retirada por Terceiro</h3>
              </div>
              <button onClick={() => setAuthorizeModal(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAuthorizeSubmit} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Informe os dados do portador que comparecerá à recepção da unidade para retirar o pacote <strong>{authorizeModal.trackingCode}</strong>.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo do Portador *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">CPF do Portador *</label>
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  value={authCpf}
                  onChange={e => setAuthCpf(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAuthorizeModal(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Gerar Autorização
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Entrada Correspondência */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-navy-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-sm">Entrada de Correspondência (Recepção)</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Empresa Destinatária *</label>
                <select
                  value={formCompanyId}
                  onChange={e => setFormCompanyId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden bg-white"
                >
                  {fiscalContracts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.cnpj})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unidade / Localidade de Recebimento</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={e => setFormLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Remetente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Receita Federal, Banco, Correios"
                    value={formSender}
                    onChange={e => setFormSender(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Código de Rastreio</label>
                  <input
                    type="text"
                    placeholder="BR-SEDEX-..."
                    value={formTracking}
                    onChange={e => setFormTracking(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as any)}
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden bg-white"
                  >
                    <option value="carta">Carta</option>
                    <option value="documento_fiscal">Doc. Fiscal</option>
                    <option value="notificacao_judicial">Notif. Judicial</option>
                    <option value="encomenda">Encomenda</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prioridade</label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as any)}
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden bg-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Locker / Armário</label>
                  <input
                    type="text"
                    value={formLocker}
                    onChange={e => setFormLocker(e.target.value)}
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações da Recepção</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Envelope lacrado recebido pelos Correios..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-xs"
                >
                  Salvar e Notificar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
