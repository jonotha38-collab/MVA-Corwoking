import React, { useEffect, useState } from 'react';
import { Cookie, ShieldCheck, Settings2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { t } from '../../lib/preferences';
import { getCookieConsent, saveCookieConsent, type CookiePreferences } from '../../lib/cookies';
import { useCoworking } from '../../context/CoworkingContext';

export const CookieBanner: React.FC = () => {
  const { setActiveTab } = useCoworking();
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    // Verifica se o usuário já tomou uma decisão prévia
    const consent = getCookieConsent();
    if (!consent) {
      // Pequeno delay para a página carregar suavemente antes de abrir o banner
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    saveCookieConsent({ analytics: true, marketing: true, status: 'accepted' });
    setVisible(false);
  };

  const handleRejectAll = () => {
    saveCookieConsent({ analytics: false, marketing: false, status: 'rejected' });
    setVisible(false);
  };

  const handleSaveCustom = () => {
    saveCookieConsent({ analytics, marketing, status: 'customized' });
    setVisible(false);
  };

  const openLegal = () => {
    setActiveTab('legal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <aside
      aria-label={t("Preferências de Cookies e Privacidade")}
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-lg z-50 animate-slideIn no-print"
    >
      <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700/80 rounded-2xl shadow-2xl p-5 sm:p-6 text-navy-950 dark:text-slate-100 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <Cookie className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-navy-900 dark:text-white leading-tight">
                {t("Controle de Cookies & Privacidade")}
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {t("Conformidade com a LGPD (Lei 13.709/2018)")}
              </span>
            </div>
          </div>
          <button
            onClick={handleRejectAll}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            title={t("Fechar e recusar não essenciais")}
            aria-label={t("Fechar e recusar cookies")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumo */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {t("Utilizamos cookies essenciais para o funcionamento seguro da plataforma MVA (login, reservas e sessão). Com sua autorização, também podemos utilizar cookies de desempenho e analítica para aprimorar sua experiência de navegação.")}
        </p>

        {/* Painel expansível de preferências */}
        {showDetails && (
          <div className="pt-2 space-y-2.5 border-t border-slate-100 dark:border-navy-800 text-xs">
            {/* Essenciais */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950/60 border border-slate-200/80 dark:border-navy-800">
              <div className="pr-2">
                <strong className="block text-navy-900 dark:text-white">{t("Necessários (Sempre Ativos)")}</strong>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{t("Autenticação, segurança e integridade de formulários.")}</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                {t("Obrigatório")}
              </span>
            </div>

            {/* Analíticos */}
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950/60 border border-slate-200/80 dark:border-navy-800 cursor-pointer">
              <div className="pr-2">
                <strong className="block text-navy-900 dark:text-white">{t("Métricas e Desempenho")}</strong>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{t("Ajuda a entender quais páginas carregam com mais rapidez.")}</span>
              </div>
              <input
                type="checkbox"
                checked={analytics}
                onChange={e => setAnalytics(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-600"
              />
            </label>

            {/* Marketing */}
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950/60 border border-slate-200/80 dark:border-navy-800 cursor-pointer">
              <div className="pr-2">
                <strong className="block text-navy-900 dark:text-white">{t("Preferências e Comunicações")}</strong>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{t("Lembrar preferências de planos e ofertas de coworkings.")}</span>
              </div>
              <input
                type="checkbox"
                checked={marketing}
                onChange={e => setMarketing(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-600"
              />
            </label>
          </div>
        )}

        {/* Links e Botão Detalhes */}
        <div className="flex items-center justify-between text-xs pt-1">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{t(showDetails ? 'Ocultar opções' : 'Personalizar')}</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          
          <button
            type="button"
            onClick={openLegal}
            className="text-slate-500 dark:text-slate-400 hover:underline transition-colors"
          >
            {t("Ler Políticas & LGPD")}
          </button>
        </div>

        {/* Botões de Ação */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={handleRejectAll}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-700 transition-colors text-center"
          >
            {t("Apenas Essenciais")}
          </button>

          {showDetails ? (
            <button
              type="button"
              onClick={handleSaveCustom}
              className="col-span-1 sm:col-span-2 action-primary px-3.5 py-2.5 rounded-xl text-xs font-bold text-center"
            >
              {t("Salvar Preferências")}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAcceptAll}
              className="action-primary px-3.5 py-2.5 rounded-xl text-xs font-bold col-span-1 sm:col-span-2 text-center"
            >
              {t("Aceitar Todos")}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
