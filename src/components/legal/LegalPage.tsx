import { t } from '../../lib/preferences';
import React, { useState } from 'react';
import { Reveal } from '../ui/Reveal';
import {
  ShieldCheck,
  Lock,
  FileText,
  UserCheck,
  Server,
  AlertCircle,
  Mail,
  Building2,
  Scale,
  Eye,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Printer
} from 'lucide-react';

export const LegalPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'privacy' | 'lgpd' | 'terms'>('lgpd');

  const printDocument = () => {
    window.print();
  };

  return (
    <div className="space-y-10 pb-16 max-w-5xl mx-auto">
      {/* Header com badge institucional */}
      <Reveal className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 border border-orange-500/20 px-3.5 py-1.5 text-xs font-semibold text-orange-400">
            <ShieldCheck className="w-4 h-4 text-orange-500" />
            <span>{t("Segurança, Governança & Conformidade Legal")}</span>
          </div>
          <button
            onClick={printDocument}
            type="button"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors no-print"
          >
            <Printer className="w-4 h-4" />
            <span>{t("Imprimir ou Salvar em PDF")}</span>
          </button>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100">
          {t("Políticas de Privacidade e Proteção de Dados (LGPD)")}
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-3xl leading-relaxed">
          {t("A MVA Coworking Hub atua em rigorosa observância à Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD), às normas do Marco Civil da Internet (Lei nº 12.965/2014) e às melhores práticas internacionais de segurança da informação.")}
        </p>

        <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-400 border-b border-navy-800 pb-4">
          <div><strong className="text-slate-300">{t("Última atualização:")}</strong> 23 de outubro de 2026</div>
          <div>•</div>
          <div><strong className="text-slate-300">{t("Controlador dos Dados:")}</strong> MVA Coworking Hub LTDA</div>
          <div>•</div>
          <div><strong className="text-slate-300">{t("Jurisdição:")}</strong> Brasil / ANPD</div>
        </div>
      </Reveal>

      {/* Navegação entre seções da documentação jurídica */}
      <div className="flex flex-wrap gap-2 border-b border-navy-800 pb-3 no-print">
        <button
          onClick={() => setActiveSection('lgpd')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
            activeSection === 'lgpd'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
              : 'text-slate-400 hover:text-white hover:bg-navy-900'
          }`}
        >
          <Scale className="w-4 h-4" />
          {t("Conformidade com a LGPD")}
        </button>
        <button
          onClick={() => setActiveSection('privacy')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
            activeSection === 'privacy'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
              : 'text-slate-400 hover:text-white hover:bg-navy-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          {t("Política de Privacidade")}
        </button>
        <button
          onClick={() => setActiveSection('terms')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
            activeSection === 'terms'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
              : 'text-slate-400 hover:text-white hover:bg-navy-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          {t("Termos de Uso e Endereço Fiscal")}
        </button>
      </div>

      {/* Conteúdo: Seção LGPD */}
      {activeSection === 'lgpd' && (
        <div className="space-y-8 text-slate-300">
          {/* Card informativo de princípios */}
          <div className="p-5 rounded-2xl bg-navy-900/80 border border-navy-800 space-y-3">
            <div className="flex items-center gap-2 text-orange-400 font-bold text-sm">
              <Scale className="w-4 h-4" />
              <span>{t("Compromisso com os Princípios do Art. 6º da LGPD")}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {t("Todo o tratamento de dados pessoais realizado pela plataforma MVA pauta-se na finalidade específica, adequação, necessidade (minimização dos dados), livre acesso, transparência, segurança, prevenção contra danos e não discriminação.")}
            </p>
          </div>

          {/* Direitos dos Titulares */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-orange-400" />
              {t("1. Direitos do Titular de Dados Pessoais (Art. 18 da LGPD)")}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t("Você, como titular de dados, possui total controle sobre as informações compartilhadas com a MVA Coworking Hub. Garantimos o exercício facilitado e gratuito dos seguintes direitos:")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
              {[
                { title: t("Confirmação e Acesso"), desc: t("Direito de confirmar a existência de tratamento e acessar integralmente os seus dados pessoais cadastrados.") },
                { title: t("Correção e Retificação"), desc: t("Solicitar a atualização de dados incompletos, inexatos ou desatualizados a qualquer momento.") },
                { title: t("Anonimização ou Bloqueio"), desc: t("Requerer a anonimização, bloqueio ou eliminação de dados excessivos ou tratados em desconformidade.") },
                { title: t("Portabilidade dos Dados"), desc: t("Solicitar a transferência dos seus dados a outro prestador de serviços em formato interoperável estruturado.") },
                { title: t("Revogação do Consentimento"), desc: t("Revogar o consentimento outorgado para finalidades específicas de forma ágil e sem custo.") },
                { title: t("Informação sobre Compartilhamento"), desc: t("Saber exatamente com quais entidades públicas e privadas seus dados foram compartilhados.") },
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-navy-900/50 border border-navy-800/80 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 pl-6 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Bases Legais Utilizadas */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-orange-400" />
              {t("2. Bases Legais para Tratamento de Dados (Art. 7º da LGPD)")}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t("A MVA não trata dados pessoais sem fundamento legal correspondente. Nossas operações de tratamento se amparam estritamente em:")}
            </p>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <span><strong className="text-slate-100">{t("Execução de Contrato (Inciso V):")}</strong> {t("Necessário para emissão do contrato de domicílio fiscal, gestão das reservas de salas, entrega de correspondências físicas e autenticação de usuários.")}</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <span><strong className="text-slate-100">{t("Cumprimento de Obrigação Legal ou Regulatória (Inciso II):")}</strong> {t("Emissão de notas fiscais de serviço, guarda de logs de conexão exigidos pelo Marco Civil da Internet e notificações aos órgãos da Junta Comercial / Receita Federal.")}</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <span><strong className="text-slate-100">{t("Legítimo Interesse (Inciso IX):")}</strong> {t("Prevenção a fraudes, monitoramento de integridade do sistema e melhoria da experiência de navegação.")}</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <span><strong className="text-slate-100">{t("Consentimento (Inciso I):")}</strong> {t("Para comunicações promocionais e adesão inicial aos termos, quando aplicável.")}</span>
              </li>
            </ul>
          </section>

          {/* Medidas de Segurança */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Server className="w-5 h-5 text-orange-400" />
              {t("3. Segurança da Informação e Criptografia")}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t("Adotamos salvaguardas técnicas, administrativas e físicas para blindar os dados pessoais contra acessos não autorizados, incidentes e vazamentos:")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-navy-900 border border-navy-800">
                <div className="font-bold text-slate-200 mb-1">{t("Criptografia TLS 1.3 / AES-256")}</div>
                <div className="text-slate-400">{t("Todos os dados em trânsito e em repouso são protegidos por criptografia de ponta a ponta.")}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-navy-900 border border-navy-800">
                <div className="font-bold text-slate-200 mb-1">{t("Isolamento de Pagamentos (PCI-DSS)")}</div>
                <div className="text-slate-400">{t("Dados de cartão de crédito não passam e não são armazenados nos servidores da MVA. Processamento integral via Stripe.")}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-navy-900 border border-navy-800">
                <div className="font-bold text-slate-200 mb-1">{t("Controle de Acesso Rígido (RLS)")}</div>
                <div className="text-slate-400">{t("Row Level Security em banco de dados Supabase para que cada cliente acesse exclusivamente seus próprios registros.")}</div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Conteúdo: Seção Política de Privacidade */}
      {activeSection === 'privacy' && (
        <div className="space-y-8 text-slate-300">
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Eye className="w-5 h-5 text-orange-400" />
              {t("1. Quais Dados Coletamos e Para Qual Finalidade?")}
            </h2>
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-4 rounded-xl bg-navy-900/60 border border-navy-800">
                <strong className="text-orange-400 text-sm block mb-1">{t("Dados Cadastrais da Empresa e Responsável Legal")}</strong>
                <p className="text-slate-300 mb-2">{t("Razão Social, Nome Fantasia, CNPJ, Nome do Administrador, E-mail, Telefone/WhatsApp e Endereço.")}</p>
                <div className="text-slate-400 text-xs"><strong>{t("Finalidade:")}</strong> {t("Contratação do plano de endereço fiscal, validação cadastral perante a Prefeitura e órgãos fazendários, além de emissão do termo de autorização de uso do endereço.")}</div>
              </div>

              <div className="p-4 rounded-xl bg-navy-900/60 border border-navy-800">
                <strong className="text-orange-400 text-sm block mb-1">{t("Dados de Gestão de Correspondência")}</strong>
                <p className="text-slate-300 mb-2">{t("Remetente da carta/encomenda, número de rastreio, data e horário de recebimento, número do locker e comprovante de retirada presencial.")}</p>
                <div className="text-slate-400 text-xs"><strong>{t("Finalidade:")}</strong> {t("Custódia de correspondências, notificação imediata via plataforma e garantia de rastreabilidade de entrega ao destinatário legítimo.")}</div>
              </div>

              <div className="p-4 rounded-xl bg-navy-900/60 border border-navy-800">
                <strong className="text-orange-400 text-sm block mb-1">{t("Dados Técnicos de Navegação")}</strong>
                <p className="text-slate-300 mb-2">{t("Endereço IP, data/hora de acesso, identificador do dispositivo e cookies essenciais de sessão.")}</p>
                <div className="text-slate-400 text-xs"><strong>{t("Finalidade:")}</strong> {t("Segurança da plataforma, combate a invasões e cumprimento do artigo 15 do Marco Civil da Internet (guarda de registros de conexão).")}</div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-400" />
              {t("2. Compartilhamento Responsável de Dados")}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t("A MVA não comercializa nem compartilha dados pessoais com terceiros para fins de monetização ou marketing não autorizado. O compartilhamento ocorre exclusivamente nas hipóteses abaixo:")}
            </p>
            <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-1.5 pl-2">
              <li>{t("Com a rede de gateways de pagamento (ex.: Stripe) para validação e liquidação das assinaturas e reservas.")}</li>
              <li>{t("Com a infraestrutura em nuvem segura (Supabase / AWS) onde o banco de dados e os arquivos criptografados estão hospedados.")}</li>
              <li>{t("Com autoridades públicas, judiciais ou fazendárias, mediante ordem judicial ou determinação legal expressa.")}</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Server className="w-5 h-5 text-orange-400" />
              {t("3. Retenção e Descarte de Informações")}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t("Os dados cadastrais e fiscais são retidos durante a vigência do contrato de prestação de serviços e, após o encerramento, pelo prazo legal de 5 (cinco) anos para cumprimento de obrigações fiscais, tributárias e defesa em eventuais demandas judiciais (Código Civil e Código Tributário Nacional). Após esse prazo, os dados são descartados de forma irreversível ou anonimizados.")}
            </p>
          </section>
        </div>
      )}

      {/* Conteúdo: Seção Termos e Endereço Fiscal */}
      {activeSection === 'terms' && (
        <div className="space-y-8 text-slate-300">
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-400" />
              {t("1. Regras do Domicílio Fiscal e Comercial")}
            </h2>
            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p>
                {t("A contratação do Endereço Fiscal confere à empresa contratante o direito de registrar sua sede fiscal perante a Receita Federal, Junta Comercial do Estado e Prefeitura Municipal no endereço oficial da MVA Coworking Hub (Rua Dom José Thomaz, 565 - Bairro São José - Aracaju/SE - CEP 49015-090).")}
              </p>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 space-y-1">
                <strong>{t("Atenção sobre a Declaração de Endereço Fiscal:")}</strong>
                <p className="text-xs text-amber-300/90">
                  {t("A emissão e validade jurídica da Declaração Oficial de Domicílio Fiscal dependem da aprovação cadastral e da confirmação de pagamento da assinatura contratada.")}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Mail className="w-5 h-5 text-orange-400" />
              {t("2. Protocolo de Recebimento de Correspondências")}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t("A MVA oferece serviço de guarda e triagem de correspondências comerciais e notificações judiciais dirigidas às empresas cadastradas:")}
            </p>
            <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-1.5 pl-2">
              <li>{t("As cartas e encomendas recebidas são protocoladas e alocadas em lockers seguros numerados.")}</li>
              <li>{t("O cliente é notificado digitalmente no momento da chegada da correspondência.")}</li>
              <li>{t("Correspondências judiciais e fiscais urgentes contam com aviso prioritário via e-mail e WhatsApp cadastrado.")}</li>
              <li>{t("A digitalização do conteúdo da carta (abertura de envelope) apenas ocorre mediante expressa solicitação e autorização formal do titular dentro da plataforma.")}</li>
            </ul>
          </section>
        </div>
      )}

      {/* Canal de Atendimento do DPO / Encarregado de Dados */}
      <Reveal className="p-6 rounded-2xl bg-gradient-to-r from-navy-900 to-navy-950 border border-navy-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Mail className="w-4 h-4 text-orange-400" />
              {t("Canal Oficial do DPO (Encarregado de Proteção de Dados)")}
            </h3>
            <p className="text-xs text-slate-400">
              {t("Para exercer seus direitos de titular (acesso, correção, portabilidade ou revogação) ou esclarecer dúvidas sobre tratamento de dados:")}
            </p>
          </div>
          <a
            href="mailto:privacidade@mvacoworking.com.br"
            className="action-primary whitespace-nowrap px-4 py-2 text-xs font-semibold flex items-center gap-2 shrink-0"
          >
            <span>{t("Falar com o DPO")}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-400 border-t border-navy-800/80">
          <div><strong className="text-slate-300">{t("E-mail:")}</strong> privacidade@mvacoworking.com.br</div>
          <div><strong className="text-slate-300">{t("Prazo de Resposta:")}</strong> {t("Em até 15 dias úteis, conforme estipulado pela LGPD.")}</div>
        </div>
      </Reveal>
    </div>
  );
};
