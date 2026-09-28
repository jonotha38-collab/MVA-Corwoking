import React, { useState } from 'react';
import { useCoworking } from '../../context/CoworkingContext';
import { 
  ShieldCheck, 
  Building2, 
  FileText, 
  Check, 
  MapPin, 
  Printer, 
  QrCode, 
  Sparkles, 
  Scale, 
  Lock, 
  X,
  FileCheck,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const FiscalView: React.FC = () => {
  const { currentCompany, fiscalContracts, addFiscalContract, showToast } = useCoworking();

  const [showContractModal, setShowContractModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedPlanForHire, setSelectedPlanForHire] = useState('Fiscal + Correspondência VIP');

  // Hire Form State
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newTradingName, setNewTradingName] = useState('');
  const [newCnpj, setNewCnpj] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('MVA Sede: Rua Dom José Thomaz, 565 - São José, Aracaju - SE');

  const plans = [
    {
      name: 'Básico Fiscal',
      price: 129,
      period: 'por mês no plano anual',
      badge: 'Essencial',
      popular: false,
      features: [
        'Registro de CNPJ e Inscrição Municipal na Sede MVA',
        'Alvará de Funcionamento aprovado na Prefeitura',
        'Recebimento de cartas comerciais e órgãos públicos',
        'Notificação em tempo real de correspondência',
        'Declaração de domicílio fiscal imediata',
        'Desconto de 10% na reserva de salas'
      ]
    },
    {
      name: 'Fiscal + Correspondência VIP',
      price: 189,
      period: 'por mês no plano anual',
      badge: 'Mais Escolhido',
      popular: true,
      features: [
        'Tudo do Plano Básico Fiscal',
        'Gestão e guarda de Encomendas & Sedex',
        'Digitalização de documentos em PDF de alta resolução',
        'Armário/Locker exclusivo na recepção',
        '4 horas mensais de Sala de Reunião inclusas',
        'Recepção física e controle de visitantes',
        'Desconto de 20% em horas avulsas de salas'
      ]
    },
    {
      name: 'Combo Fiscal + 10h Reunião',
      price: 249,
      period: 'por mês no plano anual',
      badge: 'Solução Completa',
      popular: false,
      features: [
        'Tudo do Plano Fiscal VIP',
        '10 horas mensais de Salas de Reunião ou Atendimento',
        'Acesso livre às áreas de Lounge e Café especial',
        'Atendimento telefônico e recepção personalizada',
        'Desconto de 30% em auditórios e eventos'
      ]
    }
  ];

  const handleHireSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName || !newCnpj) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    const planObj = plans.find(p => p.name === selectedPlanForHire) || plans[1];

    addFiscalContract({
      companyName: newCompanyName,
      tradingName: newTradingName || newCompanyName,
      cnpj: newCnpj,
      contactEmail: newEmail,
      contactPhone: newPhone,
      planName: selectedPlanForHire,
      coworkingProviderName: 'MVA Coworking Sede',
      unitAddress: selectedUnit,
      monthlyFee: planObj.price
    });

    setShowContractModal(false);
    showToast('Contrato firmado! Seu comprovante de domicílio fiscal foi liberado.', 'success');

    try {
      confetti({ particleCount: 70, spread: 60 });
    } catch {
      // safe fallback
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Overview Hero - Minimalist Deep Navy & Orange */}
      <div className="bg-navy-950 text-white rounded-3xl p-6 sm:p-10 border border-navy-800 shadow-md relative overflow-hidden">
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
            <span>Endereço Fiscal Homologado • Sede MVA Rua Dom José Thomaz, 565</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Panorama do Endereço Fiscal & Domicílio Tributário
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Abra ou regularize seu CNPJ com endereço fiscal na Sede MVA (Rua Dom José Thomaz, 565) ou na rede de coworkings credenciados. Economize com aluguel tradicional, proteja sua privacidade residencial e garanta aprovação imediata do alvará de funcionamento.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => {
                setSelectedPlanForHire('Fiscal + Correspondência VIP');
                setShowContractModal(true);
              }}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-orange-500/25 transition-all flex items-center gap-2"
            >
              <FileCheck className="w-4 h-4" />
              Contratar Endereço Fiscal Online
            </button>
            <button
              onClick={() => setShowCertificateModal(true)}
              className="px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white border border-navy-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4 text-orange-400" />
              Emitir Declaração de Domicílio
            </button>
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-orange-500/10 to-transparent pointer-events-none" />
      </div>

      {/* Active Contract Panorama Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                Status do Domicílio Fiscal Ativo
              </span>
              <h2 className="text-xl font-bold text-navy-900">{currentCompany.companyName}</h2>
              <p className="text-xs text-slate-500">
                CNPJ: {currentCompany.cnpj} • Plano: <strong className="text-slate-700">{currentCompany.planName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Regularizado na Receita
            </span>
            <button
              onClick={() => setShowCertificateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-orange-400" />
              Ver Declaração Oficial
            </button>
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Endereço Registrado</span>
            <div className="text-xs font-bold text-navy-900 flex items-start gap-1.5">
              <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <span>{currentCompany.unitAddress}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Alvará & Prefeitura</span>
            <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Aprovado ({currentCompany.alvaraProtocol})</span>
            </div>
            <p className="text-[10px] text-slate-400">Regular para emissão de notas fiscais</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Vigência Contratual</span>
            <div className="text-xs font-bold text-navy-900">
              {currentCompany.startDate.split('-').reverse().join('/')} até {currentCompany.renewalDate.split('-').reverse().join('/')}
            </div>
            <p className="text-[10px] text-slate-400">Renovação anual com emissão automática</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Crédito de Reunião Inclusas</span>
            <div className="text-xs font-bold text-navy-900 flex items-center justify-between">
              <span>{currentCompany.meetingHoursUsed}h usadas de {currentCompany.meetingHoursAllowance}h</span>
              <span className="text-orange-600 font-bold">
                {currentCompany.meetingHoursAllowance - currentCompany.meetingHoursUsed}h livres
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
              <div 
                className="bg-orange-500 h-1.5 rounded-full" 
                style={{ width: `${(currentCompany.meetingHoursUsed / Math.max(1, currentCompany.meetingHoursAllowance)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Explanatory Cards: Fiscal vs Comercial */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-navy-950 text-orange-400 flex items-center justify-center font-bold">
            <Scale className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-navy-900">O que é Endereço Fiscal?</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            É o endereço obrigatório registrado formalmente perante os órgãos públicos: <strong>Receita Federal</strong>, <strong>Junta Comercial</strong> e <strong>Prefeitura Municipal</strong>. Ele serve para fins tributários, alvarás e notificações legais.
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5 pt-1">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Imprescindível para emissão do CNPJ e Inscrição Municipal</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Evita expor o endereço da sua residência na internet</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Totalmente legalizado com declaração de domicílio oficial</span>
            </li>
          </ul>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-navy-900">E o Endereço Comercial?</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            É o endereço corporativo de prestígio que você divulga em seus canais comerciais, cartões de visita e apresentações. Na MVA, os dois funcionam juntos: você conta com o endereço e ainda pode receber seus clientes nas salas de reunião no mesmo local.
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5 pt-1">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Localização de prestígio na Rua Dom José Thomaz, 565</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Recebimento diário de correspondências e encomendas</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Digitalização imediata de cartas em alta resolução (PDF)</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Planos de Endereço Fiscal */}
      <div className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <span className="text-xs font-bold text-orange-600 tracking-wider uppercase">Planos Corporativos</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900">
            Planos de Domicílio Fiscal MVA
          </h2>
          <p className="text-xs text-slate-500">
            Contratação online simples, sem burocracia e com liberação imediata da declaração.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 relative ${
                plan.popular
                  ? 'bg-navy-950 text-white shadow-xl ring-2 ring-orange-500'
                  : 'bg-white text-navy-900 border border-slate-200 shadow-xs hover:shadow-md'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-orange-600 text-white text-[10px] font-extrabold uppercase rounded-full shadow-md">
                  {plan.badge}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-base">{plan.name}</h3>
                  {!plan.popular && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-semibold">R$</span>
                    <span className="text-3xl font-black">{plan.price}</span>
                    <span className={`text-xs ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                      /mês
                    </span>
                  </div>
                  <span className={`text-[10px] ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                    {plan.period}
                  </span>
                </div>

                <div className={`space-y-3 text-xs mb-8 border-t pt-5 ${plan.popular ? 'border-navy-800' : 'border-slate-100'}`}>
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plan.popular ? 'text-orange-400' : 'text-emerald-600'}`} />
                      <span className={plan.popular ? 'text-slate-300' : 'text-slate-600'}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedPlanForHire(plan.name);
                  setShowContractModal(true);
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  plan.popular
                    ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                <span>Contratar {plan.name}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Declaração Oficial de Domicílio Fiscal */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
            <div className="bg-navy-950 text-white p-5 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-sm">Declaração de Domicílio Fiscal • Sede MVA</h3>
              </div>
              <button onClick={() => setShowCertificateModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 sm:p-10 space-y-6 text-slate-800 font-serif leading-relaxed text-xs sm:text-sm">
              <div className="text-center border-b border-slate-300 pb-5 space-y-1">
                <div className="font-sans text-xl font-extrabold tracking-tight text-navy-900">
                  MVA COWORKING & BUSINESS CENTER
                </div>
                <div className="text-[11px] font-sans text-orange-600 uppercase tracking-widest font-bold">
                  Sede Oficial: Rua Dom José Thomaz, 565 - São José, Aracaju - SE
                </div>
                <div className="text-[10px] font-sans text-slate-400">
                  CNPJ Mantenedora: 31.849.201/0001-55 • Protocolo JUCESE / Receita Federal
                </div>
              </div>

              <div className="text-center py-2">
                <h4 className="text-base font-bold font-sans tracking-wide uppercase text-navy-900">
                  DECLARAÇÃO DE DOMICÍLIO FISCAL E CONCESSÃO DE ENDEREÇO
                </h4>
                <p className="text-[11px] font-sans text-slate-500">
                  Protocolo Oficial: {currentCompany.alvaraProtocol}
                </p>
              </div>

              <p className="text-justify indent-6">
                Declaramos para os devidos fins legais, perante a <strong>Receita Federal do Brasil</strong>, 
                <strong>Junta Comercial do Estado</strong> e <strong>Secretaria Municipal da Fazenda</strong>, que a sociedade empresária:
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-sans space-y-1.5 text-xs">
                <div><strong>Razão Social:</strong> {currentCompany.companyName}</div>
                <div><strong>Nome Fantasia:</strong> {currentCompany.tradingName}</div>
                <div><strong>CNPJ:</strong> {currentCompany.cnpj}</div>
                <div><strong>Endereço Sede Autorizado:</strong> Rua Dom José Thomaz, 565 - Bairro São José, Aracaju - SE, CEP 49015-090</div>
                <div><strong>Plano Contratado:</strong> {currentCompany.planName}</div>
                <div><strong>Vigência:</strong> {currentCompany.startDate} a {currentCompany.renewalDate}</div>
              </div>

              <p className="text-justify indent-6">
                Encontra-se devidamente autorizada a utilizar as dependências do imóvel supracitado na <strong>Rua Dom José Thomaz, 565</strong> como seu 
                <strong> Domicílio Fiscal e Comercial</strong>, autorizada expressamente para alvarás e recebimento de notificações administrativas e judiciais.
              </p>

              <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-200 font-sans text-xs">
                <div className="flex items-center gap-3">
                  <QrCode className="w-16 h-16 p-1 border border-slate-300 rounded" />
                  <div>
                    <span className="font-bold block text-navy-900">Autenticação MVA</span>
                    <span className="text-[10px] text-slate-500 block">Código: {currentCompany.id.toUpperCase()}-SEDE</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">Documento assinado digitalmente</span>
                  </div>
                </div>

                <div className="text-center sm:text-right">
                  <div className="font-semibold text-navy-900">Diretoria Executiva</div>
                  <div className="text-slate-500 text-[11px]">MVA Coworking Sede</div>
                  <div className="text-slate-400 text-[10px]">{new Date().toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-100 p-4 px-6 flex justify-end gap-3 no-print">
              <button
                type="button"
                onClick={() => setShowCertificateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-xs flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimir ou Salvar em PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Contratação */}
      {showContractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl my-8 overflow-hidden">
            <div className="bg-navy-950 text-white p-6 relative">
              <button
                onClick={() => setShowContractModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-xs text-orange-400 font-bold uppercase tracking-wider">Adesão Online</span>
              <h3 className="text-xl font-bold mt-1">Aderir ao {selectedPlanForHire}</h3>
              <p className="text-xs text-slate-300 mt-1">
                Cadastre os dados da sua empresa para emissão da autorização de domicílio fiscal.
              </p>
            </div>

            <form onSubmit={handleHireSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Razão Social da Empresa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Tech Solutions Brasil LTDA"
                  value={newCompanyName}
                  onChange={e => setNewCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    placeholder="Ex: Tech Solutions"
                    value={newTradingName}
                    onChange={e => setNewTradingName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CNPJ (ou "Em Abertura") *</label>
                  <input
                    type="text"
                    required
                    placeholder="00.000.000/0001-00"
                    value={newCnpj}
                    onChange={e => setNewCnpj(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">E-mail para Notificações *</label>
                  <input
                    type="email"
                    required
                    placeholder="contato@empresa.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp / Telefone *</label>
                  <input
                    type="text"
                    required
                    placeholder="(79) 99999-9999"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unidade Desejada *</label>
                <select
                  value={selectedUnit}
                  onChange={e => setSelectedUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden bg-white"
                >
                  <option value="MVA Sede: Rua Dom José Thomaz, 565 - São José, Aracaju - SE">
                    MVA Coworking (Sede Oficial) - Rua Dom José Thomaz, 565 - Aracaju/SE
                  </option>
                  <option value="NexWork Coworking: Av. Paulista, 1471 - Bela Vista, São Paulo - SP">
                    NexWork Coworking (Parceiro Credenciado) - Av. Paulista, 1471 - São Paulo/SP
                  </option>
                  <option value="Savassi Tech Hub: Rua Pernambuco, 353 - Savassi, Belo Horizonte - MG">
                    Savassi Tech Hub (Parceiro Credenciado) - Rua Pernambuco, 353 - Belo Horizonte/MG
                  </option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowContractModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-md transition-all"
                >
                  Confirmar Contratação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
