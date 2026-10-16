import { t } from '../../lib/preferences';
import { BlurReveal } from '../ui/BlurReveal';
import { Reveal } from '../ui/Reveal';
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
  Calendar,
  Megaphone,
  Shield,
  ArrowRight,
  Gift,
  MessageCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const FiscalView: React.FC = () => {
  const { currentCompany, addFiscalContract, showToast } = useCoworking();

  const [showContractModal, setShowContractModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showSpecialistModal, setShowSpecialistModal] = useState(false);
  const [selectedPlanForHire, setSelectedPlanForHire] = useState('Endereço Fiscal');
  const [isTransferPromo, setIsTransferPromo] = useState(false);
  const [previousCoworking, setPreviousCoworking] = useState('');

  // Hire Form State
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newTradingName, setNewTradingName] = useState('');
  const [newCnpj, setNewCnpj] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('MVA Sede: Rua Dom José Thomaz, 565 - São José, Aracaju - SE');

  // Specialist Form State
  const [specName, setSpecName] = useState('');
  const [specPhone, setSpecPhone] = useState('');
  const [specEmail, setSpecEmail] = useState('');
  const [specCount, setSpecCount] = useState('2');

  const plans = [
    {
      id: 'comercial',
      name: 'Endereço Comercial',
      price: 29.9,
      totalAnnual: 358.8,
      periodText: '12x R$ 29,90 /mês',
      annualText: 'Preço total anual R$ 358,80',
      description: 'Para você que precisa divulgar a sua empresa e conquistar novos mercados.',
      icon: Megaphone,
      popular: false,
      features: [
        'Divulgação em cartões, site e redes sociais',
        'Recebimento e guarda de correspondências e encomendas',
        'Notificação por e-mail e WhatsApp a cada entrega',
        'Endereço de prestígio na Rua Dom José Thomaz, 565',
        'Desconto de 10% na reserva de salas'
      ]
    },
    {
      id: 'fiscal',
      name: 'Endereço Fiscal',
      price: 80,
      totalAnnual: 960,
      periodText: '12x R$ 80 /mês',
      annualText: 'Preço total anual R$ 960',
      description: 'Para você que está abrindo ou alterando empresa e quer emitir notas fiscais.',
      icon: Shield,
      popular: true,
      badge: 'Mais Escolhido',
      features: [
        'Abertura de CNPJ e Inscrição Municipal oficial',
        'Emissão de notas fiscais de serviço (ISS)',
        'Alvará de Funcionamento aprovado na Prefeitura',
        'Declaração oficial de domicílio fiscal imediata',
        'Recebimento e guarda de cartas e notificações fiscais',
        'Desconto de 20% em salas de reunião'
      ]
    },
    {
      id: 'fiscal_ie',
      name: 'Endereço Fiscal com Inscrição Estadual',
      price: 120,
      totalAnnual: 1440,
      periodText: '12x R$ 120 /mês',
      annualText: 'Preço total anual R$ 1.440',
      description: 'Para você que tem um comércio ou contribui com o ICMS.',
      icon: ShieldCheck,
      popular: false,
      badge: 'Comércio / ICMS',
      features: [
        'Apto para Comércio, E-commerce e ICMS (SEFAZ)',
        'Homologação de Inscrição Estadual garantida',
        'Alvará com viabilidade técnica aprovada',
        'Emissão regular de NFe de mercadorias',
        'Gestão de encomendas e correspondências fiscais',
        '2 horas mensais de Sala de Reunião cortesia'
      ]
    },
    {
      id: 'multi',
      name: '2 ou mais endereços',
      price: 0,
      totalAnnual: 0,
      isCustom: true,
      periodText: 'preço',
      annualText: 'personalizado',
      description: 'Para quem precisa de mais Endereços Fiscais ou Comerciais, com condição especial na contratação.',
      icon: MapPin,
      popular: false,
      badge: 'Condição Especial',
      features: [
        'Combinação de múltiplos endereços (matriz e filiais)',
        'Descontos progressivos por quantidade de CNPJs',
        'Faturamento unificado em boleto ou cartão',
        'Assessoria dedicada para a documentação',
        'Suporte prioritário com especialista MVA'
      ]
    }
  ];

  const handleHireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName || !newCnpj) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    const planObj = plans.find(p => p.name === selectedPlanForHire) || plans[1];

    const saved = await addFiscalContract({
      companyName: newCompanyName,
      tradingName: newTradingName || newCompanyName,
      cnpj: newCnpj,
      contactEmail: newEmail,
      contactPhone: newPhone,
      planName: `${selectedPlanForHire}${isTransferPromo ? ' [Portabilidade 4 Meses Grátis]' : ''}`,
      coworkingProviderName: 'MVA Coworking Sede',
      unitAddress: selectedUnit,
      monthlyFee: planObj.price
    });

    if (!saved) return;
    setShowContractModal(false);
    showToast(
      isTransferPromo 
        ? 'Contrato firmado! Promoção de 4 meses grátis de portabilidade ativada com sucesso!' 
        : 'Contrato firmado! Seu comprovante de domicílio fiscal foi liberado.', 
      'success'
    );

    try {
      confetti({ particleCount: 45, spread: 55, disableForReducedMotion: true });
    } catch {
      // safe fallback
    }
  };

  return (
    <div className="space-y-12 pb-12">
      
      {/* Top Overview Hero - Minimalist Deep Navy & Orange com Imagem de Fundo em Degradê */}
      <div className="hero-shell bg-navy-950 text-white p-6 py-10 sm:p-12 sm:py-16 relative overflow-hidden">
        
        {/* Background Image com Degradê Suave */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <img
            src="/hero-office.jpg"
            alt={t("Sede MVA Coworking")}
            className="absolute right-0 top-0 h-full w-full md:w-3/5 lg:w-1/2 object-cover object-center opacity-50 md:opacity-70 filter contrast-105"
          />
          {/* Máscaras em Degradê: do azul escuro para a foto */}
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/90 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-transparent to-navy-950/40" />
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="max-w-3xl space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-orange-400" />
            <span>{t("Endereço Fiscal Homologado • Sede MVA Rua Dom José Thomaz, 565 ")}</span>
          </div>

          <BlurReveal as="h1" className="hero-title max-w-2xl">{t("Seu endereço profissional. O próximo passo da sua empresa. ")}</BlurReveal>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-medium">{t("Abra ou regularize seu CNPJ na sede MVA ou rede parceira. Reduza custos, preserve seu endereço residencial e reúna os serviços da sua empresa em um só lugar. ")}</p>

          <div className="pt-4 flex flex-col sm:flex-row flex-wrap gap-4">
            <button
              onClick={() => {
                setSelectedPlanForHire('Endereço Fiscal');
                setIsTransferPromo(false);
                setShowContractModal(true);
              }}
              className="action-primary px-6 py-3.5 text-sm"
            >
              <FileCheck className="w-5 h-5" />{t("Contratar Endereço Fiscal Online ")}</button>
            <button
              onClick={() => setShowCertificateModal(true)}
              className="px-6 py-3.5 bg-navy-900/80 hover:bg-navy-800 text-white border border-navy-700/80 backdrop-blur-md rounded-xl text-sm font-bold shadow-lg transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5 text-orange-400" />{t("Emitir Declaração Oficial ")}</button>
          </div>
        </div>
      </div>

      {currentCompany.id && (
      <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xl shadow-slate-200/40 space-y-8 relative overflow-hidden">
        {/* Subtle decorative background for the card */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-slate-50 to-orange-50 rounded-bl-[100px] -z-10 pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0 shadow-sm">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block mb-1">{t("Status do Domicílio Fiscal Ativo ")}</span>
              <h2 className="text-2xl font-bold text-navy-900 tracking-tight">{currentCompany.companyName}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{t("CNPJ: ")}<span className="font-mono">{currentCompany.cnpj}</span>{t("• Plano: ")}<strong className="text-slate-700">{t(currentCompany.planName)}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-3">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>{t("Regularizado na Receita ")}</span>
            <button
              onClick={() => setShowCertificateModal(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors hover:-translate-y-0.5"
            >
              <FileText className="w-4 h-4 text-orange-400" />{t("Ver Declaração Oficial ")}</button>
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-sm relative z-10">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2 hover:border-orange-300 transition-colors">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t("Endereço Registrado ")}</span>
            <div className="text-sm font-bold text-navy-900 flex items-start gap-2">
              <MapPin className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <span className="leading-tight">{currentCompany.unitAddress}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2 hover:border-emerald-300 transition-colors">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t("Alvará & Prefeitura ")}</span>
            <div className="text-sm font-bold text-emerald-700 flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-500 bg-emerald-100 rounded-full p-0.5" />
              <span>{t("Aprovado ( ")}{t(currentCompany.alvaraProtocol)})</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">{t("Regular para emissão de notas fiscais ")}</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2 hover:border-navy-300 transition-colors">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t("Vigência Contratual ")}</span>
            <div className="text-sm font-bold text-navy-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-navy-400" />
              <span>{t(currentCompany.startDate.split('-').reverse().join('/'))}{t("a")}{t(currentCompany.renewalDate.split('-').reverse().join('/'))}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">{t("Renovação anual automática ")}</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2 hover:border-orange-300 transition-colors flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t("Crédito de Reunião ")}</span>
              <div className="text-sm font-bold text-navy-900 flex items-center justify-between">
                <span>{t(currentCompany.meetingHoursUsed)}{t("h /")}{t(currentCompany.meetingHoursAllowance)}{t("h")}</span>
                <span className="text-orange-600 font-bold">
                  {currentCompany.meetingHoursAllowance - currentCompany.meetingHoursUsed}{t("h livres")}</span>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-orange-400 to-orange-500 h-full rounded-full transition-all duration-1000" 
                style={{ width: `${(currentCompany.meetingHoursUsed / Math.max(1, currentCompany.meetingHoursAllowance)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Explanatory Cards: Fiscal vs Comercial */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-navy-950 text-orange-400 flex items-center justify-center font-bold">
            <Scale className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-navy-900">{t("O que é Endereço Fiscal? ")}</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{t("É o endereço obrigatório registrado formalmente perante os órgãos públicos: ")}<strong>{t("Receita Federal ")}</strong>, <strong>{t("Junta Comercial ")}</strong>{t("e ")}<strong>{t("Prefeitura Municipal ")}</strong>{t(". Ele serve para fins tributários, alvarás e notificações legais. ")}</p>
          <ul className="text-xs text-slate-600 space-y-1.5 pt-1">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{t("Imprescindível para emissão do CNPJ e Inscrição Municipal ")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{t("Evita expor o endereço da sua residência na internet ")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{t("Totalmente legalizado com declaração de domicílio oficial ")}</span>
            </li>
          </ul>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-navy-900">{t("E o Endereço Comercial? ")}</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{t("É o endereço corporativo de prestígio que você divulga em seus canais comerciais, cartões de visita e apresentações. Na MVA, os dois funcionam juntos: você conta com o endereço e ainda pode receber seus clientes nas salas de reunião no mesmo local. ")}</p>
          <ul className="text-xs text-slate-600 space-y-1.5 pt-1">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{t("Localização de prestígio na Rua Dom José Thomaz, 565 ")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{t("Recebimento diário de correspondências e encomendas ")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{t("Digitalização imediata de cartas em alta resolução (PDF) ")}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Promoção de Portabilidade: 4 Meses Grátis - Azul Escuro com Laranja */}
      <div className="bg-gradient-to-br from-navy-900 via-navy-950 to-[#0a192f] rounded-3xl p-6 sm:p-8 text-white border border-navy-800 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-orange-500/15 border border-orange-500/30 px-3.5 py-1 rounded-full text-xs font-bold text-orange-400 tracking-wide uppercase">
              <Gift className="w-4 h-4 text-orange-400" />
              <span>{t("Campanha Exclusiva de Portabilidade ")}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-white">{t("Já tem endereço fiscal? Mude para a MVA e ganhe ")}<span className="text-orange-500 underline decoration-orange-500/50 decoration-2 underline-offset-4">{t("4 MESES GRÁTIS! ")}</span>
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">{t("Se sua empresa já tem endereço fiscal em outro coworking ou escritório virtual e você quer pagar menos com melhor estrutura, transfira seu CNPJ para a MVA. Você ganha ")}<strong className="text-white">{t("4 meses de isenção total ")}</strong>{t("no plano anual e nosso time orienta toda a migração junto à Prefeitura e Junta Comercial. ")}</p>
          </div>
          <button
            onClick={() => {
              setIsTransferPromo(true);
              setSelectedPlanForHire('Endereço Fiscal');
              setShowContractModal(true);
            }}
            className="shrink-0 px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all flex items-center gap-2 hover:-translate-y-0.5"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>{t("Transferir CNPJ (4 Meses Grátis) ")}</span>
          </button>
        </div>
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Planos de Endereço Fiscal - 4 Colunas Inspiradas na Referência */}
      <div className="space-y-6">
        <Reveal className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold text-orange-600 tracking-wider uppercase">{t("Planos Corporativos Acessíveis ")}</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-navy-900">{t("Escolha o Plano Ideal para a sua Empresa ")}</h2>
          <p className="text-sm text-slate-500">{t("Planos simplificados, preços transparentes e sem burocracia para emissão do seu alvará. ")}</p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`surface-card rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 relative border ${
                  plan.popular
                    ? 'bg-white border-orange-600 shadow-sm ring-1 ring-orange-600/20'
                    : 'bg-white border-slate-200/90 shadow-sm hover:shadow-lg hover:border-slate-300'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-orange-500 text-white text-[10px] font-bold uppercase rounded-full shadow-md">
                    {t(plan.badge)}
                  </div>
                )}

                <div>
                  {/* Top Icon Circle */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-colors ${plan.popular ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-navy-50 text-navy-900 border border-navy-100'}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-slate-900 leading-snug mb-3">
                    {t(plan.name)}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-slate-500 leading-relaxed mb-6 min-h-[48px]">
                    {t(plan.description)}
                  </p>

                  {/* Price Block */}
                  <div className="mb-6 pt-2 border-t border-slate-100">
                    {t(plan.isCustom ? (
                      <div className="space-y-0.5">
                        <span className="text-xs text-slate-400 block">{t("preço ")}</span>
                        <div className="text-2xl font-bold text-navy-900">{t("personalizado ")}</div>
                        <span className="text-[11px] text-slate-400 block mt-1">{t("sob consulta ")}</span>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="text-2xl font-bold text-navy-900">
                          {t(plan.periodText)}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {t(plan.annualText)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Features list */}
                  <div className="space-y-2.5 text-xs mb-8 border-t border-slate-100 pt-5">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                        <span className="text-slate-600 leading-tight">{t(f)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botões Uniformes: Azul Escuro com Laranja */}
                <div>
                  {t(plan.isCustom ? (
                    <button
                      onClick={() => setShowSpecialistModal(true)}
                      className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-navy-900 hover:bg-orange-500 transition-all flex items-center justify-center gap-2 shadow-sm group"
                    >
                      <span>{t("Fale com especialista ")}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedPlanForHire(plan.name);
                        setIsTransferPromo(false);
                        setShowContractModal(true);
                      }}
                      className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 group ${
                        plan.popular
                          ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 hover:shadow-orange-500/30'
                          : 'bg-navy-900 hover:bg-orange-500 text-white shadow-sm'
                      }`}
                    >
                      <span>{t("Contratar plano ")}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Declaração Oficial de Domicílio Fiscal */}
      {showCertificateModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowCertificateModal(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-lg border border-slate-200 w-full max-w-2xl my-8 overflow-hidden cursor-default"
          >
            <div className="bg-navy-950 text-white p-5 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-sm">{t("Declaração de Domicílio Fiscal • Sede MVA ")}</h3>
              </div>
              <button onClick={() => setShowCertificateModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 sm:p-10 space-y-6 text-slate-800 font-serif leading-relaxed text-xs sm:text-sm">
              <div className="text-center border-b border-slate-300 pb-5 space-y-1">
                <div className="font-sans text-xl font-bold tracking-tight text-navy-900">{t("MVA COWORKING & BUSINESS CENTER ")}</div>
                <div className="text-[11px] font-sans text-orange-600 uppercase tracking-widest font-bold">{t("Sede Oficial: Rua Dom José Thomaz, 565 - São José, Aracaju - SE ")}</div>
                <div className="text-[10px] font-sans text-slate-400">{t("CNPJ Mantenedora: 31.849.201/0001-55 • Protocolo JUCESE / Receita Federal ")}</div>
              </div>

              <div className="text-center py-2">
                <h4 className="text-base font-bold font-sans tracking-wide uppercase text-navy-900">{t("DECLARAÇÃO DE DOMICÍLIO FISCAL E CONCESSÃO DE ENDEREÇO ")}</h4>
                <p className="text-[11px] font-sans text-slate-500">{t("Protocolo Oficial: ")}{t(currentCompany.alvaraProtocol)}
                </p>
              </div>

              <p className="text-justify indent-6">{t("Declaramos para os devidos fins legais, perante a ")}<strong>{t("Receita Federal do Brasil ")}</strong>, 
                <strong>{t("Junta Comercial do Estado ")}</strong>{t("e ")}<strong>{t("Secretaria Municipal da Fazenda ")}</strong>{t(", que a sociedade empresária: ")}</p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-sans space-y-1.5 text-xs">
                <div><strong>{t("Razão Social: ")}</strong> {currentCompany.companyName}</div>
                <div><strong>{t("Nome Fantasia: ")}</strong> {currentCompany.tradingName}</div>
                <div><strong>{t("CNPJ: ")}</strong> {currentCompany.cnpj}</div>
                <div><strong>{t("Endereço Sede Autorizado: ")}</strong>{t("Rua Dom José Thomaz, 565 - Bairro São José, Aracaju - SE, CEP 49015-090 ")}</div>
                <div><strong>{t("Plano Contratado: ")}</strong> {t(currentCompany.planName)}</div>
                <div><strong>{t("Vigência: ")}</strong> {t(currentCompany.startDate)}{t("a")}{t(currentCompany.renewalDate)}</div>
              </div>

              <p className="text-justify indent-6">{t("Encontra-se devidamente autorizada a utilizar as dependências do imóvel supracitado na ")}<strong>{t("Rua Dom José Thomaz, 565 ")}</strong>{t("como seu ")}<strong>{t("Domicílio Fiscal e Comercial ")}</strong>{t(", autorizada expressamente para alvarás e recebimento de notificações administrativas e judiciais. ")}</p>

              <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-200 font-sans text-xs">
                <div className="flex items-center gap-3">
                  <QrCode className="w-16 h-16 p-1 border border-slate-300 rounded" />
                  <div>
                    <span className="font-bold block text-navy-900">{t("Autenticação MVA ")}</span>
                    <span className="text-[10px] text-slate-500 block">{t("Código: ")}{t(currentCompany.id.toUpperCase())}{t("-SEDE")}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">{t("Documento assinado digitalmente ")}</span>
                  </div>
                </div>

                <div className="text-center sm:text-right">
                  <div className="font-semibold text-navy-900">{t("Diretoria Executiva ")}</div>
                  <div className="text-slate-500 text-[11px]">{t("MVA Coworking Sede ")}</div>
                  <div className="text-slate-400 text-[10px]">{t(new Date().toLocaleDateString('pt-BR'))}</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-100 p-4 px-6 flex justify-end gap-3 no-print">
              <button
                type="button"
                onClick={() => setShowCertificateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >{t("Fechar ")}</button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-sm flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />{t("Imprimir ou Salvar em PDF ")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Contratação com Opção de Portabilidade */}
      {showContractModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowContractModal(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-lg border border-slate-200 w-full max-w-xl my-8 overflow-hidden cursor-default"
          >
            <div className="bg-navy-950 text-white p-6 relative">
              <button
                onClick={() => setShowContractModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-xs text-orange-400 font-bold uppercase tracking-wider">{t("Adesão Online ")}</span>
              <h3 className="text-xl font-bold mt-1">{t("Aderir ao ")}{t(selectedPlanForHire)}</h3>
              <p className="text-xs text-slate-300 mt-1">{t("Cadastre os dados da sua empresa para emissão da autorização de domicílio fiscal. ")}</p>
            </div>

            <form onSubmit={handleHireSubmit} className="p-6 space-y-4 text-xs">
              {/* Opção / Banner de Portabilidade */}
              <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-xs leading-relaxed transition-all ${isTransferPromo ? 'border-orange-500 bg-orange-50/80 text-orange-950 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                <input
                  type="checkbox"
                  checked={isTransferPromo}
                  onChange={(e) => setIsTransferPromo(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-orange-600"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-orange-900">
                    <Gift className="w-4 h-4 text-orange-600" />
                    <span>{t("Estou transferindo meu endereço de outro local (Ganhar 4 meses grátis!) ")}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{t("Migre seu CNPJ para a MVA e pague apenas 8 parcelas no plano anual de 12 meses. ")}</p>
                </div>
              </label>

              {isTransferPromo && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Nome do Coworking ou Endereço Atual (onde está o CNPJ hoje) ")}</label>
                  <input
                    type="text"
                    placeholder={t("Ex: Coworking X, Centro, Aracaju...")}
                    value={previousCoworking}
                    onChange={e => setPreviousCoworking(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Razão Social da Empresa * ")}</label>
                <input
                  type="text"
                  required
                  placeholder={t("Ex: Tech Solutions Brasil LTDA")}
                  value={newCompanyName}
                  onChange={e => setNewCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Nome Fantasia ")}</label>
                  <input
                    type="text"
                    placeholder={t("Ex: Tech Solutions")}
                    value={newTradingName}
                    onChange={e => setNewTradingName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("CNPJ (ou \"Em Abertura\") * ")}</label>
                  <input
                    type="text"
                    required
                    placeholder={t("00.000.000/0001-00")}
                    value={newCnpj}
                    onChange={e => setNewCnpj(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("E-mail para Notificações * ")}</label>
                  <input
                    type="email"
                    required
                    placeholder={t("contato@empresa.com")}
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("WhatsApp / Telefone * ")}</label>
                  <input
                    type="text"
                    required
                    placeholder={t("(79) 99999-9999")}
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Unidade Desejada * ")}</label>
                <select
                  value={selectedUnit}
                  onChange={e => setSelectedUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                >
                  <option value="MVA Sede: Rua Dom José Thomaz, 565 - São José, Aracaju - SE">{t("MVA Coworking (Sede Oficial) - Rua Dom José Thomaz, 565 - Aracaju/SE ")}</option>
                  <option value="NexWork Coworking: Av. Paulista, 1471 - Bela Vista, São Paulo - SP">{t("NexWork Coworking (Parceiro Credenciado) - Av. Paulista, 1471 - São Paulo/SP ")}</option>
                  <option value="Savassi Tech Hub: Rua Pernambuco, 353 - Savassi, Belo Horizonte - MG">{t("Savassi Tech Hub (Parceiro Credenciado) - Rua Pernambuco, 353 - Belo Horizonte/MG ")}</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowContractModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >{t("Cancelar ")}</button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-md transition-all"
                >
                  {t(isTransferPromo ? 'Confirmar Adesão com 4 Meses Grátis' : 'Confirmar Contratação')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Fale com Especialista (2 ou mais endereços) */}
      {showSpecialistModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowSpecialistModal(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-lg border border-slate-200 w-full max-w-lg my-8 overflow-hidden cursor-default"
          >
            <div className="bg-navy-950 text-white p-6 relative">
              <button
                onClick={() => setShowSpecialistModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-xs text-orange-400 font-bold uppercase tracking-wider">{t("Atendimento Corporativo ")}</span>
              <h3 className="text-xl font-bold mt-1">{t("2 ou mais Endereços com Desconto Especial ")}</h3>
              <p className="text-xs text-slate-300 mt-1">{t("Fale diretamente com nossa equipe para montar uma proposta sob medida com preços escaláveis. ")}</p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-sm">{t("Prefere atendimento instantâneo? ")}</strong>
                  <p className="text-[11px] text-emerald-800 mt-0.5">{t("Nosso especialista em domicílio fiscal responde em minutos no WhatsApp. ")}</p>
                  <a
                    href="https://wa.me/5579998188188?text=Ol%C3%A1!%20Gostaria%20de%20um%20or%C3%A7amento%20personalizado%20para%202%20ou%20mais%20endere%C3%A7os%20fiscais%20na%20MVA."
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />{t("Abrir WhatsApp Agora ")}</a>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                <span className="h-px flex-1 bg-slate-200" />{t("ou deixe seus dados para contato ")}<span className="h-px flex-1 bg-slate-200" />
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setShowSpecialistModal(false);
                  showToast('Solicitação enviada! Nosso especialista entrará em contato em breve.', 'success');
                }} 
                className="space-y-3"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("Seu Nome / Responsável * ")}</label>
                  <input
                    type="text"
                    required
                    placeholder={t("Ex: Carlos Silva")}
                    value={specName}
                    onChange={e => setSpecName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{t("WhatsApp / Telefone * ")}</label>
                    <input
                      type="text"
                      required
                      placeholder={t("(79) 99999-9999")}
                      value={specPhone}
                      onChange={e => setSpecPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{t("Quantidade de Endereços ")}</label>
                    <select
                      value={specCount}
                      onChange={e => setSpecCount(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                    >
                      <option value="2">{t("2 Endereços ")}</option>
                      <option value="3">{t("3 Endereços ")}</option>
                      <option value="4-5">{t("4 a 5 Endereços ")}</option>
                      <option value="6+">{t("Mais de 6 Endereços ")}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t("E-mail corporativo ")}</label>
                  <input
                    type="email"
                    placeholder={t("carlos@empresa.com")}
                    value={specEmail}
                    onChange={e => setSpecEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSpecialistModal(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800"
                  >{t("Fechar ")}</button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-md transition-all"
                  >{t("Receber Proposta Personalizada ")}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
