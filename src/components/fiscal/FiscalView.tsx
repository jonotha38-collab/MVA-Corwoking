import { t } from '../../lib/preferences';
import { BlurReveal } from '../ui/BlurReveal';
import { Reveal } from '../ui/Reveal';
import React, { useState, useEffect } from 'react';
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
import { FiscalCheckout } from '../payments/FiscalCheckout';
import { CertificateDialog } from './CertificateDialog';
import { FiscalServiceCenter } from './FiscalServiceCenter';
import { supabase } from '../../lib/supabase';
import { canIssueCertificate, restoreOrder, type FiscalPlanId } from '../../lib/fiscal-payment';

export const FiscalView: React.FC = () => {
  const { currentCompany, currentUser, showToast } = useCoworking();

  const [showContractModal, setShowContractModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showSpecialistModal, setShowSpecialistModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<FiscalPlanId>('fiscal');
  const [resumeOrderId, setResumeOrderId] = useState<string>();
  const [returnedOrderId] = useState(() => new URL(window.location.href).searchParams.get('fiscal_order'));
  useEffect(() => {
    const url = new URL(window.location.href);
    ['fiscal_order', 'payment_intent', 'payment_intent_client_secret', 'redirect_status'].forEach(key => url.searchParams.delete(key));
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, []);
  const eligible = canIssueCertificate(currentCompany);
  const startCheckout = async (id: FiscalPlanId, transfer = false) => {
    setSelectedPlanId(id);
    if (!currentUser) {
      showToast('Entre na sua conta e solicite a análise cadastral antes da contratação.', 'info');
      document.getElementById('gestao-endereco-fiscal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const { data, error } = await supabase.from('fiscal_applications')
      .select('id, transfer_from').eq('user_id', currentUser.id).eq('plan_id', id)
      .eq('status', 'approved').order('created_at', { ascending: false }).limit(1);
    if (error || !data?.length) {
      showToast('Antes do pagamento, precisamos aprovar os dados e a elegibilidade da empresa.', 'info');
      document.getElementById('gestao-endereco-fiscal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setIsTransferPromo(transfer && !!data[0].transfer_from);
    setResumeOrderId(undefined);
    setShowContractModal(true);
  };
  useEffect(() => {
    if (currentUser) {
      const saved = returnedOrderId || restoreOrder(currentUser.id);
      if (saved && /^[0-9a-f-]{36}$/i.test(saved)) { setResumeOrderId(saved); setShowContractModal(true); }
    }
  }, [currentUser?.id, returnedOrderId]);
  const [isTransferPromo, setIsTransferPromo] = useState(false);
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
      periodText: 'R$ 29,90 /mês',
      annualText: 'R$ 358,80 no pagamento anual à vista',
      description: 'Para você que precisa divulgar a sua empresa e conquistar novos mercados.',
      icon: Megaphone,
      popular: false,
      features: [
        'Divulgação em cartões, site e redes sociais',
        'Recebimento e guarda de correspondências e encomendas',
        'Aviso de correspondências pelo painel e canais configurados',
        'Endereço de prestígio na Rua Dom José Thomaz, 565',
        'Acesso ao marketplace para reservar salas disponíveis'
      ]
    },
    {
      id: 'fiscal',
      name: 'Endereço Fiscal',
      price: 80,
      totalAnnual: 960,
      periodText: 'R$ 80 /mês',
      annualText: 'R$ 960 no pagamento anual à vista',
      description: 'Para você que está abrindo ou alterando empresa e quer emitir notas fiscais.',
      icon: Shield,
      popular: true,
      badge: 'Mais Escolhido',
      features: [
        'Documentação de apoio para abertura ou alteração do CNPJ',
        'Orientações para análise da atividade e uso do endereço',
        'Acompanhamento de viabilidade municipal, quando aplicável',
        'Declaração de uso emitida após aprovação documental e pagamento',
        'Recebimento e guarda de cartas e notificações fiscais',
        'Reservas de salas de reunião conforme tabela vigente'
      ]
    },
    {
      id: 'fiscal_ie',
      name: 'Endereço Fiscal com Inscrição Estadual',
      price: 120,
      totalAnnual: 1440,
      periodText: 'R$ 120 /mês',
      annualText: 'R$ 1.440 no pagamento anual à vista',
      description: 'Para você que tem um comércio ou contribui com o ICMS.',
      icon: ShieldCheck,
      popular: false,
      badge: 'Comércio / ICMS',
      features: [
        'Avaliação de atividades de comércio e ICMS junto aos órgãos competentes',
        'Análise de elegibilidade para inscrição estadual',
        'Acompanhamento de consulta de viabilidade técnica',
        'Suporte documental conforme atividade e órgãos competentes',
        'Gestão de encomendas e correspondências fiscais',
        'Possibilidade de pacotes com salas de reunião'
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
        'Condições para múltiplos CNPJs sob proposta',
        'Condições de cobrança estabelecidas em proposta',
        'Assessoria dedicada para a documentação',
        'Suporte prioritário com especialista MVA'
      ]
    }
  ];

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

        <div className="relative z-10 w-full min-w-0 max-w-3xl space-y-6">
          <div className="inline-flex max-w-full items-start gap-2 rounded-xl border border-orange-500/30 bg-orange-500/20 px-3 py-2 text-[11px] font-semibold leading-relaxed text-orange-300 backdrop-blur-md sm:items-center sm:rounded-full sm:px-4 sm:py-1.5 sm:text-xs">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-400 sm:mt-0" />
            <span className="min-w-0 break-words">{t("MVA Coworking • Sede Rua Dom José Thomaz, 565 • Sujeito à análise ")}</span>
          </div>

          <BlurReveal as="h1" className="hero-title max-w-full break-words sm:max-w-2xl">{t("Seu endereço profissional. O próximo passo da sua empresa. ")}</BlurReveal>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-medium">{t("Abra ou regularize seu CNPJ na sede MVA ou rede parceira. Reduza custos, preserve seu endereço residencial e reúna os serviços da sua empresa em um só lugar. ")}</p>

          <div className="pt-4 flex flex-col sm:flex-row flex-wrap gap-4">
            <button
              onClick={() => {
                startCheckout('fiscal');
              }}
              className="action-primary w-full min-w-0 flex-wrap px-4 py-3.5 text-center text-sm sm:w-auto sm:px-6"
            >
              <FileCheck className="w-5 h-5" />{t("Solicitar Endereço Fiscal Online ")}</button>
            <button
              onClick={() => setShowCertificateModal(true)}
              className="flex w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-navy-700/80 bg-navy-900/80 px-4 py-3.5 text-sm font-bold text-white shadow-lg backdrop-blur-md transition-all hover:bg-navy-800 sm:w-auto sm:px-6"
            >
              {eligible ? <FileCheck className="w-5 h-5 text-orange-400" /> : <Lock className="w-5 h-5 text-orange-400" />}<span>{t('Emitir declaração oficial')}<span className="block text-left text-[11px] font-normal text-slate-400">{t(eligible ? 'Disponível para seu contrato' : 'Disponível após pagamento')}</span></span></button>
          </div>
        </div>
      </div>

      {currentCompany.id && (
      <div className="min-w-0 bg-white rounded-3xl p-4 sm:p-8 border border-slate-200/90 shadow-xl shadow-slate-200/40 space-y-8 relative overflow-hidden">
        {/* Subtle decorative background for the card */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-slate-50 to-orange-50 rounded-bl-[100px] -z-10 pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 relative z-10">
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0 shadow-sm">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block mb-1">{t("Meu contrato de endereço ")}</span>
              <h2 className="break-words text-lg font-bold tracking-tight text-navy-900 sm:text-2xl">{currentCompany.companyName}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{t("CNPJ: ")}<span className="font-mono">{currentCompany.cnpj}</span>{t("• Plano: ")}<strong className="text-slate-700">{t(currentCompany.planName)}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-3">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>{t(eligible ? 'Endereço fiscal ativo' : currentCompany.paymentStatus === 'paid' && currentCompany.status === 'ativo' && currentCompany.paymentIsLive && currentCompany.planId === 'comercial' ? 'Endereço comercial ativo' : 'Aguardando liberação')}</span>
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
              <span>{t(currentCompany.alvaraStatus === 'regular' ? 'Regularizado' : 'Em processamento')}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">{t("Consulte a situação com a equipe MVA ")}</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2 hover:border-navy-300 transition-colors">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{t("Vigência Contratual ")}</span>
            <div className="text-sm font-bold text-navy-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-navy-400" />
              <span>{currentCompany.startDate.split('-').reverse().join('/')} — {currentCompany.renewalDate.split('-').reverse().join('/')}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">{t("Vigência conforme o contrato ")}</p>
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
              startCheckout('fiscal', true);
            }}
            className="shrink-0 px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all flex items-center gap-2 hover:-translate-y-0.5"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>{t("Transferir CNPJ (4 Meses Grátis) ")}</span>
          </button>
        </div>
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <FiscalServiceCenter initialPlan={selectedPlanId}
        onCheckout={(id,transfer) => { void startCheckout(id,transfer); }} />

      {/* Planos de Endereço Fiscal - 4 Colunas Inspiradas na Referência */}
      <div className="space-y-6">
        <Reveal className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold text-orange-600 tracking-wider uppercase">{t("Planos Corporativos Acessíveis ")}</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-navy-900">{t("Escolha o Plano Ideal para a sua Empresa ")}</h2>
          <p className="text-sm text-slate-500">{t("Escolha 1 mês ou 12 meses no checkout. Na transferência anual, pague 8 meses e use 12. ")}</p>
        </Reveal>

        <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`surface-card min-w-0 rounded-2xl p-5 sm:p-7 flex flex-col justify-between transition-all duration-300 relative border ${
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
                        startCheckout(plan.id as FiscalPlanId);
                      }}
                      className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 group ${
                        plan.popular
                          ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 hover:shadow-orange-500/30'
                          : 'bg-navy-900 hover:bg-orange-500 text-white shadow-sm'
                      }`}
                    >
                      <span>{t("Solicitar análise ")}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showCertificateModal && <CertificateDialog onClose={() => setShowCertificateModal(false)} onChoosePlan={() => { setShowCertificateModal(false); startCheckout('fiscal'); }} />}
      {showContractModal && <FiscalCheckout planId={selectedPlanId} transfer={isTransferPromo} resumeOrderId={resumeOrderId} onClose={() => setShowContractModal(false)} onPaid={() => showToast('Status do pagamento atualizado.', 'info')} />}

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
                  <p className="text-[11px] text-emerald-800 mt-0.5">{t("A equipe MVA responderá pelo canal informado, conforme disponibilidade. ")}</p>
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
