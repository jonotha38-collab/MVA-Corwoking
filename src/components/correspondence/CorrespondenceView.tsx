import { t } from '../../lib/preferences';
import React, { useState } from 'react';
import { isAdmin } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useCoworking } from '../../context/CoworkingContext';
import { Correspondence, CorrespondenceType, CorrespondenceStatus } from '../../types';
import { 
  Mail, 
  Package, 
  FileText, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  Plus, 
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
    completeDigitalization,
    markCorrespondenceAsRetrieved,
    showToast 
  } = useCoworking();

  const [activeFilter, setActiveFilter] = useState<'all' | CorrespondenceStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState<string | null>(null);
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
    if (!isAdmin(currentUser) && item.companyId !== currentCompany.id) {
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

  const uploadPrivateScan = async (item: Correspondence, file: File | null) => {
    if (!file || !isAdmin(currentUser)) return;
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf') || file.size > 10 * 1024 * 1024) {
      showToast('Escolha um PDF de até 10 MB.', 'error');
      return;
    }
    setUploadingPdf(item.id);
    try {
      const path = `contracts/${item.companyId}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage.from('fiscal-private').upload(path, file, {
        contentType: 'application/pdf', upsert: false
      });
      if (uploadError) throw uploadError;
      await completeDigitalization(item.id, path);
    } catch {
      showToast('Não foi possível enviar o PDF. Verifique o documento e tente novamente.', 'error');
    } finally { setUploadingPdf(null); }
  };

  const openPrivateScan = async (item: Correspondence) => {
    if (!item.digitalizedDocUrl || !item.digitalizedDocUrl.startsWith(`contracts/${item.companyId}/`)) {
      showToast('O arquivo digitalizado ainda não está disponível.', 'info');
      return;
    }
    const { data, error } = await supabase.storage.from('fiscal-private')
      .createSignedUrl(item.digitalizedDocUrl, 60);
    if (error || !data?.signedUrl) {
      showToast('Você não tem acesso a este documento ou sua sessão expirou.', 'error');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAuthorizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authName || !authCpf) return;
    showToast('Solicitação ainda não autoriza a retirada. Confirme a identidade e obtenha aprovação da recepção presencialmente.', 'info');
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
      
      {/* Top Banner - Professional Navy */}
      <div className="bg-gradient-to-br from-navy-900 to-navy-950 rounded-3xl p-8 sm:p-12 border border-navy-800 shadow-2xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30 backdrop-blur-md mb-4">
            <Mail className="w-4 h-4" />{t("Central de Recepção & Triagem de Correspondências ")}</div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">{t("Gestão Inteligente de ")}<br className="hidden sm:block" />{t("Correspondências ")}</h1>
          <p className="text-sm sm:text-base text-slate-300 mt-4 max-w-2xl font-medium leading-relaxed">{t("Recebimento diário pelas recepções dos coworkings, triagem protocolada, lockers protegidos e serviço de digitalização de documentos em PDF sob demanda. ")}</p>
        </div>

        {isAdmin(currentUser) && (
          <button
            onClick={() => setShowAddModal(true)}
            className="relative z-10 px-6 py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all hover:-translate-y-0.5 flex items-center gap-2 shrink-0"
          >
            <Plus className="w-5 h-5" />{t("Registrar Correspondência ")}</button>
        )}

        {/* Decorative background elements */}
        <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-orange-500/5 to-transparent pointer-events-none" />
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl opacity-60 pointer-events-none" />
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-sm">
        <div 
          onClick={() => setActiveFilter('aguardando_retirada')}
          className={`p-6 rounded-3xl border cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
            activeFilter === 'aguardando_retirada' 
              ? 'bg-gradient-to-br from-orange-50 to-white border-orange-400 shadow-lg shadow-orange-500/10' 
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="font-bold uppercase tracking-widest text-[10px] text-slate-400">{t("Aguardando Retirada ")}</span>
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="text-4xl font-bold text-navy-900 leading-none">
              {t(correspondence.filter(c => c.status === 'aguardando_retirada').length)}
            </div>
            <span className="text-orange-600 font-bold text-xs pb-1">{t("Disponíveis ")}</span>
          </div>
        </div>

        <div 
          onClick={() => setActiveFilter('digitalizado')}
          className={`p-6 rounded-3xl border cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
            activeFilter === 'digitalizado' 
              ? 'bg-gradient-to-br from-navy-50 to-white border-navy-400 shadow-lg shadow-navy-900/10' 
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="font-bold uppercase tracking-widest text-[10px] text-slate-400">{t("Digitalizados (PDF) ")}</span>
            <div className="w-10 h-10 rounded-xl bg-navy-100 flex items-center justify-center text-navy-800">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="text-4xl font-bold text-navy-900 leading-none">
              {t(correspondence.filter(c => c.status === 'digitalizado').length)}
            </div>
            <span className="text-navy-700 font-bold text-xs pb-1">{t("Para download ")}</span>
          </div>
        </div>

        <div 
          onClick={() => setActiveFilter('retirado')}
          className={`p-6 rounded-3xl border cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
            activeFilter === 'retirado' 
              ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-400 shadow-lg shadow-emerald-500/10' 
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="font-bold uppercase tracking-widest text-[10px] text-slate-400">{t("Entregues / Resolvidos ")}</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="text-4xl font-bold text-navy-900 leading-none">
              {t(correspondence.filter(c => c.status === 'retirado').length)}
            </div>
            <span className="text-emerald-600 font-bold text-xs pb-1">{t("Finalizados ")}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
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
                  ? 'bg-navy-950 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {t(f.label)}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={t("Buscar por código, remetente...")}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Correspondence Items Cards/List */}
      {t(filteredList.length > 0 ? (
        <div className="space-y-3.5">
          {filteredList.map((item) => {
            const config = typeConfig[item.type] || typeConfig.carta;
            const Icon = config.icon;

            return (
              <div 
                key={item.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:border-orange-300 hover:shadow-lg transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group"
              >
                {/* Left: Icon & Main info */}
                <div className="flex items-start gap-5 flex-1">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0 shadow-sm group-hover:scale-105 transition-transform ${config.color}`}>
                    <Icon className="w-7 h-7" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${config.color}`}>
                        {t(config.label)}
                      </span>
                      {item.priority === 'urgente' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-500" />{t("Urgente ")}</span>
                      )}
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {t(item.trackingCode)}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm sm:text-base text-navy-900">{t("Remetente: ")}<span className="text-slate-800">{t(item.sender)}</span>
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-orange-600 font-semibold">
                      <Building className="w-3.5 h-3.5" />
                      <span>{t("Destinatário: ")}{t(item.companyName)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />{t("Unidade: ")}<strong className="text-slate-700">{t(item.coworkingLocation)}</strong>
                      </span>
                      <span>•</span>
                      <span>{t("Recebido: ")}<strong className="text-slate-700">{t(item.receivedDate)}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />{t("Locker: ")}<strong className="text-slate-700">{item.lockerNumber || 'Recepção Principal'}</strong>
                      </span>
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 italic mt-1">{t("Obs: \" ")}{t(item.notes)}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Status badge & Action buttons */}
                <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-start sm:items-center gap-2 self-stretch md:self-center shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {item.status === 'aguardando_retirada' && (
                    <>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">{t("Aguardando Retirada ")}</span>

                      <button
                        type="button"
                        onClick={() => void requestDigitalization(item.id)}
                        disabled={item.digitalizationRequested}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-navy-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:cursor-default disabled:bg-emerald-50 disabled:text-emerald-800"
                      >
                        <FileText className="w-3.5 h-3.5 text-orange-600" />{t(item.digitalizationRequested ? 'Solicitação enviada' : 'Solicitar digitalização')}</button>

                      <button
                        onClick={() => setAuthorizeModal(item)}
                        className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5" />{t("Autorizar Terceiro ")}</button>

                      {isAdmin(currentUser) && (
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100">
                          <FileText className="h-4 w-4" />
                          {uploadingPdf===item.id ? 'Enviando…' : 'Anexar PDF privado'}
                          <input type="file" className="sr-only" accept=".pdf,application/pdf"
                            disabled={uploadingPdf!==null}
                            onChange={e=>{void uploadPrivateScan(item,e.target.files?.[0]||null);e.currentTarget.value=''}}/>
                        </label>
                      )}
                      {isAdmin(currentUser) && (
                        <button
                          onClick={() => markCorrespondenceAsRetrieved(item.id)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />{t("Dar Baixa ")}</button>
                      )}
                    </>
                  )}

                  {item.status === 'digitalizado' && (
                    <>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-navy-50 text-navy-900 border border-navy-200">{t("Digitalizado em PDF ")}</span>

                      <button
                        onClick={() => void openPrivateScan(item)}
                        className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />{t("Visualizar PDF ")}</button>

                      {isAdmin(currentUser) && (
                        <button
                          onClick={() => markCorrespondenceAsRetrieved(item.id)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                        >{t("Entregar Físico ")}</button>
                      )}
                    </>
                  )}

                  {item.status === 'retirado' && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />{t("Entregue no Balcão ")}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <Mail className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-navy-900">{t("Nenhuma correspondência encontrada ")}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">{t("Não há correspondências cadastradas nesta categoria ou com estes termos de pesquisa. ")}</p>
        </div>
      ))}

      {/* Modal Autorizar Terceiro */}
      {authorizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-navy-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-sm">{t("Autorizar Retirada por Terceiro ")}</h3>
              </div>
              <button onClick={() => setAuthorizeModal(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAuthorizeSubmit} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">{t("Informe os dados do portador que comparecerá à recepção da unidade para retirar o pacote ")}<strong>{t(authorizeModal.trackingCode)}</strong>.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Nome Completo do Portador * ")}</label>
                <input
                  type="text"
                  required
                  placeholder={t("Ex: Carlos Eduardo de Oliveira")}
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("CPF do Portador * ")}</label>
                <input
                  type="text"
                  required
                  placeholder={t("000.000.000-00")}
                  value={authCpf}
                  onChange={e => setAuthCpf(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAuthorizeModal(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >{t("Cancelar ")}</button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-sm"
                >{t("Gerar Autorização ")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Entrada Correspondência */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-navy-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-sm">{t("Entrada de Correspondência (Recepção) ")}</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Empresa Destinatária * ")}</label>
                <select
                  value={formCompanyId}
                  onChange={e => setFormCompanyId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                >
                  {fiscalContracts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.cnpj})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Unidade / Localidade de Recebimento ")}</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={e => setFormLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Remetente * ")}</label>
                  <input
                    type="text"
                    required
                    placeholder={t("Ex: Receita Federal, Banco, Correios")}
                    value={formSender}
                    onChange={e => setFormSender(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Código de Rastreio ")}</label>
                  <input
                    type="text"
                    placeholder={t("BR-SEDEX-...")}
                    value={formTracking}
                    onChange={e => setFormTracking(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Tipo ")}</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as any)}
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                  >
                    <option value="carta">{t("Carta ")}</option>
                    <option value="documento_fiscal">{t("Doc. Fiscal ")}</option>
                    <option value="notificacao_judicial">{t("Notif. Judicial ")}</option>
                    <option value="encomenda">{t("Encomenda ")}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Prioridade ")}</label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as any)}
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                  >
                    <option value="normal">{t("Normal ")}</option>
                    <option value="alta">{t("Alta ")}</option>
                    <option value="urgente">{t("Urgente ")}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Locker / Armário ")}</label>
                  <input
                    type="text"
                    value={formLocker}
                    onChange={e => setFormLocker(e.target.value)}
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Observações da Recepção ")}</label>
                <textarea
                  rows={2}
                  placeholder={t("Ex: Envelope lacrado recebido pelos Correios...")}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >{t("Cancelar ")}</button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-sm"
                >{t("Salvar e Notificar Cliente ")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
